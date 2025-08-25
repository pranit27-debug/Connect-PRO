/**
 * Sends a JSON response with a success status
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  const response = {
    success: true,
    message,
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends a JSON response with an error status
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} errors - Error details
 */
export const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(message);
  }

  return res.status(statusCode).json(response);
};

/**
 * Handles successful resource creation (201 Created)
 */
export const createdResponse = (res, message = 'Resource created successfully', data = null) => {
  return successResponse(res, 201, message, data);
};

/**
 * Handles no content response (204 No Content)
 */
export const noContentResponse = (res) => {
  return res.status(204).end();
};

/**
 * Handles bad request (400 Bad Request)
 */
export const badRequest = (res, message = 'Bad Request', errors = null) => {
  return errorResponse(res, 400, message, errors);
};

/**
 * Handles unauthorized access (401 Unauthorized)
 */
export const unauthorized = (res, message = 'Unauthorized') => {
  return errorResponse(res, 401, message);
};

/**
 * Handles forbidden access (403 Forbidden)
 */
export const forbidden = (res, message = 'Forbidden') => {
  return errorResponse(res, 403, message);
};

/**
 * Handles not found errors (404 Not Found)
 */
export const notFound = (res, message = 'Resource not found') => {
  return errorResponse(res, 404, message);
};

/**
 * Handles validation errors (422 Unprocessable Entity)
 */
export const validationError = (res, message = 'Validation failed', errors = null) => {
  return errorResponse(res, 422, message, errors);
};

/**
 * Handles too many requests (429 Too Many Requests)
 */
export const tooManyRequests = (res, message = 'Too many requests') => {
  return errorResponse(res, 429, message);
};

export default {
  successResponse,
  errorResponse,
  createdResponse,
  noContentResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  validationError,
  tooManyRequests,
};
