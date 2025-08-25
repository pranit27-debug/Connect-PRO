import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Middleware to validate request using express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    return next(new ApiError('Validation failed', 400, errorMessages));
  }
  
  next();
};

/**
 * Middleware to validate file uploads
 * @param {string} fieldName - Name of the file field
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 */
export const validateFileUpload = (fieldName, allowedTypes, maxSize) => {
  return (req, res, next) => {
    if (!req.files || !req.files[fieldName]) {
      return next(new ApiError(`No ${fieldName} file uploaded`, 400));
    }

    const file = req.files[fieldName];
    
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return next(
        new ApiError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
          400
        )
      );
    }

    // Check file size
    if (file.size > maxSize) {
      return next(
        new ApiError(
          `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`,
          400
        )
      );
    }

    next();
  };
};

/**
 * Middleware to validate pagination parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  
  if (page < 1 || limit < 1 || limit > 100) {
    return next(
      new ApiError('Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 100', 400)
    );
  }
  
  req.pagination = { page, limit };
  next();
};

/**
 * Middleware to validate sort parameters
 * @param {string[]} allowedFields - Array of allowed sort fields
 * @param {string} defaultSort - Default sort field and direction (e.g., '-createdAt')
 */
export const validateSort = (allowedFields, defaultSort = '-createdAt') => {
  return (req, res, next) => {
    let { sort } = req.query;
    
    if (!sort) {
      req.sort = defaultSort;
      return next();
    }
    
    // Remove any whitespace and split by comma
    const sortFields = sort.split(',').map(field => field.trim());
    
    const isValid = sortFields.every(field => {
      const sortField = field.startsWith('-') ? field.substring(1) : field;
      return allowedFields.includes(sortField);
    });
    
    if (!isValid) {
      return next(
        new ApiError(
          `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`,
          400
        )
      );
    }
    
    req.sort = sortFields.join(' ');
    next();
  };
};

/**
 * Middleware to validate filter parameters
 * @param {Object} allowedFilters - Object mapping filter names to validation functions
 */
export const validateFilters = (allowedFilters) => {
  return (req, res, next) => {
    const filters = {};
    const errors = [];
    
    Object.entries(req.query).forEach(([key, value]) => {
      if (key in allowedFilters) {
        try {
          const validatedValue = allowedFilters[key](value);
          if (validatedValue !== undefined) {
            filters[key] = validatedValue;
          }
        } catch (error) {
          errors.push({
            field: key,
            message: error.message
          });
        }
      }
    });
    
    if (errors.length > 0) {
      return next(new ApiError('Invalid filter parameters', 400, errors));
    }
    
    req.filters = filters;
    next();
  };
};

/**
 * Middleware to validate request body against a Joi schema
 * @param {Object} schema - Joi validation schema
 */
export const validateSchema = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true,
    });
    
    if (error) {
      const errorMessages = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return next(new ApiError('Validation failed', 400, errorMessages));
    }
    
    // Replace req.body with the validated value
    req.body = value;
    next();
  };
};
