const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { errorResponse } = require('../utils/apiResponse');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', config.uploadsDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (config.allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type. Allowed types: ${config.allowedFileTypes.join(
          ', '
        )}`
      ),
      false
    );
  }
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: fileFilter,
});

// Middleware for handling single file upload
const uploadFile = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    uploadSingle(req, res, function (err) {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(
            res,
            `File too large. Maximum size is ${config.maxFileSize / (1024 * 1024)}MB`,
            400
          );
        }
        return errorResponse(res, err.message || 'Error uploading file', 400);
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadFiles = (fieldName, maxCount = 5) => {
  return (req, res, next) => {
    const uploadMultiple = upload.array(fieldName, maxCount);
    uploadMultiple(req, res, function (err) {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(
            res,
            `One or more files are too large. Maximum size is ${config.maxFileSize / (1024 * 1024)}MB per file`,
            400
          );
        }
        return errorResponse(res, err.message || 'Error uploading files', 400);
      }
      next();
    });
  };
};

// Delete file helper
const deleteFile = (filename) => {
  const filePath = path.join(uploadDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

// Get file URL
const getFileUrl = (filename) => {
  if (!filename) return null;
  return `${process.env.API_URL || 'http://localhost:5000'}/uploads/${filename}`;
};

// Clean up temporary files on error
const cleanupTempFiles = (req, res, next) => {
  // If there's an error and files were uploaded, delete them
  res.on('finish', () => {
    if (res.statusCode >= 400 && req.files) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
  });
  next();
};

module.exports = {
  upload,
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileUrl,
  cleanupTempFiles,
};
