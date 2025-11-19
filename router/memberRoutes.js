const express = require('express');
const { logUploadAttempt, documentUpload, handleUploadErrors, validateRequiredDocuments, processUploadedFiles } = require('../middleware/upload');
const { registerValidation, RegisterMember, LoginMember, VerifyEmail, ResendVerificationCode, GetAccountBalance, GetProfile, UpdateProfile } = require('../controllers/memberController');
const auth = require('../middleware/auth');
const router = express.Router(); // Use Express Router, not the 'router' package


// Public routes
router.post('/register', 
    logUploadAttempt,           // Log the upload attempt
    documentUpload,            // Handle file uploads
    handleUploadErrors,        // Handle upload errors
    validateRequiredDocuments, // Validate required files
    processUploadedFiles,      // Process and add metadata
    registerValidation,        // Validate form data
    RegisterMember            // Process registration
);

router.post('/login', LoginMember);
router.post('/verify-email', VerifyEmail);
router.post('/resend-verification', ResendVerificationCode);

// Protected routes
router.get('/balance', auth, GetAccountBalance);
router.get('/profile', auth, GetProfile);
router.put('/profile', auth, UpdateProfile);

module.exports = router;