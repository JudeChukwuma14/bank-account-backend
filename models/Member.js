const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  
  // Address Information
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    country: { type: String, default: 'US', trim: true }
  },
  
  // Identification Documents
  birthCertificate: { type: String, required: true },
  passport: { type: String, required: true },
  ssn: { type: String, required: true, trim: true },
  driversLicense: { type: String, required: true },
  
  // Security & Authentication
  password: { type: String, required: true },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: true },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  
  // Account Information
  accountNumber: { type: String, unique: true, sparse: true },
  routingNumber: { type: String, default: '021000021' },
  accountStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'active', 'suspended', 'rejected', 'closed'],
    default: 'pending'
  },
  accountType: {
    type: String,
    enum: ['checking', 'savings', 'both'],
    default: 'checking'
  },
  
  // Payment Information
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentAmount: { type: Number, default: 5000 }, // ₦5,000
  paymentReference: { type: String, unique: true, sparse: true },
  paymentMethod: { type: String }, // 'opay', 'bank_transfer', etc.
  paymentDate: Date,
  transactionId: String,
  activationFeePaid: { type: Boolean, default: false },
  activatedAt: Date,
  
  // Financial Information
  openingDeposit: { type: Number, required: true, min: 25 },
  balance: {
    checking: { type: Number, default: 0 },
    savings: { type: Number, default: 0 }
  },
  
  // Additional Information
  occupation: { type: String, required: true },
  annualIncome: { type: Number, required: true },
  governmentId: { type: String, required: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  verifiedAt: Date,
  lastLogin: Date
});

// Method to check if account is locked
memberSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to generate account number
memberSchema.statics.generateAccountNumber = async function() {
  let accountNumber;
  let isUnique = false;
  
  while (!isUnique) {
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const existingMember = await this.findOne({ accountNumber });
    if (!existingMember) {
      isUnique = true;
    }
  }
  return accountNumber;
};

// Method to generate payment reference
memberSchema.methods.generatePaymentReference = function() {
  return `PAY-${this.accountNumber}-${Date.now()}`;
};

module.exports = mongoose.model('Member', memberSchema);