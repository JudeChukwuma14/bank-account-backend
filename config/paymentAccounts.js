const Loan = require('../models/Loan'); 

// Multiple payment account options for users to choose from
const paymentAccounts = [
  {
    id: 'opay_1',
    provider: 'OPay',
    accountNumber: '0022443473',
    accountName: 'Dave Kevin',
    bankName: 'OPay Digital Bank',
    type: 'mobile_money',
    currency: 'NGN',
    amount: 5000,
    description: 'Account Activation Fee',
    instructions: [
      '1. Open your OPay mobile app',
      '2. Go to Transfer section',
      '3. Enter account number: 0022443473',
      '4. Account Name: Dave Kevin',
      '5. Amount: ₦5,000',
      '6. Use your payment reference as description',
      '7. Complete the transfer'
    ]
  },
  {
    id: 'opay_2',
    provider: 'OPay',
    accountNumber: '0022556688',
    accountName: 'First International Financial Services Inc',
    bankName: 'OPay Digital Bank',
    type: 'mobile_money',
    currency: 'NGN',
    amount: 5000,
    description: 'Account Activation Fee',
    instructions: [
      '1. Open your OPay mobile app',
      '2. Go to Transfer section',
      '3. Enter account number: 0022556688',
      '4. Account Name: First International Financial Services Inc',
      '5. Amount: ₦5,000',
      '6. Use your payment reference as description',
      '7. Complete the transfer'
    ]
  },
  {
    id: 'bank_1',
    provider: 'First Bank',
    accountNumber: '3056894521',
    accountName: 'First International Financial Services Limited',
    bankName: 'First Bank of Nigeria',
    type: 'bank_transfer',
    currency: 'NGN',
    amount: 5000,
    description: 'Account Activation Fee',
    instructions: [
      '1. Visit your bank branch or use internet banking',
      '2. Make transfer to First Bank',
      '3. Account Number: 3056894521',
      '4. Account Name: First International Financial Services Limited',
      '5. Amount: ₦5,000',
      '6. Use your payment reference as description',
      '7. Keep the transaction receipt'
    ]
  },
  {
    id: 'bank_2',
    provider: 'GTBank',
    accountNumber: '0157896342',
    accountName: 'First International Financial Services Accounts',
    bankName: 'Guaranty Trust Bank',
    type: 'bank_transfer',
    currency: 'NGN',
    amount: 5000,
    description: 'Account Activation Fee',
    instructions: [
      '1. Visit GTBank branch or use internet banking',
      '2. Make transfer to GTBank',
      '3. Account Number: 0157896342',
      '4. Account Name: First International Financial Services Accounts',
      '5. Amount: ₦5,000',
      '6. Use your payment reference as description',
      '7. Keep the transaction receipt'
    ]
  }
];


// Calculate 20% of loan amount
const calculateUpfrontPayment = (loanAmount) => {
  return Math.round(loanAmount * 0.2);
};

// Generate payment reference
const generatePaymentReference = (loanId) => {
  return `LN${loanId.toString().slice(-8)}${Date.now().toString().slice(-6)}`;
};

// Verify payment and update loan status
const verifyPaymentAndProcessLoan = async (loanId, paymentAmount, paymentReference) => {
  try {
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return { success: false, message: 'Loan application not found' };
    }

    // Check if payment was already processed
    if (loan.status !== 'pending') {
      return {
        success: false,
        message: 'Payment already processed for this loan application'
      };
    }

    const requiredUpfront = calculateUpfrontPayment(loan.loanAmount);

    // Check if payment meets 20% requirement (allow small rounding differences)
    if (paymentAmount >= requiredUpfront * 0.95) { // 5% tolerance
      // Update loan status to under_review
      loan.status = 'under_review';
      loan.additionalNotes = `20% upfront payment received. Amount: ₦${paymentAmount.toLocaleString()}. Reference: ${paymentReference}`;
      loan.reviewDate = new Date();
      await loan.save();

      return {
        success: true,
        message: 'Payment verified successfully. Your loan is now being processed.',
        loanStatus: 'under_review',
        paymentVerified: true,
        loanId: loan._id
      };
    } else {
      return {
        success: false,
        message: `Insufficient payment. Required: ₦${requiredUpfront.toLocaleString()}, Received: ₦${paymentAmount.toLocaleString()}`,
        paymentVerified: false,
        requiredAmount: requiredUpfront
      };
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return { success: false, message: 'Error verifying payment' };
  }
};

// Get payment accounts with calculated amounts for a specific loan
const getPaymentAccountsForLoan = (loanAmount) => {
  const upfrontAmount = calculateUpfrontPayment(loanAmount);

  return paymentAccounts.map(account => ({
    ...account,
    amount: upfrontAmount,
    description: `Loan Application Fee - 20% Upfront Payment (₦${upfrontAmount.toLocaleString()})`,
    instructions: account.instructions.map(instruction =>
      instruction.includes('Amount:')
        ? `5. Amount: ₦${upfrontAmount.toLocaleString()}`
        : instruction
    )
  }));
};

// Helper functions
const getPaymentAccountById = (id) => {
  return paymentAccounts.find(account => account.id === id);
};

const getAllPaymentAccounts = () => {
  return paymentAccounts;
};

const getAccountsByType = (type) => {
  return paymentAccounts.filter(account => account.type === type);
};

module.exports = {
  paymentAccounts,
  getPaymentAccountById,
  getAllPaymentAccounts,
  getAccountsByType,
  calculateUpfrontPayment,
  generatePaymentReference,
  verifyPaymentAndProcessLoan,
  getPaymentAccountsForLoan
};