const Member = require("../models/Member");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const { sendVerificationEmail } = require("../utils/emailService");
const { cloudinaryUtils } = require("../middleware/cloudinary");

// Validation rules
const registerValidation = [
    check("firstName", "First name is required").notEmpty().isLength({ min: 2 }),
    check("lastName", "Last name is required").notEmpty().isLength({ min: 2 }),
    check("email", "Please include a valid email").isEmail(),
    check("phone", "Phone number is required").notEmpty(),
    check("ssn", "SSN is required").isLength({ min: 9 }),
    check("password", "Password must be at least 6 characters").isLength({ min: 6 }),
    check("dateOfBirth", "Date of birth is required").isDate(),
    check("occupation", "Occupation is required").notEmpty(),
    check("annualIncome", "Annual income is required").isNumeric(),
    check("governmentId", "Government ID is required").notEmpty(),
    check("openingDeposit", "Opening deposit must be at least $25").isFloat({ min: 25 }),
    check("accountType", "Account type is required").isIn(['checking', 'savings', 'both']),
    check("address.street", "Street address is required").notEmpty(),
    check("address.city", "City is required").notEmpty(),
    check("address.state", "State is required").notEmpty(),
    check("address.zip", "Zip code is required").notEmpty(),
];

// Register Member
const RegisterMember = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.files) await cleanupUploadedFiles(req.files);
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            firstName, lastName, email, phone, ssn, password, address,
            dateOfBirth, occupation, annualIncome, governmentId,
            openingDeposit, accountType
        } = req.body;

        // Check if member exists
        let member = await Member.findOne({ $or: [{ email }, { ssn }] });
        if (member) {
            if (req.files) await cleanupUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: "Account already exists with this email or SSN"
            });
        }

        // Verify documents
        if (!req.files?.birthCertificate || !req.files?.driversLicense || !req.files?.passport) {
            if (req.files) await cleanupUploadedFiles(req.files);
            return res.status(400).json({
                success: false,
                message: 'All documents are required'
            });
        }

        try {
            const accountNumber = await Member.generateAccountNumber();
            const hashPassword = await bcryptjs.hash(password, 10);
            const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
            const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

            let addressData = address;
            if (typeof address === 'string') {
                addressData = JSON.parse(address);
            }

            const initialBalances = {
                checking: (accountType === 'checking' || accountType === 'both') ? openingDeposit : 0,
                savings: (accountType === 'savings' || accountType === 'both') ? openingDeposit : 0
            };

            member = new Member({
                firstName, lastName, email, phone, ssn,
                password: hashPassword, address: addressData,
                dateOfBirth: new Date(dateOfBirth), occupation, annualIncome,
                governmentId, openingDeposit, accountType, accountNumber,
                balance: initialBalances,
                birthCertificate: req.files.birthCertificate[0].path,
                passport: req.files.passport[0].path,
                driversLicense: req.files.driversLicense[0].path,
                verificationCode, verificationCodeExpires,
                accountStatus: 'verified' // Auto-verify after registration for payment
            });

            await member.save();
            await sendVerificationEmail(member, verificationCode);

            res.status(201).json({
                success: true,
                message: "Account registered successfully! Please verify your email and pay activation fee.",
                accountNumber: member.accountNumber,
                status: member.accountStatus,
                nextSteps: [
                    "Check your email for verification code",
                    "Verify your email address",
                    "Pay the ₦5,000 activation fee",
                    "Start using your account"
                ]
            });

        } catch (dbError) {
            await cleanupUploadedFiles(req.files);
            throw dbError;
        }

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};

// Login Member with payment check
// const LoginMember = async (req, res) => {
//     try {
//         const { email, password, verificationCode } = req.body;

//         if (!email || !password) {
//             return res.status(400).json({ 
//                 success: false,
//                 message: "Email and password are required" 
//             });
//         }

//         const member = await Member.findOne({ email }).select('+password');

//         if (!member) {
//             return res.status(400).json({ 
//                 success: false,
//                 message: "Invalid credentials" 
//             });
//         }

//         // Check if locked
//         if (member.isLocked()) {
//             return res.status(423).json({ 
//                 success: false,
//                 message: "Account is temporarily locked. Please try again later." 
//             });
//         }

//         // Check email verification
//         if (!member.isEmailVerified) {
//             return res.status(403).json({ 
//                 success: false,
//                 message: "Please verify your email address first.",
//                 requiresEmailVerification: true
//             });
//         }

//         // Check activation fee payment
//         if (!member.activationFeePaid) {
//             return res.status(403).json({ 
//                 success: false,
//                 message: "Please pay the activation fee to activate your account.",
//                 requiresPayment: true,
//                 accountNumber: member.accountNumber,
//                 activationFee: 5000
//             });
//         }

//         // Check account status
//         if (member.accountStatus !== 'active') {
//             return res.status(403).json({ 
//                 success: false,
//                 message: `Account is ${member.accountStatus}. Please contact support.` 
//             });
//         }

//         // Verify password
//         const isMatch = await bcryptjs.compare(password, member.password);
//         if (!isMatch) {
//             member.loginAttempts += 1;
//             if (member.loginAttempts >= 5) {
//                 member.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
//             }
//             await member.save();
//             return res.status(400).json({ 
//                 success: false,
//                 message: "Invalid credentials" 
//             });
//         }

//         // Handle 2FA
//         if (member.twoFactorEnabled && !verificationCode) {
//             const loginCode = Math.floor(100000 + Math.random() * 900000).toString();
//             member.verificationCode = loginCode;
//             member.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
//             await member.save();

//             const { sendLoginVerificationEmail } = require("../utils/emailService");
//             await sendLoginVerificationEmail(member, loginCode);

//             return res.status(206).json({ 
//                 success: true,
//                 requires2FA: true,
//                 message: "Verification code sent to your email" 
//             });
//         }

//         if (member.twoFactorEnabled && verificationCode) {
//             if (member.verificationCode !== verificationCode || member.verificationCodeExpires < new Date()) {
//                 return res.status(400).json({ 
//                     success: false,
//                     message: "Invalid or expired verification code" 
//                 });
//             }
//         }

//         // Successful login
//         member.loginAttempts = 0;
//         member.lockUntil = undefined;
//         member.verificationCode = undefined;
//         member.verificationCodeExpires = undefined;
//         member.lastLogin = new Date();
//         await member.save();

//         const payload = {
//             memberId: member._id,
//             accountNumber: member.accountNumber,
//             email: member.email
//         };

//         const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

//         res.status(200).json({ 
//             success: true,
//             token, 
//             member: {
//                 _id: member._id,
//                 firstName: member.firstName,
//                 lastName: member.lastName,
//                 email: member.email,
//                 accountNumber: member.accountNumber,
//                 accountStatus: member.accountStatus,
//                 accountType: member.accountType,
//                 balance: member.balance,
//                 lastLogin: member.lastLogin
//             },
//             message: "Login successful"
//         });
//     } catch (error) {
//         console.error('Login error:', error);
//         res.status(500).json({ 
//             success: false,
//             message: "Server error during login" 
//         });
//     }
// };

const LoginMember = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const member = await Member.findOne({ email }).select('+password');

        if (!member) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Check email verification
        if (!member.isEmailVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email address first.",
                requiresEmailVerification: true
            });
        }

        // Verify password
        const isMatch = await bcryptjs.compare(password, member.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // ✅ MODIFIED: Generate token even if payment is not completed
        const payload = {
            memberId: member._id,
            accountNumber: member.accountNumber,
            paymentRequired: !member.activationFeePaid // Add this flag
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

        // Different response based on payment status
        if (!member.activationFeePaid) {
            return res.status(200).json({
                success: true,
                token, // ✅ Now we get token even without payment
                requiresPayment: true,
                message: "Login successful. Payment required to activate account.",
                member: {
                    _id: member._id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                    accountNumber: member.accountNumber,
                    accountStatus: member.accountStatus,
                    activationFeePaid: member.activationFeePaid
                }
            });
        }

        // If payment is already completed
        res.status(200).json({
            success: true,
            token,
            member: {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                accountNumber: member.accountNumber,
                accountStatus: member.accountStatus,
                accountType: member.accountType,
                balance: member.balance
            },
            message: "Login successful"
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};

// Cleanup uploaded files
const cleanupUploadedFiles = async (files) => {
    try {
        const deletePromises = [];
        Object.values(files).forEach(fileArray => {
            fileArray.forEach(file => {
                const publicId = cloudinaryUtils.getPublicIdFromUrl(file.path);
                if (publicId) deletePromises.push(cloudinaryUtils.deleteFile(publicId));
            });
        });
        await Promise.allSettled(deletePromises);
    } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
    }
};

// controllers/memberController.js - Update VerifyEmail function
const VerifyEmail = async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ 
                success: false,
                message: "Request body is missing" 
            });
        }

        const { email, verificationCode } = req.body;

        if (!email || !verificationCode) {
            return res.status(400).json({ 
                success: false,
                message: "Email and verification code are required" 
            });
        }
        
        const member = await Member.findOne({ 
            email, 
            verificationCode,
            verificationCodeExpires: { $gt: Date.now() }
        });

        if (!member) {
            return res.status(400).json({ 
                success: false,
                message: "Invalid or expired verification code" 
            });
        }

        member.isEmailVerified = true;
        member.verificationCode = undefined;
        member.verificationCodeExpires = undefined;
        await member.save();

        // ✅ GENERATE TOKEN for payment access
        const payload = {
            memberId: member._id,
            accountNumber: member.accountNumber,
            email: member.email
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });

        res.json({ 
            success: true,
            message: "Email verified successfully! You can now proceed to payment.",
            accountStatus: member.accountStatus,
            accountNumber: member.accountNumber,
            token: token // ✅ Send token to frontend
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ 
            success: false,
            message: "Server error during email verification"
        });
    }
};

const GetAccountBalance = async (req, res) => {
    try {
        const member = await Member.findById(req.memberId);

        res.json({
            success: true,
            accountNumber: member.accountNumber,
            balance: member.balance,
            accountType: member.accountType,
            currency: 'USD'
        });
    } catch (error) {
        console.error('Balance fetch error:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching account balance"
        });
    }
};

const ResendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;

        const member = await Member.findOne({ email });
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        member.verificationCode = verificationCode;
        member.verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await member.save();
        await sendVerificationEmail(member, verificationCode);

        res.json({
            success: true,
            message: "Verification code sent successfully"
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: "Error resending verification code"
        });
    }
};


// Get member profile
const GetProfile = async (req, res) => {
    try {

        
        const member = await Member.findById(req.memberId)
            .select('-password -ssn -verificationCode -__v'); // Exclude sensitive fields

        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }


        
        res.json({
            success: true,
            profile: {
                _id: member._id,
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                phone: member.phone,
                dateOfBirth: member.dateOfBirth,
                accountNumber: member.accountNumber,
                accountStatus: member.accountStatus,
                accountType: member.accountType,
                address: member.address,
                occupation: member.occupation,
                annualIncome: member.annualIncome,
                balance: member.balance,
                isEmailVerified: member.isEmailVerified,
                isPhoneVerified: member.isPhoneVerified,
                activationFeePaid: member.activationFeePaid,
                paymentStatus: member.paymentStatus,
                createdAt: member.createdAt,
                lastLogin: member.lastLogin
            }
        });
    } catch (error) {
        console.error('❌ Get profile error:', error);
        res.status(500).json({
            success: false,
            message: "Error fetching profile"
        });
    }
};

// Update member profile
const UpdateProfile = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            phone,
            address,
            occupation,
            annualIncome
        } = req.body;

        const member = await Member.findById(req.memberId);
        
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found"
            });
        }

        // Update allowed fields only (no sensitive fields like email, ssn, etc.)
        const updateData = {};
        
        if (firstName && firstName !== member.firstName) {
            updateData.firstName = firstName;
        }
        
        if (lastName && lastName !== member.lastName) {
            updateData.lastName = lastName;
        }
        
        if (phone && phone !== member.phone) {
            updateData.phone = phone;
        }
        
        if (occupation && occupation !== member.occupation) {
            updateData.occupation = occupation;
        }
        
        if (annualIncome && annualIncome !== member.annualIncome) {
            updateData.annualIncome = annualIncome;
        }
        
        // Handle address update
        if (address) {
            let addressData = address;
            if (typeof address === 'string') {
                try {
                    addressData = JSON.parse(address);
                } catch (parseError) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid address format"
                    });
                }
            }
            
            updateData.address = {
                ...member.address,
                ...addressData
            };
        }

        // Check if there are any updates
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid fields to update"
            });
        }

        // Update member
        const updatedMember = await Member.findByIdAndUpdate(
            req.memberId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password -ssn -verificationCode -__v');

        res.json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                _id: updatedMember._id,
                firstName: updatedMember.firstName,
                lastName: updatedMember.lastName,
                email: updatedMember.email,
                phone: updatedMember.phone,
                address: updatedMember.address,
                occupation: updatedMember.occupation,
                annualIncome: updatedMember.annualIncome,
                accountNumber: updatedMember.accountNumber,
                accountStatus: updatedMember.accountStatus,
                accountType: updatedMember.accountType,
                balance: updatedMember.balance,
                isEmailVerified: updatedMember.isEmailVerified,
                activationFeePaid: updatedMember.activationFeePaid,
                lastLogin: updatedMember.lastLogin
            }
        });

    } catch (error) {
        console.error('❌ Update profile error:', error);
        
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: errors
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Error updating profile"
        });
    }
};

module.exports = {
    RegisterMember,
    LoginMember,
    VerifyEmail,
    GetAccountBalance,
    ResendVerificationCode,
    registerValidation,
    GetProfile,
    UpdateProfile
};