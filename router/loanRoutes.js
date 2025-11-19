const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const auth = require('../middleware/auth');
const {
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
} = require('../controllers/loanController');

// Validation rules
const loanApplicationValidation = [
  check('firstName', 'First name is required').notEmpty(),
  check('lastName', 'Last name is required').notEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('phone', 'Phone number is required').notEmpty(),
  check('employmentStatus', 'Employment status is required').notEmpty(),
  check('employerName', 'Employer name is required').notEmpty(),
  check('jobTitle', 'Job title is required').notEmpty(),
  check('monthlyIncome', 'Monthly income is required').isNumeric(),
  check('employmentDuration', 'Employment duration is required').notEmpty(),
  check('loanType', 'Loan type is required').isIn(['personal', 'business', 'mortgage', 'auto', 'education', 'emergency']),
  check('loanAmount', 'Loan amount is required').isNumeric(),
  check('loanPurpose', 'Loan purpose is required').notEmpty(),
  check('repaymentTerm', 'Repayment term is required').notEmpty(),
  check('preferredInterestRate', 'Interest rate is required').isNumeric(),
  check('monthlyExpenses', 'Monthly expenses is required').isNumeric()
];

const paymentVerificationValidation = [
  check('loanId', 'Loan ID is required').notEmpty(),
  check('paymentAmount', 'Payment amount is required').isNumeric(),
  check('paymentReference', 'Payment reference is required').notEmpty()
];

const loanStatusValidation = [
  check('status', 'Status is required').isIn(['approved', 'rejected', 'under_review']),
  check('approvedAmount', 'Approved amount is required when status is approved').optional().isNumeric(),
  check('approvedInterestRate', 'Approved interest rate is required when status is approved').optional().isNumeric(),
  check('approvedTerm', 'Approved term is required when status is approved').optional().isNumeric(),
  check('rejectionReason', 'Rejection reason is required when status is rejected').optional().notEmpty()
];

const disbursementValidation = [
  check('disbursementAmount', 'Disbursement amount is required').isNumeric(),
  check('disbursementMethod', 'Disbursement method is required').isIn(['bank_transfer', 'wallet', 'cash'])
];

// ==================== MEMBER ROUTES ====================

// Apply for a new loan
router.post('/apply', auth, loanApplicationValidation, applyForLoan);

// Get all loans for the authenticated member
router.get('/my-loans', auth, getMemberLoans);

// Get loans requiring payment (pending loans with unverified payments)
router.get('/my-loans/pending-payment', auth, getLoansRequiringPayment);

// Get specific loan application details
router.get('/:loanId', auth, getLoanApplication);

// Get payment details for a specific loan
router.get('/:loanId/payment-details', auth, getLoanPaymentDetails);

router.get('/:loanId/payment-instructions', auth, getLoanPaymentInstructions);

// Verify payment for a loan application
router.post('/verify-payment', auth, paymentVerificationValidation, verifyPayment);

// Cancel a pending loan application
router.delete('/:loanId/cancel', auth, cancelLoanApplication);

// ==================== ADMIN ROUTES ====================

// Get all loan applications (with filtering and pagination)
router.get('/admin/all', auth, getAllLoans);

// Update loan application status (approve/reject)
router.patch('/admin/:loanId/status', auth, loanStatusValidation, updateLoanStatus);

// Disburse an approved loan
router.post('/admin/:loanId/disburse', auth, disbursementValidation, disburseLoan);

// Get loan statistics and analytics
router.get('/admin/statistics', auth, getLoanStatistics);

module.exports = router;