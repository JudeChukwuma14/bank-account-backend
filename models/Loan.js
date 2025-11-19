const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  // Member Reference
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },

  // Personal Information
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },

  // Employment Information
  employmentStatus: { type: String, required: true },
  employerName: { type: String, required: true },
  jobTitle: { type: String, required: true },
  monthlyIncome: { type: Number, required: true },
  employmentDuration: { type: String, required: true },

  // Loan Details
  loanType: {
    type: String,
    required: true,
    enum: ['personal', 'business', 'mortgage', 'auto', 'education', 'emergency']
  },
  loanAmount: { type: Number, required: true },
  loanPurpose: { type: String, required: true },
  repaymentTerm: { type: String, required: true }, // in months
  preferredInterestRate: { type: Number, required: true },

  // Financial Information
  monthlyExpenses: { type: Number, required: true },
  existingLoans: { type: Number, default: 0 },
  creditScore: { type: Number, default: 0 },

  // Collateral Information
  hasCollateral: { type: Boolean, default: false },
  collateralType: { type: String },
  collateralValue: { type: Number },
  collateralDescription: { type: String },

  // Payment Information (NEW FIELDS)
  upfrontPaymentRequired: { type: Number },
  upfrontPaymentPaid: { type: Number, default: 0 },
  paymentReference: { type: String },
  paymentVerified: { type: Boolean, default: false },
  paymentVerificationDate: { type: Date },

  // Application Status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'disbursed', 'closed'],
    default: 'pending'
  },
  applicationDate: { type: Date, default: Date.now },
  reviewDate: { type: Date },
  approvalDate: { type: Date },
  rejectionDate: { type: Date },
  rejectionReason: { type: String },

  // Loan Terms (Set upon approval)
  approvedAmount: { type: Number },
  approvedInterestRate: { type: Number },
  approvedTerm: { type: Number }, // in months
  monthlyPayment: { type: Number },
  totalPayment: { type: Number },
  totalInterest: { type: Number },

  // Disbursement Information
  disbursementDate: { type: Date },
  disbursementAmount: { type: Number },
  disbursementMethod: { type: String },

  // Additional Information
  additionalNotes: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicationScore: { type: Number }, // Risk score 1-100

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
loanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate upfront payment when loan is created
  if (this.isNew && this.loanAmount) {
    this.upfrontPaymentRequired = Math.round(this.loanAmount * 0.2);
  }
  
  next();
});

// Static method to calculate loan details
loanSchema.statics.calculateLoanDetails = function(principal, annualRate, months) {
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                        (Math.pow(1 + monthlyRate, months) - 1);
  const totalPayment = monthlyPayment * months;
  const totalInterest = totalPayment - principal;

  return {
    monthlyPayment: Math.round(monthlyPayment),
    totalPayment: Math.round(totalPayment),
    totalInterest: Math.round(totalInterest)
  };
};

// Method to check if member can apply for loan
loanSchema.statics.canMemberApply = async function(memberId) {
  const pendingLoans = await this.countDocuments({
    memberId,
    status: { $in: ['pending', 'under_review'] }
  });
  
  return pendingLoans < 3; // Max 3 pending applications
};

// Method to check if payment is required
loanSchema.methods.isPaymentRequired = function() {
  return this.status === 'pending' && !this.paymentVerified;
};

// Method to get required payment amount
loanSchema.methods.getRequiredPayment = function() {
  return this.upfrontPaymentRequired || Math.round(this.loanAmount * 0.2);
};

module.exports = mongoose.model('Loan', loanSchema);