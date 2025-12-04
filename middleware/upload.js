const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Check if CloudinaryStorage is available
if (!CloudinaryStorage) {
  throw new Error("CloudinaryStorage is not available. Check your multer-storage-cloudinary installation.");
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "banking_app/documents",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "gif"],
    resource_type: "auto",
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      // Use filename instead of email to avoid undefined issues
      const safeIdentifier = file.originalname.split('.')[0] || 'document';
      return `doc-${safeIdentifier}-${timestamp}-${randomString}`;
    },
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg", 
    "image/jpg", 
    "image/png", 
    "image/gif",
    "application/pdf"
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and PDF files are allowed`), false);
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10
  },
  fileFilter: fileFilter,
});

// Upload configurations
const documentUpload = upload.fields([
  { name: 'birthCertificate', maxCount: 1 },
  { name: 'passport', maxCount: 1 },
  { name: 'driversLicense', maxCount: 1 },
  { name: 'additionalDocuments', maxCount: 5 }
]);

const profileUpload = upload.single('profileImage');

// Error handling middleware
const handleUploadErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = 'File upload error';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Maximum size is 10MB per file.';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field.';
        break;
      default:
        message = `File upload error: ${error.message}`;
    }

    return res.status(400).json({
      success: false,
      message: message
    });
    
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
};

// Required documents validation
const validateRequiredDocuments = (req, res, next) => {
  const requiredFields = ['birthCertificate', 'passport', 'driversLicense'];
  const missingFields = [];
  
  if (!req.files) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded',
      requiredDocuments: requiredFields
    });
  }
  
  requiredFields.forEach(field => {
    if (!req.files[field] || req.files[field].length === 0) {
      missingFields.push(field);
    }
  });
  
  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Missing required documents: ${missingFields.join(', ')}`,
      missingDocuments: missingFields
    });
  }
  
  next();
};

// Process uploaded files
const processUploadedFiles = (req, res, next) => {
  if (req.files) {
    console.log('✅ Files uploaded successfully:', Object.keys(req.files));
  }
  next();
};

// Log upload attempt
const logUploadAttempt = (req, res, next) => {
  console.log('📁 Upload attempt received');
  next();
};

module.exports = {
  documentUpload,
  profileUpload,
  handleUploadErrors,
  validateRequiredDocuments,
  processUploadedFiles,
  logUploadAttempt
};