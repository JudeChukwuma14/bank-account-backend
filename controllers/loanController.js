// const Loan = require('../models/Loan');
// const Member = require('../models/Member');
// const { 
//     calculateUpfrontPayment, 
//     generatePaymentReference,
//     verifyPaymentAndProcessLoan,
//     getPaymentAccountsForLoan 
// } = require('../config/paymentAccounts');
// const { 
//     sendLoanPaymentRequestEmail,
//     sendLoanPaymentVerifiedEmail,
//     sendLoanApprovedEmail,
//     sendLoanRejectedEmail,
//     sendLoanDisbursedEmail
// } = require('../utils/emailService');
// const { validationResult } = require('express-validator');

// // Loan type configurations
// const loanConfigs = {
//     personal: { maxAmount: 5000000, maxTerm: 60, minIncome: 50000 },
//     business: { maxAmount: 50000000, maxTerm: 84, minIncome: 100000 },
//     mortgage: { maxAmount: 100000000, maxTerm: 360, minIncome: 150000 },
//     auto: { maxAmount: 20000000, maxTerm: 84, minIncome: 75000 },
//     education: { maxAmount: 10000000, maxTerm: 120, minIncome: 0 },
//     emergency: { maxAmount: 2000000, maxTerm: 24, minIncome: 30000 }
// };

// // Apply for loan
// const applyForLoan = async (req, res) => {
//     try {
//         console.log('📝 Loan application received from member:', req.memberId);
        
//         // Validate request
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Validation failed',
//                 errors: errors.array()
//             });
//         }

//         const {
//             firstName,
//             lastName,
//             email,
//             phone,
//             employmentStatus,
//             employerName,
//             jobTitle,
//             monthlyIncome,
//             employmentDuration,
//             loanType,
//             loanAmount,
//             loanPurpose,
//             repaymentTerm,
//             preferredInterestRate,
//             monthlyExpenses,
//             existingLoans,
//             creditScore,
//             hasCollateral,
//             collateralType,
//             collateralValue,
//             collateralDescription,
//             additionalNotes
//         } = req.body;

//         // Get member details
//         const member = await Member.findById(req.memberId);
//         if (!member) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Member not found'
//             });
//         }

//         // Check if member can apply for new loan
//         const canApply = await Loan.canMemberApply(req.memberId);
//         if (!canApply) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'You have too many pending loan applications. Please wait for current applications to be processed.'
//             });
//         }

//         // Validate loan type and amount
//         const config = loanConfigs[loanType];
//         if (!config) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid loan type'
//             });
//         }

//         if (loanAmount > config.maxAmount) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Loan amount exceeds maximum limit of ₦${config.maxAmount.toLocaleString()} for ${loanType} loans`
//             });
//         }

//         if (parseInt(repaymentTerm) > config.maxTerm) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Repayment term exceeds maximum of ${config.maxTerm} months for ${loanType} loans`
//             });
//         }

//         if (monthlyIncome < config.minIncome) {
//             return res.status(400).json({
//                 success: false,
//                 message: `Monthly income must be at least ₦${config.minIncome.toLocaleString()} for ${loanType} loans`
//             });
//         }

//         // Calculate debt-to-income ratio
//         const totalMonthlyDebt = existingLoans + (loanAmount * (preferredInterestRate/100/12));
//         const debtToIncomeRatio = (totalMonthlyDebt / monthlyIncome) * 100;

//         if (debtToIncomeRatio > 40) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Your debt-to-income ratio is too high. Consider applying for a smaller loan amount.'
//             });
//         }

//         // Calculate application score
//         const applicationScore = calculateApplicationScore({
//             creditScore,
//             monthlyIncome,
//             loanAmount,
//             employmentStatus,
//             debtToIncomeRatio,
//             hasCollateral
//         });

//         // Generate payment reference
//         const paymentReference = generatePaymentReference(Date.now());

//         // Create loan application
//         const loanApplication = new Loan({
//             memberId: req.memberId,
//             accountNumber: member.accountNumber,
//             firstName,
//             lastName,
//             email,
//             phone,
//             employmentStatus,
//             employerName,
//             jobTitle,
//             monthlyIncome,
//             employmentDuration,
//             loanType,
//             loanAmount,
//             loanPurpose,
//             repaymentTerm,
//             preferredInterestRate,
//             monthlyExpenses,
//             existingLoans,
//             creditScore,
//             hasCollateral,
//             collateralType,
//             collateralValue,
//             collateralDescription,
//             additionalNotes,
//             applicationScore,
//             paymentReference,
//             upfrontPaymentRequired: calculateUpfrontPayment(loanAmount)
//         });

//         await loanApplication.save();

//         // Get payment accounts with calculated amounts
//         const paymentOptions = getPaymentAccountsForLoan(loanAmount);

//         // Send payment request email
//         let emailSent = false;
//         try {
//             await sendLoanPaymentRequestEmail(member, loanApplication, paymentOptions);
//             console.log('✅ Loan payment request email sent successfully');
//             emailSent = true;
//         } catch (emailError) {
//             console.error('❌ Failed to send payment request email:', emailError);
//             // Don't fail the whole request if email fails
//         }

//         console.log('✅ Loan application submitted successfully. Application ID:', loanApplication._id);

//         res.status(201).json({
//             success: true,
//             message: 'Loan application submitted successfully! Please check your email for payment instructions.',
//             applicationId: loanApplication._id,
//             applicationScore: applicationScore,
//             paymentRequired: true,
//             upfrontPaymentAmount: calculateUpfrontPayment(loanAmount),
//             paymentReference: paymentReference,
//             paymentAccounts: paymentOptions,
//             emailSent: emailSent,
//             nextSteps: [
//                 `Make upfront payment of ₦${calculateUpfrontPayment(loanAmount).toLocaleString()} (20% of loan amount)`,
//                 'Check your email for detailed payment instructions',
//                 'Use the provided payment reference in transaction description',
//                 'After payment verification, your loan will be processed within 2-3 business days'
//             ]
//         });

//     } catch (error) {
//         console.error('❌ Loan application error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error submitting loan application',
//             error: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// };

// // Calculate application risk score (1-100)
// const calculateApplicationScore = (factors) => {
//     let score = 50; // Base score

//     // Credit score factor (30%)
//     if (factors.creditScore >= 750) score += 15;
//     else if (factors.creditScore >= 650) score += 10;
//     else if (factors.creditScore >= 550) score += 5;
//     else score -= 10;

//     // Income stability factor (25%)
//     if (factors.monthlyIncome > 200000) score += 12;
//     else if (factors.monthlyIncome > 100000) score += 8;
//     else if (factors.monthlyIncome > 50000) score += 4;

//     // Debt-to-income factor (20%)
//     if (factors.debtToIncomeRatio < 20) score += 10;
//     else if (factors.debtToIncomeRatio < 35) score += 5;
//     else score -= 8;

//     // Employment factor (15%)
//     if (factors.employmentStatus === 'Employed Full-time') score += 8;
//     else if (factors.employmentStatus === 'Self-Employed') score += 4;

//     // Collateral factor (10%)
//     if (factors.hasCollateral) score += 5;

//     return Math.min(Math.max(score, 1), 100);
// };

// // Get payment instructions for a loan application
// const getLoanPaymentInstructions = async (req, res) => {
//     try {
//         const { loanId } = req.params;

//         // Validate loan ID
//         if (!loanId) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Loan ID is required'
//             });
//         }

//         // Find the loan application
//         const loan = await Loan.findOne({
//             _id: loanId,
//             memberId: req.memberId // Ensure the loan belongs to the authenticated member
//         }).populate('memberId', 'firstName lastName email phone');

//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         // Check if payment is still required
//         if (loan.status !== 'pending' || loan.paymentVerified) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Payment already processed for this loan application'
//             });
//         }

//         // Calculate upfront payment
//         const upfrontPaymentAmount = calculateUpfrontPayment(loan.loanAmount);
        
//         // Get payment accounts with calculated amounts
//         const paymentAccounts = getPaymentAccountsForLoan(loan.loanAmount);

//         // Prepare response data
//         const responseData = {
//             success: true,
//             message: 'Payment instructions retrieved successfully',
//             applicationId: loan._id,
//             applicationScore: loan.applicationScore,
//             paymentRequired: true,
//             upfrontPaymentAmount: upfrontPaymentAmount,
//             paymentReference: loan.paymentReference,
//             paymentAccounts: paymentAccounts,
//             emailSent: true, // You can track this in your database if needed
//             nextSteps: [
//                 `Make upfront payment of ₦${upfrontPaymentAmount.toLocaleString()} (20% of loan amount)`,
//                 'Check your email for detailed payment instructions',
//                 'Use the provided payment reference in transaction description',
//                 'After payment verification, your loan will be processed within 2-3 business days'
//             ],
//             loanDetails: {
//                 loanAmount: loan.loanAmount,
//                 loanType: loan.loanType,
//                 loanPurpose: loan.loanPurpose,
//                 repaymentTerm: loan.repaymentTerm,
//                 applicationDate: loan.applicationDate
//             },
//             memberDetails: {
//                 firstName: loan.memberId.firstName,
//                 lastName: loan.memberId.lastName,
//                 email: loan.memberId.email
//             }
//         };

//         res.json(responseData);

//     } catch (error) {
//         console.error('❌ Get payment instructions error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching payment instructions',
//             error: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// };

// // Payment Verification Endpoint
// const verifyPayment = async (req, res) => {
//     try {
//         const { loanId, paymentAmount, paymentReference, paymentAccountId } = req.body;

//         if (!loanId || !paymentAmount || !paymentReference) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Missing required fields: loanId, paymentAmount, and paymentReference are required'
//             });
//         }

//         // Verify payment and update loan status
//         const paymentResult = await verifyPaymentAndProcessLoan(loanId, paymentAmount, paymentReference);

//         if (paymentResult.success) {
//             // Get loan and member details for email
//             const loan = await Loan.findById(loanId).populate('memberId');
            
//             let emailSent = false;
//             let smsSent = false;

//             // Send payment verified email
//             try {
//                 await sendLoanPaymentVerifiedEmail(loan.memberId, loan, {
//                     paymentAmount,
//                     paymentReference
//                 });
//                 console.log('✅ Loan payment verified email sent successfully');
//                 emailSent = true;
//             } catch (emailError) {
//                 console.error('❌ Failed to send payment verified email:', emailError);
//             }

//             // Send SMS notification
//             try {
//                 await sendSMSNotification(loan.memberId.phone, 
//                     `First International Financial Services: Payment verified! Loan application #${loanId.slice(-8)} is now under review. Check email for details.`
//                 );
//                 smsSent = true;
//             } catch (smsError) {
//                 console.error('❌ Failed to send SMS notification:', smsError);
//             }
            
//             res.json({
//                 success: true,
//                 message: 'Payment verified successfully! Check your email for confirmation.',
//                 loanStatus: 'under_review',
//                 emailSent: emailSent,
//                 smsSent: smsSent,
//                 estimatedProcessingTime: '2-3 business days',
//                 nextSteps: [
//                     'Loan application is under review',
//                     'Check your email for confirmation and next steps',
//                     'You will be notified of the approval decision via email and SMS',
//                     'Approval decision typically takes 2-3 business days'
//                 ]
//             });
//         } else {
//             res.status(400).json({
//                 success: false,
//                 message: paymentResult.message,
//                 paymentVerified: false,
//                 requiredAmount: paymentResult.requiredAmount
//             });
//         }
//     } catch (error) {
//         console.error('❌ Payment verification error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error verifying payment'
//         });
//     }
// };

// // Get payment details for a loan
// const getLoanPaymentDetails = async (req, res) => {
//     try {
//         const loan = await Loan.findOne({
//             _id: req.params.loanId,
//             memberId: req.memberId
//         });

//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         const upfrontPayment = calculateUpfrontPayment(loan.loanAmount);
//         const paymentOptions = getPaymentAccountsForLoan(loan.loanAmount);

//         res.json({
//             success: true,
//             loanId: loan._id,
//             loanAmount: loan.loanAmount,
//             upfrontPaymentRequired: upfrontPayment,
//             paymentReference: loan.paymentReference,
//             paymentAccounts: paymentOptions,
//             paymentStatus: loan.paymentVerified ? 'verified' : 'pending',
//             loanStatus: loan.status,
//             nextSteps: loan.paymentVerified ? 
//                 ['Payment verified. Loan is under review.'] :
//                 [`Make payment of ₦${upfrontPayment.toLocaleString()} to proceed with loan processing`]
//         });
//     } catch (error) {
//         console.error('❌ Get payment details error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching payment details'
//         });
//     }
// };

// // Send loan processing notification
// const sendLoanProcessingNotification = async (loanId) => {
//     try {
//         const loan = await Loan.findById(loanId).populate('memberId');
        
//         if (!loan) {
//             console.error('Loan not found for notification:', loanId);
//             return false;
//         }

//         // Simulate sending notifications
//         console.log(`📧 EMAIL NOTIFICATION: Loan processing started for ${loan.email}`);
//         console.log(`📱 SMS NOTIFICATION: Loan processing started for ${loan.phone}`);
//         console.log(`🔔 IN-APP NOTIFICATION: Your loan application #${loan._id} is now being processed!`);
        
//         return true;
//     } catch (error) {
//         console.error('❌ Notification error:', error);
//         return false;
//     }
// };

// // Get member's loan applications
// const getMemberLoans = async (req, res) => {
//     try {
//         const loans = await Loan.find({ memberId: req.memberId })
//             .sort({ createdAt: -1 })
//             .select('-__v');

//         // Add payment status to each loan
//         const loansWithPaymentStatus = loans.map(loan => ({
//             ...loan.toObject(),
//             paymentRequired: loan.status === 'pending' && !loan.paymentVerified,
//             upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
//             canMakePayment: loan.status === 'pending' && !loan.paymentVerified
//         }));

//         res.json({
//             success: true,
//             loans: loansWithPaymentStatus,
//             count: loans.length
//         });
//     } catch (error) {
//         console.error('❌ Get member loans error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching loan applications'
//         });
//     }
// };

// // Get single loan application
// const getLoanApplication = async (req, res) => {
//     try {
//         const loan = await Loan.findOne({
//             _id: req.params.loanId,
//             memberId: req.memberId
//         });

//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         // Add payment information
//         const loanWithPaymentInfo = {
//             ...loan.toObject(),
//             paymentRequired: loan.status === 'pending' && !loan.paymentVerified,
//             upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
//             paymentAccounts: getPaymentAccountsForLoan(loan.loanAmount),
//             canMakePayment: loan.status === 'pending' && !loan.paymentVerified
//         };

//         res.json({
//             success: true,
//             loan: loanWithPaymentInfo
//         });
//     } catch (error) {
//         console.error('❌ Get loan application error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching loan application'
//         });
//     }
// };

// // Admin: Get all loan applications
// const getAllLoans = async (req, res) => {
//     try {
//         const { status, loanType, page = 1, limit = 10 } = req.query;
        
//         const filter = {};
//         if (status) filter.status = status;
//         if (loanType) filter.loanType = loanType;

//         const loans = await Loan.find(filter)
//             .populate('memberId', 'firstName lastName email phone accountNumber')
//             .sort({ createdAt: -1 })
//             .limit(limit * 1)
//             .skip((page - 1) * limit)
//             .select('-__v');

//         const total = await Loan.countDocuments(filter);

//         res.json({
//             success: true,
//             loans,
//             totalPages: Math.ceil(total / limit),
//             currentPage: page,
//             total
//         });
//     } catch (error) {
//         console.error('❌ Get all loans error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching loan applications'
//         });
//     }
// };

// // Admin: Update loan status
// const updateLoanStatus = async (req, res) => {
//     try {
//         const { loanId } = req.params;
//         const { status, approvedAmount, approvedInterestRate, approvedTerm, rejectionReason } = req.body;

//         const loan = await Loan.findById(loanId).populate('memberId');
//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         // Check if payment is verified before approval
//         if (status === 'approved' && !loan.paymentVerified && loan.status === 'pending') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cannot approve loan without verified upfront payment'
//             });
//         }

//         // Update loan status and details
//         loan.status = status;
//         loan.reviewedBy = req.memberId;
//         loan.reviewDate = new Date();

//         let emailSent = false;
//         let smsSent = false;

//         if (status === 'approved') {
//             loan.approvedAmount = approvedAmount || loan.loanAmount;
//             loan.approvedInterestRate = approvedInterestRate || loan.preferredInterestRate;
//             loan.approvedTerm = approvedTerm || parseInt(loan.repaymentTerm);
//             loan.approvalDate = new Date();

//             // Calculate final loan details
//             const loanDetails = Loan.calculateLoanDetails(
//                 loan.approvedAmount,
//                 loan.approvedInterestRate,
//                 loan.approvedTerm
//             );

//             loan.monthlyPayment = loanDetails.monthlyPayment;
//             loan.totalPayment = loanDetails.totalPayment;
//             loan.totalInterest = loanDetails.totalInterest;

//             // Send loan approved email
//             try {
//                 await sendLoanApprovedEmail(loan.memberId, loan);
//                 console.log('✅ Loan approved email sent successfully');
//                 emailSent = true;
//             } catch (emailError) {
//                 console.error('❌ Failed to send loan approved email:', emailError);
//             }

//             // Send SMS notification
//             try {
//                 await sendSMSNotification(loan.memberId.phone, 
//                     `First International Financial Services: Congratulations! Your ₦${loan.approvedAmount.toLocaleString()} loan is approved. Check email for details.`
//                 );
//                 smsSent = true;
//             } catch (smsError) {
//                 console.error('❌ Failed to send SMS notification:', smsError);
//             }

//         } else if (status === 'rejected') {
//             loan.rejectionDate = new Date();
//             loan.rejectionReason = rejectionReason || 'Application does not meet requirements';

//             // Send loan rejected email
//             try {
//                 await sendLoanRejectedEmail(loan.memberId, loan);
//                 console.log('✅ Loan rejected email sent successfully');
//                 emailSent = true;
//             } catch (emailError) {
//                 console.error('❌ Failed to send loan rejected email:', emailError);
//             }

//             // Send SMS notification
//             try {
//                 await sendSMSNotification(loan.memberId.phone, 
//                     `First International Financial Services: Update on your loan application. Please check your email for details.`
//                 );
//                 smsSent = true;
//             } catch (smsError) {
//                 console.error('❌ Failed to send SMS notification:', smsError);
//             }
//         }

//         await loan.save();

//         res.json({
//             success: true,
//             message: `Loan application ${status} successfully`,
//             emailSent: emailSent,
//             smsSent: smsSent,
//             loan
//         });

//     } catch (error) {
//         console.error('❌ Update loan status error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error updating loan application'
//         });
//     }
// };

// // Admin: Disburse loan
// const disburseLoan = async (req, res) => {
//     try {
//         const { loanId } = req.params;
//         const { disbursementAmount, disbursementMethod } = req.body;

//         const loan = await Loan.findById(loanId).populate('memberId');
//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         if (loan.status !== 'approved') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Only approved loans can be disbursed'
//             });
//         }

//         loan.disbursementDate = new Date();
//         loan.disbursementAmount = disbursementAmount || loan.approvedAmount;
//         loan.disbursementMethod = disbursementMethod || 'bank_transfer';
//         loan.status = 'disbursed';

//         await loan.save();

//         let emailSent = false;
//         let smsSent = false;

//         // Send loan disbursed email
//         try {
//             await sendLoanDisbursedEmail(loan.memberId, loan);
//             console.log('✅ Loan disbursed email sent successfully');
//             emailSent = true;
//         } catch (emailError) {
//             console.error('❌ Failed to send loan disbursed email:', emailError);
//         }

//         // Send SMS notification
//         try {
//             await sendSMSNotification(loan.memberId.phone, 
//                 `First International Financial Services: ₦${loan.disbursementAmount.toLocaleString()} loan disbursed to your account. Check email for repayment details.`
//             );
//             smsSent = true;
//         } catch (smsError) {
//             console.error('❌ Failed to send SMS notification:', smsError);
//         }

//         res.json({
//             success: true,
//             message: 'Loan disbursed successfully. Borrower notified via email and SMS.',
//             emailSent: emailSent,
//             smsSent: smsSent,
//             loan
//         });

//     } catch (error) {
//         console.error('❌ Disburse loan error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error disbursing loan'
//         });
//     }
// };

// // Get loan statistics
// const getLoanStatistics = async (req, res) => {
//     try {
//         const totalApplications = await Loan.countDocuments();
//         const pendingApplications = await Loan.countDocuments({ status: 'pending' });
//         const underReviewApplications = await Loan.countDocuments({ status: 'under_review' });
//         const approvedApplications = await Loan.countDocuments({ status: 'approved' });
//         const disbursedApplications = await Loan.countDocuments({ status: 'disbursed' });
//         const pendingPaymentApplications = await Loan.countDocuments({ 
//             status: 'pending',
//             paymentVerified: false 
//         });
        
//         const totalLoanAmount = await Loan.aggregate([
//             { $match: { status: { $in: ['approved', 'disbursed'] } } },
//             { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
//         ]);

//         const totalRequestedAmount = await Loan.aggregate([
//             { $group: { _id: null, total: { $sum: '$loanAmount' } } }
//         ]);

//         const totalUpfrontPayments = await Loan.aggregate([
//             { $match: { paymentVerified: true } },
//             { $group: { _id: null, total: { $sum: '$upfrontPaymentRequired' } } }
//         ]);

//         const loanTypeDistribution = await Loan.aggregate([
//             { $group: { _id: '$loanType', count: { $sum: 1 }, totalAmount: { $sum: '$loanAmount' } } }
//         ]);

//         const statusDistribution = await Loan.aggregate([
//             { $group: { _id: '$status', count: { $sum: 1 } } }
//         ]);

//         // Calculate approval rate
//         const totalProcessed = totalApplications - pendingApplications;
//         const approvalRate = totalProcessed > 0 ? (approvedApplications / totalProcessed * 100).toFixed(1) : 0;

//         res.json({
//             success: true,
//             statistics: {
//                 totalApplications,
//                 pendingApplications,
//                 underReviewApplications,
//                 approvedApplications,
//                 disbursedApplications,
//                 pendingPaymentApplications,
//                 totalLoanAmount: totalLoanAmount[0]?.total || 0,
//                 totalRequestedAmount: totalRequestedAmount[0]?.total || 0,
//                 totalUpfrontPayments: totalUpfrontPayments[0]?.total || 0,
//                 approvalRate: `${approvalRate}%`,
//                 loanTypeDistribution,
//                 statusDistribution
//             }
//         });
//     } catch (error) {
//         console.error('❌ Get loan statistics error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching loan statistics'
//         });
//     }
// };

// // Helper function for SMS notifications
// const sendSMSNotification = async (phoneNumber, message) => {
//     try {
//         // Integrate with your SMS provider (Twilio, etc.)
//         // For now, we'll just log it
//         console.log(`📱 SMS to ${phoneNumber}: ${message}`);
        
//         // Example with Twilio (uncomment and configure if you have Twilio)
//         /*
//         const twilio = require('twilio');
//         const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
//         await client.messages.create({
//             body: message,
//             from: process.env.TWILIO_PHONE_NUMBER,
//             to: phoneNumber
//         });
//         */
        
//         return true;
//     } catch (error) {
//         console.error('❌ SMS notification error:', error);
//         return false;
//     }
// };

// // Get loans requiring payment
// const getLoansRequiringPayment = async (req, res) => {
//     try {
//         const loans = await Loan.find({
//             memberId: req.memberId,
//             status: 'pending',
//             paymentVerified: false
//         }).sort({ createdAt: -1 });

//         const loansWithPaymentInfo = loans.map(loan => ({
//             ...loan.toObject(),
//             upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
//             paymentAccounts: getPaymentAccountsForLoan(loan.loanAmount)
//         }));

//         res.json({
//             success: true,
//             loans: loansWithPaymentInfo,
//             count: loans.length
//         });
//     } catch (error) {
//         console.error('❌ Get loans requiring payment error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error fetching loans requiring payment'
//         });
//     }
// };

// // Cancel loan application
// const cancelLoanApplication = async (req, res) => {
//     try {
//         const { loanId } = req.params;

//         const loan = await Loan.findOne({
//             _id: loanId,
//             memberId: req.memberId
//         });

//         if (!loan) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Loan application not found'
//             });
//         }

//         // Only allow cancellation if loan is still pending and payment not verified
//         if (loan.status !== 'pending' || loan.paymentVerified) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cannot cancel loan application. It has already been processed.'
//             });
//         }

//         // Update loan status to closed
//         loan.status = 'closed';
//         loan.additionalNotes = `Application cancelled by member on ${new Date().toLocaleDateString()}`;
//         await loan.save();

//         res.json({
//             success: true,
//             message: 'Loan application cancelled successfully',
//             loanId: loan._id
//         });
//     } catch (error) {
//         console.error('❌ Cancel loan application error:', error);
//         res.status(500).json({
//             success: false,
//             message: 'Error cancelling loan application'
//         });
//     }
// };

// module.exports = {
//     applyForLoan,
//     getMemberLoans,
//     getLoanApplication,
//     getAllLoans,
//     updateLoanStatus,
//     disburseLoan,
//     getLoanStatistics,
//     verifyPayment,
//     getLoanPaymentDetails,
//     getLoansRequiringPayment,
//     cancelLoanApplication,
//     getLoanPaymentInstructions
// };

const Loan = require('../models/Loan');
const Member = require('../models/Member');
const { 
    calculateUpfrontPayment, 
    generatePaymentReference,
    getPaymentAccountsForLoan 
} = require('../config/paymentAccounts');
const { 
    sendLoanPaymentRequestEmail,
    sendLoanPaymentVerifiedEmail,
    sendLoanApprovedEmail,
    sendLoanRejectedEmail,
    sendLoanDisbursedEmail
} = require('../utils/emailService');
const { validationResult } = require('express-validator');

// Loan type configurations
const loanConfigs = {
    personal: { maxAmount: 5000000, maxTerm: 60, minIncome: 50000 },
    business: { maxAmount: 50000000, maxTerm: 84, minIncome: 100000 },
    mortgage: { maxAmount: 100000000, maxTerm: 360, minIncome: 150000 },
    auto: { maxAmount: 20000000, maxTerm: 84, minIncome: 75000 },
    education: { maxAmount: 10000000, maxTerm: 120, minIncome: 0 },
    emergency: { maxAmount: 2000000, maxTerm: 24, minIncome: 30000 }
};

// Payment verification function (moved from paymentAccounts to avoid import issues)
const verifyPaymentAndProcessLoan = async (loanId, paymentAmount, paymentReference) => {
    try {
        console.log('🔍 Verifying payment for loan:', loanId);
        
        const loan = await Loan.findById(loanId);
        if (!loan) {
            console.log('❌ Loan not found:', loanId);
            return { success: false, message: 'Loan application not found' };
        }

        // Check if payment was already processed
        if (loan.status !== 'pending') {
            console.log('ℹ️ Payment already processed for loan:', loanId);
            return { 
                success: false, 
                message: 'Payment already processed for this loan application' 
            };
        }

        const requiredUpfront = calculateUpfrontPayment(loan.loanAmount);
        
        console.log(`💰 Payment details - Required: ${requiredUpfront}, Received: ${paymentAmount}`);
        
        // Check if payment meets 20% requirement (allow small rounding differences)
        if (paymentAmount >= requiredUpfront * 0.95) { // 5% tolerance
            // Update loan status to under_review
            loan.status = 'under_review';
            loan.paymentVerified = true;
            loan.upfrontPaymentPaid = paymentAmount;
            loan.paymentVerificationDate = new Date();
            loan.additionalNotes = `20% upfront payment received. Amount: ₦${paymentAmount.toLocaleString()}. Reference: ${paymentReference}`;
            loan.reviewDate = new Date();
            
            await loan.save();

            console.log('✅ Payment verified and loan status updated for:', loanId);

            return {
                success: true,
                message: 'Payment verified successfully. Your loan is now being processed.',
                loanStatus: 'under_review',
                paymentVerified: true,
                loanId: loan._id
            };
        } else {
            console.log('❌ Insufficient payment for loan:', loanId);
            return {
                success: false,
                message: `Insufficient payment. Required: ₦${requiredUpfront.toLocaleString()}, Received: ₦${paymentAmount.toLocaleString()}`,
                paymentVerified: false,
                requiredAmount: requiredUpfront
            };
        }
    } catch (error) {
        console.error('❌ Payment verification error:', error);
        return { 
            success: false, 
            message: 'Error verifying payment: ' + error.message 
        };
    }
};

// Apply for loan
const applyForLoan = async (req, res) => {
    try {
        console.log('📝 Loan application received from member:', req.memberId);
        
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            employmentStatus,
            employerName,
            jobTitle,
            monthlyIncome,
            employmentDuration,
            loanType,
            loanAmount,
            loanPurpose,
            repaymentTerm,
            preferredInterestRate,
            monthlyExpenses,
            existingLoans,
            creditScore,
            hasCollateral,
            collateralType,
            collateralValue,
            collateralDescription,
            additionalNotes
        } = req.body;

        // Get member details
        const member = await Member.findById(req.memberId);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: 'Member not found'
            });
        }

        // Check if member can apply for new loan
        const canApply = await Loan.canMemberApply(req.memberId);
        if (!canApply) {
            return res.status(400).json({
                success: false,
                message: 'You have too many pending loan applications. Please wait for current applications to be processed.'
            });
        }

        // Validate loan type and amount
        const config = loanConfigs[loanType];
        if (!config) {
            return res.status(400).json({
                success: false,
                message: 'Invalid loan type'
            });
        }

        if (loanAmount > config.maxAmount) {
            return res.status(400).json({
                success: false,
                message: `Loan amount exceeds maximum limit of ₦${config.maxAmount.toLocaleString()} for ${loanType} loans`
            });
        }

        if (parseInt(repaymentTerm) > config.maxTerm) {
            return res.status(400).json({
                success: false,
                message: `Repayment term exceeds maximum of ${config.maxTerm} months for ${loanType} loans`
            });
        }

        if (monthlyIncome < config.minIncome) {
            return res.status(400).json({
                success: false,
                message: `Monthly income must be at least ₦${config.minIncome.toLocaleString()} for ${loanType} loans`
            });
        }

        // Calculate debt-to-income ratio
        const totalMonthlyDebt = existingLoans + (loanAmount * (preferredInterestRate/100/12));
        const debtToIncomeRatio = (totalMonthlyDebt / monthlyIncome) * 100;

        if (debtToIncomeRatio > 40) {
            return res.status(400).json({
                success: false,
                message: 'Your debt-to-income ratio is too high. Consider applying for a smaller loan amount.'
            });
        }

        // Calculate application score
        const applicationScore = calculateApplicationScore({
            creditScore,
            monthlyIncome,
            loanAmount,
            employmentStatus,
            debtToIncomeRatio,
            hasCollateral
        });

        // Generate payment reference
        const paymentReference = generatePaymentReference(Date.now());

        // Create loan application
        const loanApplication = new Loan({
            memberId: req.memberId,
            accountNumber: member.accountNumber,
            firstName,
            lastName,
            email,
            phone,
            employmentStatus,
            employerName,
            jobTitle,
            monthlyIncome,
            employmentDuration,
            loanType,
            loanAmount,
            loanPurpose,
            repaymentTerm,
            preferredInterestRate,
            monthlyExpenses,
            existingLoans,
            creditScore,
            hasCollateral,
            collateralType,
            collateralValue,
            collateralDescription,
            additionalNotes,
            applicationScore,
            paymentReference,
            upfrontPaymentRequired: calculateUpfrontPayment(loanAmount)
        });

        await loanApplication.save();

        // Get payment accounts with calculated amounts
        const paymentOptions = getPaymentAccountsForLoan(loanAmount);

        // Send payment request email
        let emailSent = false;
        try {
            await sendLoanPaymentRequestEmail(member, loanApplication, paymentOptions);
            console.log('✅ Loan payment request email sent successfully');
            emailSent = true;
        } catch (emailError) {
            console.error('❌ Failed to send payment request email:', emailError);
            // Don't fail the whole request if email fails
        }

        console.log('✅ Loan application submitted successfully. Application ID:', loanApplication._id);

        res.status(201).json({
            success: true,
            message: 'Loan application submitted successfully! Please check your email for payment instructions.',
            applicationId: loanApplication._id,
            applicationScore: applicationScore,
            paymentRequired: true,
            upfrontPaymentAmount: calculateUpfrontPayment(loanAmount),
            paymentReference: paymentReference,
            paymentAccounts: paymentOptions,
            emailSent: emailSent,
            nextSteps: [
                `Make upfront payment of ₦${calculateUpfrontPayment(loanAmount).toLocaleString()} (20% of loan amount)`,
                'Check your email for detailed payment instructions',
                'Use the provided payment reference in transaction description',
                'After payment verification, your loan will be processed within 2-3 business days'
            ]
        });

    } catch (error) {
        console.error('❌ Loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting loan application',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Calculate application risk score (1-100)
const calculateApplicationScore = (factors) => {
    let score = 50; // Base score

    // Credit score factor (30%)
    if (factors.creditScore >= 750) score += 15;
    else if (factors.creditScore >= 650) score += 10;
    else if (factors.creditScore >= 550) score += 5;
    else score -= 10;

    // Income stability factor (25%)
    if (factors.monthlyIncome > 200000) score += 12;
    else if (factors.monthlyIncome > 100000) score += 8;
    else if (factors.monthlyIncome > 50000) score += 4;

    // Debt-to-income factor (20%)
    if (factors.debtToIncomeRatio < 20) score += 10;
    else if (factors.debtToIncomeRatio < 35) score += 5;
    else score -= 8;

    // Employment factor (15%)
    if (factors.employmentStatus === 'Employed Full-time') score += 8;
    else if (factors.employmentStatus === 'Self-Employed') score += 4;

    // Collateral factor (10%)
    if (factors.hasCollateral) score += 5;

    return Math.min(Math.max(score, 1), 100);
};

// Get payment instructions for a loan application
const getLoanPaymentInstructions = async (req, res) => {
    try {
        const { loanId } = req.params;

        // Validate loan ID
        if (!loanId) {
            return res.status(400).json({
                success: false,
                message: 'Loan ID is required'
            });
        }

        // Find the loan application
        const loan = await Loan.findOne({
            _id: loanId,
            memberId: req.memberId // Ensure the loan belongs to the authenticated member
        }).populate('memberId', 'firstName lastName email phone');

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        // Check if payment is still required
        if (loan.status !== 'pending' || loan.paymentVerified) {
            return res.status(400).json({
                success: false,
                message: 'Payment already processed for this loan application'
            });
        }

        // Calculate upfront payment
        const upfrontPaymentAmount = calculateUpfrontPayment(loan.loanAmount);
        
        // Get payment accounts with calculated amounts
        const paymentAccounts = getPaymentAccountsForLoan(loan.loanAmount);

        // Prepare response data
        const responseData = {
            success: true,
            message: 'Payment instructions retrieved successfully',
            applicationId: loan._id,
            applicationScore: loan.applicationScore,
            paymentRequired: true,
            upfrontPaymentAmount: upfrontPaymentAmount,
            paymentReference: loan.paymentReference,
            paymentAccounts: paymentAccounts,
            emailSent: true, // You can track this in your database if needed
            nextSteps: [
                `Make upfront payment of ₦${upfrontPaymentAmount.toLocaleString()} (20% of loan amount)`,
                'Check your email for detailed payment instructions',
                'Use the provided payment reference in transaction description',
                'After payment verification, your loan will be processed within 2-3 business days'
            ],
            loanDetails: {
                loanAmount: loan.loanAmount,
                loanType: loan.loanType,
                loanPurpose: loan.loanPurpose,
                repaymentTerm: loan.repaymentTerm,
                applicationDate: loan.applicationDate
            },
            memberDetails: {
                firstName: loan.memberId.firstName,
                lastName: loan.memberId.lastName,
                email: loan.memberId.email
            }
        };

        res.json(responseData);

    } catch (error) {
        console.error('❌ Get payment instructions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment instructions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Payment Verification Endpoint
const verifyPayment = async (req, res) => {
    try {
        const { loanId, paymentAmount, paymentReference, paymentAccountId } = req.body;

        if (!loanId || !paymentAmount || !paymentReference) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: loanId, paymentAmount, and paymentReference are required'
            });
        }

        // Verify payment and update loan status
        const paymentResult = await verifyPaymentAndProcessLoan(loanId, paymentAmount, paymentReference);

        if (paymentResult.success) {
            // Get loan and member details for email
            const loan = await Loan.findById(loanId).populate('memberId');
            
            let emailSent = false;
            let smsSent = false;

            // Send payment verified email
            try {
                await sendLoanPaymentVerifiedEmail(loan.memberId, loan, {
                    paymentAmount,
                    paymentReference
                });
                console.log('✅ Loan payment verified email sent successfully');
                emailSent = true;
            } catch (emailError) {
                console.error('❌ Failed to send payment verified email:', emailError);
            }

            // Send SMS notification
            try {
                await sendSMSNotification(loan.memberId.phone, 
                    `First International Financial Services: Payment verified! Loan application #${loanId.slice(-8)} is now under review. Check email for details.`
                );
                smsSent = true;
            } catch (smsError) {
                console.error('❌ Failed to send SMS notification:', smsError);
            }
            
            res.json({
                success: true,
                message: 'Payment verified successfully! Check your email for confirmation.',
                loanStatus: 'under_review',
                emailSent: emailSent,
                smsSent: smsSent,
                estimatedProcessingTime: '2-3 business days',
                nextSteps: [
                    'Loan application is under review',
                    'Check your email for confirmation and next steps',
                    'You will be notified of the approval decision via email and SMS',
                    'Approval decision typically takes 2-3 business days'
                ]
            });
        } else {
            res.status(400).json({
                success: false,
                message: paymentResult.message,
                paymentVerified: false,
                requiredAmount: paymentResult.requiredAmount
            });
        }
    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment'
        });
    }
};

// Get payment details for a loan
const getLoanPaymentDetails = async (req, res) => {
    try {
        const loan = await Loan.findOne({
            _id: req.params.loanId,
            memberId: req.memberId
        });

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        const upfrontPayment = calculateUpfrontPayment(loan.loanAmount);
        const paymentOptions = getPaymentAccountsForLoan(loan.loanAmount);

        res.json({
            success: true,
            loanId: loan._id,
            loanAmount: loan.loanAmount,
            upfrontPaymentRequired: upfrontPayment,
            paymentReference: loan.paymentReference,
            paymentAccounts: paymentOptions,
            paymentStatus: loan.paymentVerified ? 'verified' : 'pending',
            loanStatus: loan.status,
            nextSteps: loan.paymentVerified ? 
                ['Payment verified. Loan is under review.'] :
                [`Make payment of ₦${upfrontPayment.toLocaleString()} to proceed with loan processing`]
        });
    } catch (error) {
        console.error('❌ Get payment details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment details'
        });
    }
};

// Get member's loan applications
const getMemberLoans = async (req, res) => {
    try {
        const loans = await Loan.find({ memberId: req.memberId })
            .sort({ createdAt: -1 })
            .select('-__v');

        // Add payment status to each loan
        const loansWithPaymentStatus = loans.map(loan => ({
            ...loan.toObject(),
            paymentRequired: loan.status === 'pending' && !loan.paymentVerified,
            upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
            canMakePayment: loan.status === 'pending' && !loan.paymentVerified
        }));

        res.json({
            success: true,
            loans: loansWithPaymentStatus,
            count: loans.length
        });
    } catch (error) {
        console.error('❌ Get member loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching loan applications'
        });
    }
};

// Get single loan application
const getLoanApplication = async (req, res) => {
    try {
        const loan = await Loan.findOne({
            _id: req.params.loanId,
            memberId: req.memberId
        });

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        // Add payment information
        const loanWithPaymentInfo = {
            ...loan.toObject(),
            paymentRequired: loan.status === 'pending' && !loan.paymentVerified,
            upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
            paymentAccounts: getPaymentAccountsForLoan(loan.loanAmount),
            canMakePayment: loan.status === 'pending' && !loan.paymentVerified
        };

        res.json({
            success: true,
            loan: loanWithPaymentInfo
        });
    } catch (error) {
        console.error('❌ Get loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching loan application'
        });
    }
};

// Admin: Get all loan applications
const getAllLoans = async (req, res) => {
    try {
        const { status, loanType, page = 1, limit = 10 } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (loanType) filter.loanType = loanType;

        const loans = await Loan.find(filter)
            .populate('memberId', 'firstName lastName email phone accountNumber')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .select('-__v');

        const total = await Loan.countDocuments(filter);

        res.json({
            success: true,
            loans,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        console.error('❌ Get all loans error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching loan applications'
        });
    }
};

// Admin: Update loan status
const updateLoanStatus = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { status, approvedAmount, approvedInterestRate, approvedTerm, rejectionReason } = req.body;

        const loan = await Loan.findById(loanId).populate('memberId');
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        // Check if payment is verified before approval
        if (status === 'approved' && !loan.paymentVerified && loan.status === 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Cannot approve loan without verified upfront payment'
            });
        }

        // Update loan status and details
        loan.status = status;
        loan.reviewedBy = req.memberId;
        loan.reviewDate = new Date();

        let emailSent = false;
        let smsSent = false;

        if (status === 'approved') {
            loan.approvedAmount = approvedAmount || loan.loanAmount;
            loan.approvedInterestRate = approvedInterestRate || loan.preferredInterestRate;
            loan.approvedTerm = approvedTerm || parseInt(loan.repaymentTerm);
            loan.approvalDate = new Date();

            // Calculate final loan details
            const loanDetails = Loan.calculateLoanDetails(
                loan.approvedAmount,
                loan.approvedInterestRate,
                loan.approvedTerm
            );

            loan.monthlyPayment = loanDetails.monthlyPayment;
            loan.totalPayment = loanDetails.totalPayment;
            loan.totalInterest = loanDetails.totalInterest;

            // Send loan approved email
            try {
                await sendLoanApprovedEmail(loan.memberId, loan);
                console.log('✅ Loan approved email sent successfully');
                emailSent = true;
            } catch (emailError) {
                console.error('❌ Failed to send loan approved email:', emailError);
            }

            // Send SMS notification
            try {
                await sendSMSNotification(loan.memberId.phone, 
                    `First International Financial Services: Congratulations! Your ₦${loan.approvedAmount.toLocaleString()} loan is approved. Check email for details.`
                );
                smsSent = true;
            } catch (smsError) {
                console.error('❌ Failed to send SMS notification:', smsError);
            }

        } else if (status === 'rejected') {
            loan.rejectionDate = new Date();
            loan.rejectionReason = rejectionReason || 'Application does not meet requirements';

            // Send loan rejected email
            try {
                await sendLoanRejectedEmail(loan.memberId, loan);
                console.log('✅ Loan rejected email sent successfully');
                emailSent = true;
            } catch (emailError) {
                console.error('❌ Failed to send loan rejected email:', emailError);
            }

            // Send SMS notification
            try {
                await sendSMSNotification(loan.memberId.phone, 
                    `First International Financial Services: Update on your loan application. Please check your email for details.`
                );
                smsSent = true;
            } catch (smsError) {
                console.error('❌ Failed to send SMS notification:', smsError);
            }
        }

        await loan.save();

        res.json({
            success: true,
            message: `Loan application ${status} successfully`,
            emailSent: emailSent,
            smsSent: smsSent,
            loan
        });

    } catch (error) {
        console.error('❌ Update loan status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating loan application'
        });
    }
};

// Admin: Disburse loan
const disburseLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const { disbursementAmount, disbursementMethod } = req.body;

        const loan = await Loan.findById(loanId).populate('memberId');
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        if (loan.status !== 'approved') {
            return res.status(400).json({
                success: false,
                message: 'Only approved loans can be disbursed'
            });
        }

        loan.disbursementDate = new Date();
        loan.disbursementAmount = disbursementAmount || loan.approvedAmount;
        loan.disbursementMethod = disbursementMethod || 'bank_transfer';
        loan.status = 'disbursed';

        await loan.save();

        let emailSent = false;
        let smsSent = false;

        // Send loan disbursed email
        try {
            await sendLoanDisbursedEmail(loan.memberId, loan);
            console.log('✅ Loan disbursed email sent successfully');
            emailSent = true;
        } catch (emailError) {
            console.error('❌ Failed to send loan disbursed email:', emailError);
        }

        // Send SMS notification
        try {
            await sendSMSNotification(loan.memberId.phone, 
                `First International Financial Services: ₦${loan.disbursementAmount.toLocaleString()} loan disbursed to your account. Check email for repayment details.`
            );
            smsSent = true;
        } catch (smsError) {
            console.error('❌ Failed to send SMS notification:', smsError);
        }

        res.json({
            success: true,
            message: 'Loan disbursed successfully. Borrower notified via email and SMS.',
            emailSent: emailSent,
            smsSent: smsSent,
            loan
        });

    } catch (error) {
        console.error('❌ Disburse loan error:', error);
        res.status(500).json({
            success: false,
            message: 'Error disbursing loan'
        });
    }
};

// Get loan statistics
const getLoanStatistics = async (req, res) => {
    try {
        const totalApplications = await Loan.countDocuments();
        const pendingApplications = await Loan.countDocuments({ status: 'pending' });
        const underReviewApplications = await Loan.countDocuments({ status: 'under_review' });
        const approvedApplications = await Loan.countDocuments({ status: 'approved' });
        const disbursedApplications = await Loan.countDocuments({ status: 'disbursed' });
        const pendingPaymentApplications = await Loan.countDocuments({ 
            status: 'pending',
            paymentVerified: false 
        });
        
        const totalLoanAmount = await Loan.aggregate([
            { $match: { status: { $in: ['approved', 'disbursed'] } } },
            { $group: { _id: null, total: { $sum: '$approvedAmount' } } }
        ]);

        const totalRequestedAmount = await Loan.aggregate([
            { $group: { _id: null, total: { $sum: '$loanAmount' } } }
        ]);

        const totalUpfrontPayments = await Loan.aggregate([
            { $match: { paymentVerified: true } },
            { $group: { _id: null, total: { $sum: '$upfrontPaymentRequired' } } }
        ]);

        const loanTypeDistribution = await Loan.aggregate([
            { $group: { _id: '$loanType', count: { $sum: 1 }, totalAmount: { $sum: '$loanAmount' } } }
        ]);

        const statusDistribution = await Loan.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Calculate approval rate
        const totalProcessed = totalApplications - pendingApplications;
        const approvalRate = totalProcessed > 0 ? (approvedApplications / totalProcessed * 100).toFixed(1) : 0;

        res.json({
            success: true,
            statistics: {
                totalApplications,
                pendingApplications,
                underReviewApplications,
                approvedApplications,
                disbursedApplications,
                pendingPaymentApplications,
                totalLoanAmount: totalLoanAmount[0]?.total || 0,
                totalRequestedAmount: totalRequestedAmount[0]?.total || 0,
                totalUpfrontPayments: totalUpfrontPayments[0]?.total || 0,
                approvalRate: `${approvalRate}%`,
                loanTypeDistribution,
                statusDistribution
            }
        });
    } catch (error) {
        console.error('❌ Get loan statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching loan statistics'
        });
    }
};

// Helper function for SMS notifications
const sendSMSNotification = async (phoneNumber, message) => {
    try {
        // Integrate with your SMS provider (Twilio, etc.)
        // For now, we'll just log it
        console.log(`📱 SMS to ${phoneNumber}: ${message}`);
        
        // Example with Twilio (uncomment and configure if you have Twilio)
        /*
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        await client.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
        });
        */
        
        return true;
    } catch (error) {
        console.error('❌ SMS notification error:', error);
        return false;
    }
};

// Get loans requiring payment
const getLoansRequiringPayment = async (req, res) => {
    try {
        const loans = await Loan.find({
            memberId: req.memberId,
            status: 'pending',
            paymentVerified: false
        }).sort({ createdAt: -1 });

        const loansWithPaymentInfo = loans.map(loan => ({
            ...loan.toObject(),
            upfrontPaymentAmount: loan.upfrontPaymentRequired || calculateUpfrontPayment(loan.loanAmount),
            paymentAccounts: getPaymentAccountsForLoan(loan.loanAmount)
        }));

        res.json({
            success: true,
            loans: loansWithPaymentInfo,
            count: loans.length
        });
    } catch (error) {
        console.error('❌ Get loans requiring payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching loans requiring payment'
        });
    }
};

// Cancel loan application
const cancelLoanApplication = async (req, res) => {
    try {
        const { loanId } = req.params;

        const loan = await Loan.findOne({
            _id: loanId,
            memberId: req.memberId
        });

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: 'Loan application not found'
            });
        }

        // Only allow cancellation if loan is still pending and payment not verified
        if (loan.status !== 'pending' || loan.paymentVerified) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel loan application. It has already been processed.'
            });
        }

        // Update loan status to closed
        loan.status = 'closed';
        loan.additionalNotes = `Application cancelled by member on ${new Date().toLocaleDateString()}`;
        await loan.save();

        res.json({
            success: true,
            message: 'Loan application cancelled successfully',
            loanId: loan._id
        });
    } catch (error) {
        console.error('❌ Cancel loan application error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling loan application'
        });
    }
};

module.exports = {
    applyForLoan,
    getMemberLoans,
    getLoanApplication,
    getAllLoans,
    updateLoanStatus,
    disburseLoan,
    getLoanStatistics,
    verifyPayment,
    getLoanPaymentDetails,
    getLoansRequiringPayment,
    cancelLoanApplication,
    getLoanPaymentInstructions
};