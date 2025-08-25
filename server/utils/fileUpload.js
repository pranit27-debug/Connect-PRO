import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config/config.js';
import logger from './logger.js';
import ApiError from './ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage configuration
let storageEngine;
let s3Client;

// Initialize S3 client if configured
if (config.storage.provider === 's3') {
  s3Client = new S3Client({
    region: config.storage.s3.region,
    credentials: {
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
    },
  });
  
  storageEngine = {
    _handleFile: async (req, file, cb) => {
      try {
        const fileKey = generateFileKey(file.originalname);
        const params = {
          Bucket: config.storage.s3.bucketName,
          Key: fileKey,
          Body: file.stream || file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read',
          Metadata: {
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
          },
        };

        const command = new PutObjectCommand(params);
        await s3Client.send(command);
        
        cb(null, {
          key: fileKey,
          location: `https://${config.storage.s3.bucketName}.s3.${config.storage.s3.region}.amazonaws.com/${fileKey}`,
          bucket: config.storage.s3.bucketName,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });
      } catch (error) {
        logger.error('S3 upload error:', error);
        cb(new ApiError('Failed to upload file to S3', 500));
      }
    },
    _removeFile: async (req, file, cb) => {
      try {
        if (file.key) {
          const params = {
            Bucket: config.storage.s3.bucketName,
            Key: file.key,
          };
          const command = new DeleteObjectCommand(params);
          await s3Client.send(command);
        }
        cb();
      } catch (error) {
        logger.error('S3 delete error:', error);
        cb(error);
      }
    },
  };
} else {
  // Local file system storage
  const uploadDir = path.join(__dirname, '../../', config.storage.local.uploadDir);
  
  // Ensure upload directory exists
  const ensureUploadDir = async () => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        logger.error('Error creating upload directory:', error);
        throw new ApiError('Failed to initialize file storage', 500);
      }
    }
  };
  
  ensureUploadDir().catch(error => {
    logger.error('Failed to initialize upload directory:', error);
  });

  storageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
  });
}

// Generate a unique file key
const generateFileKey = (originalname) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const hash = createHash('md5').update(`${timestamp}-${randomString}`).digest('hex');
  const ext = path.extname(originalname).toLowerCase();
  return `${hash}${ext}`;
};

// File filter
const fileFilter = (allowedMimeTypes, maxFileSize) => (req, file, cb) => {
  // Check file type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new ApiError(
        `Unsupported file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        400
      )
    );
  }

  // Check file size
  if (file.size > maxFileSize) {
    return cb(
      new ApiError(
        `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`,
        400
      )
    );
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = allowedMimeTypes
    .map((mimeType) => mime.extension(mimeType))
    .filter(Boolean);

  if (!allowedExtensions.includes(ext.replace('.', ''))) {
    return cb(
      new ApiError(
        `Unsupported file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
        400
      )
    );
  }

  cb(null, true);
};

// Initialize multer upload
const createUploader = (options = {}) => {
  const {
    fieldName = 'file',
    allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize = 5 * 1024 * 1024, // 5MB
    maxCount = 1,
  } = options;

  const upload = multer({
    storage: storageEngine,
    limits: { fileSize: maxFileSize },
    fileFilter: fileFilter(allowedMimeTypes, maxFileSize),
  });

  if (maxCount > 1) {
    return upload.array(fieldName, maxCount);
  }
  return upload.single(fieldName);
};

// Middleware for handling file uploads
const uploadFile = (options = {}) => {
  const uploadMiddleware = createUploader({ ...options, maxCount: 1 });
  
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(`File too large. Maximum size is ${options.maxFileSize / (1024 * 1024)}MB`, 400));
          }
          if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(`Unexpected file field: ${error.field}`, 400));
          }
        }
        return next(error);
      }
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadFiles = (options = {}) => {
  const uploadMiddleware = createUploader({ ...options, maxCount: options.maxCount || 5 });
  
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error) {
        if (error instanceof multer.MulterError) {
          if (error.code === 'LIMIT_FILE_SIZE') {
            return next(new ApiError(`One or more files are too large. Maximum size is ${options.maxFileSize / (1024 * 1024)}MB`, 400));
          }
          if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return next(new ApiError(`Unexpected file field: ${error.field}`, 400));
          }
          if (error.code === 'LIMIT_FILE_COUNT') {
            return next(new ApiError(`Too many files. Maximum allowed: ${options.maxCount || 5}`, 400));
          }
        }
        return next(error);
      }
      next();
    });
  };
};

// Delete file helper
const deleteFile = async (fileKey) => {
  try {
    if (config.storage.provider === 's3') {
      const params = {
        Bucket: config.storage.s3.bucketName,
        Key: fileKey,
      };
      const command = new DeleteObjectCommand(params);
      await s3Client.send(command);
      return true;
    } else {
      const filePath = path.join(__dirname, '../../', config.storage.local.uploadDir, fileKey);
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        return true;
      } catch (error) {
        if (error.code === 'ENOENT') {
          logger.warn(`File not found: ${filePath}`);
          return false;
        }
        throw error;
      }
    }
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw new ApiError('Failed to delete file', 500);
  }
};

// Get file URL
const getFileUrl = async (fileKey, expiresIn = 3600) => {
  if (!fileKey) return null;
  
  if (config.storage.provider === 's3') {
    try {
      const command = new GetObjectCommand({
        Bucket: config.storage.s3.bucketName,
        Key: fileKey,
      });
      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Error generating S3 signed URL:', error);
      throw new ApiError('Failed to generate file URL', 500);
    }
  } else {
    // For local storage, return a direct URL
    return `${config.api.url}/uploads/${fileKey}`;
  }
};

// Generate a public URL (for S3 public access)
const getPublicUrl = (fileKey) => {
  if (!fileKey) return null;
  
  if (config.storage.provider === 's3') {
    return `https://${config.storage.s3.bucketName}.s3.${config.storage.s3.region}.amazonaws.com/${fileKey}`;
  } else {
    return `${config.api.url}/uploads/${fileKey}`;
  }
};

// Validate file before processing
const validateFile = (file, options = {}) => {
  const {
    allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSize = 5 * 1024 * 1024, // 5MB
  } = options;

  // Check if file exists
  if (!file) {
    throw new ApiError('No file provided', 400);
  }

  // Check file type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new ApiError(
      `Unsupported file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
      400
    );
  }

  // Check file size
  if (file.size > maxFileSize) {
    throw new ApiError(
      `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`,
      400
    );
  }

  return true;
};

export {
  uploadFile,
  uploadFiles,
  deleteFile,
  getFileUrl,
  getPublicUrl,
  validateFile,
};
