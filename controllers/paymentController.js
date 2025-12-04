const Member = require("../models/Member");
const { getPaymentAccountById, getAllPaymentAccounts } = require("../config/paymentAccounts");
const { sendPaymentSuccessEmail, sendWelcomeEmail } = require("../utils/emailService");

class PaymentController {
  
  // Get all available payment options
  static async getPaymentOptions(req, res) {
    try {
      const paymentAccounts = getAllPaymentAccounts();
      
      res.json({
        success: true,
        paymentOptions: paymentAccounts,
        activationFee: 5000,
        currency: 'NGN'
      });
    } catch (error) {
      console.error('Get payment options error:', error);
      res.status(500).json({
        success: false,
        message: "Error fetching payment options"
      });
    }
  }

  // Initialize payment with selected account
  static async initializePayment(req, res) {
    try {
      const { paymentAccountId } = req.body;
      const memberId = req.memberId;

      // Get member
      const member = await Member.findById(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Account not found"
        });
      }

      // Check if already paid
      if (member.activationFeePaid) {
        return res.status(400).json({
          success: false,
          message: "Activation fee already paid"
        });
      }

      // Get payment account details
      const paymentAccount = getPaymentAccountById(paymentAccountId);
      if (!paymentAccount) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment account selected"
        });
      }

      // Generate payment reference
      const paymentReference = member.generatePaymentReference();

      // Update member payment info
      member.paymentReference = paymentReference;
      member.paymentStatus = 'pending';
      member.paymentMethod = paymentAccount.provider;
      await member.save();

      // Return payment details
      res.json({
        success: true,
        paymentInfo: {
          accountNumber: member.accountNumber,
          accountName: `${member.firstName} ${member.lastName}`,
          amount: paymentAccount.amount,
          currency: paymentAccount.currency,
          paymentReference: paymentReference,
          selectedPaymentAccount: {
            provider: paymentAccount.provider,
            accountNumber: paymentAccount.accountNumber,
            accountName: paymentAccount.accountName,
            bankName: paymentAccount.bankName
          },
          description: paymentAccount.description
        },
        instructions: paymentAccount.instructions,
        importantNotes: [
          `You must use the payment reference: ${paymentReference} as description`,
          'Payment must be exactly ₦5,000',
          'Keep your transaction receipt/details for verification',
          'Account will be activated immediately after payment verification'
        ]
      });

    } catch (error) {
      console.error('Payment initialization error:', error);
      res.status(500).json({
        success: false,
        message: "Error initializing payment"
      });
    }
  }

  // Verify payment manually (user provides transaction details)
  static async verifyPayment(req, res) {
    try {
      const { paymentReference, transactionId, paymentDate, amount } = req.body;
      const memberId = req.memberId;

      const member = await Member.findOne({
        _id: memberId,
        paymentReference: paymentReference
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found"
        });
      }

      // Basic validation
      if (!transactionId) {
        return res.status(400).json({
          success: false,
          message: "Transaction ID is required for verification"
        });
      }

      if (amount !== 5000) {
        return res.status(400).json({
          success: false,
          message: "Invalid amount. Activation fee is ₦5,000"
        });
      }

      // ✅ FIXED: Use static method call instead of this.
      const isPaymentVerified = await PaymentController.simulatePaymentVerification({
        paymentReference,
        transactionId,
        amount,
        paymentDate
      });

      if (isPaymentVerified) {
        // Update member payment status
        member.paymentStatus = 'completed';
        member.activationFeePaid = true;
        member.paymentDate = new Date();
        member.transactionId = transactionId;
        member.accountStatus = 'active';
        member.activatedAt = new Date();
        
        await member.save();

        // Send success emails
        await sendPaymentSuccessEmail(member, { transactionId, amount });
        await sendWelcomeEmail(member);

        res.json({
          success: true,
          message: "Payment verified successfully! Your account is now active.",
          account: {
            accountNumber: member.accountNumber,
            accountStatus: member.accountStatus,
            activatedAt: member.activatedAt,
            balance: member.balance
          },
          nextSteps: [
            "You can now login to your account",
            "Access all banking features",
            "Start making transactions"
          ]
        });
      } else {
        member.paymentStatus = 'failed';
        await member.save();

        res.status(400).json({
          success: false,
          message: "Payment verification failed. Please check your transaction details and try again."
        });
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: "Error verifying payment"
      });
    }
  }

  // ✅ FIXED: Make this a static method
  static async simulatePaymentVerification(paymentData) {
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Basic validation checks
      const isValid = paymentData.transactionId && 
                     paymentData.amount === 5000 && 
                     paymentData.paymentReference;
      
      return isValid;
      
    } catch (error) {
      console.error('Payment verification simulation error:', error);
      return false;
    }
  }

  // Get payment status
  static async getPaymentStatus(req, res) {
    try {
      const memberId = req.memberId;

      const member = await Member.findById(memberId).select(
        'paymentStatus paymentAmount paymentReference activationFeePaid paymentMethod accountStatus'
      );

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found"
        });
      }

      res.json({
        success: true,
        paymentStatus: member.paymentStatus,
        activationFeePaid: member.activationFeePaid,
        paymentAmount: member.paymentAmount,
        paymentReference: member.paymentReference,
        paymentMethod: member.paymentMethod,
        accountStatus: member.accountStatus
      });

    } catch (error) {
      console.error('Payment status error:', error);
      res.status(500).json({
        success: false,
        message: "Error fetching payment status"
      });
    }
  }

  // Admin manual payment verification
  static async adminVerifyPayment(req, res) {
    try {
      // Check if user is admin (you should implement proper admin auth)
      if (!req.member?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "Admin access required"
        });
      }

      const { accountNumber, transactionId, paymentDate } = req.body;

      const member = await Member.findOne({ accountNumber });
      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Account not found"
        });
      }

      // Manual verification by admin
      member.paymentStatus = 'completed';
      member.activationFeePaid = true;
      member.paymentDate = new Date(paymentDate) || new Date();
      member.transactionId = transactionId;
      member.accountStatus = 'active';
      member.activatedAt = new Date();
      
      await member.save();

      // Send success emails
      await sendPaymentSuccessEmail(member, { transactionId, amount: member.paymentAmount });
      await sendWelcomeEmail(member);

      res.json({
        success: true,
        message: "Payment manually verified by admin. Account activated.",
        account: {
          accountNumber: member.accountNumber,
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          accountStatus: member.accountStatus
        }
      });

    } catch (error) {
      console.error('Admin payment verification error:', error);
      res.status(500).json({
        success: false,
        message: "Error in admin payment verification"
      });
    }
  }
}

module.exports = PaymentController;