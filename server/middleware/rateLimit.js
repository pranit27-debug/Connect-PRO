const rateLimit = require('express-rate-limit');
const { tooManyRequestsResponse } = require('../utils/apiResponse');
const config = require('../config/config');

// Rate limiting middleware for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many login attempts, please try again later',
  handler: (req, res) => {
    tooManyRequestsResponse(res, 'Too many login attempts, please try again later');
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests, please try again later',
  handler: (req, res) => {
    tooManyRequestsResponse(res, 'Too many requests, please try again later');
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many file uploads, please try again later',
  handler: (req, res) => {
    tooManyRequestsResponse(res, 'Too many file uploads, please try again later');
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  uploadLimiter,
};
