// const cloudinary = require('cloudinary').v2;

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// module.exports = cloudinary;

const cloudinary = require('cloudinary').v2;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Utility functions for Cloudinary
const cloudinaryUtils = {
  // Upload file to Cloudinary
  uploadFile: async (filePath, options = {}) => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'banking_app/documents',
        resource_type: 'auto',
        ...options
      });
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('File upload failed');
    }
  },

  // Delete file from Cloudinary
  deleteFile: async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('File deletion failed');
    }
  },

  // Extract public ID from Cloudinary URL
  getPublicIdFromUrl: (url) => {
    const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
    return matches ? matches[1] : null;
  }
};

module.exports = cloudinary;
module.exports.cloudinaryUtils = cloudinaryUtils;