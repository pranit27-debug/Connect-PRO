/**
 * Success response handler
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Error response handler
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Additional error details
 */
const errorResponse = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = Array.isArray(errors) ? errors : [errors];
  }

  // Log server errors
  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${statusCode} - ${message}`, errors || '');
  }

  res.status(statusCode).json(response);
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array|Object} errors - Validation errors
 * @param {string} message - Error message (default: 'Validation failed')
 */
const validationError = (res, errors, message = 'Validation failed') => {
  errorResponse(
    res,
    message,
    400,
    errors.array ? errors.array() : errors
  );
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Name of the resource not found
 */
const notFoundResponse = (res, resource = 'Resource') => {
  errorResponse(res, `${resource} not found`, 404);
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorizedResponse = (res, message = 'Unauthorized') => {
  errorResponse(res, message, 401);
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbiddenResponse = (res, message = 'Forbidden') => {
  errorResponse(res, message, 403);
};

/**
 * Bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} errors - Additional error details
 */
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  errorResponse(res, message, 400, errors);
};

/**
 * Conflict response (e.g., duplicate entry)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const conflictResponse = (res, message = 'Resource already exists') => {
  errorResponse(res, message, 409);
};

/**
 * Rate limit exceeded response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const tooManyRequestsResponse = (res, message = 'Too many requests, please try again later') => {
  errorResponse(res, message, 429);
};

module.exports = {
  successResponse,
  errorResponse,
  validationError,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  conflictResponse,
  tooManyRequestsResponse,
};
