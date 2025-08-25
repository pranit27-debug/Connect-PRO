import rateLimit from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import ApiError from '../utils/ApiError.js';
import config from '../config/config.js';
import logger from '../utils/logger.js';

// Create Redis client for distributed rate limiting
let redisClient;
let rateLimiter;

// Initialize Redis client if in production
if (process.env.NODE_ENV === 'production') {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Too many Redis reconnection attempts');
          return new Error('Max reconnection attempts reached');
        }
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
        return Math.min(retries * 50, 2000);
      },
    },
  });

  // Handle Redis connection errors
  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  // Initialize Redis rate limiter
  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
    blockDuration: 600, // block for 10 minutes if limit is reached
  });
}

/**
 * Rate limiter middleware using Redis for distributed environments
 */
export const redisRateLimiter = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  try {
    if (!redisClient.isReady) {
      await redisClient.connect();
    }

    // Use IP address as the identifier
    const clientIp = req.ip || req.connection.remoteAddress;
    await rateLimiter.consume(clientIp);
    next();
  } catch (error) {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return next(
      new ApiError(
        'Too many requests, please try again later',
        429,
        {
          retryAfter: error.msBeforeNext / 1000,
          limit: error.remainingPoints,
          reset: new Date(Date.now() + error.msBeforeNext).toISOString(),
        }
      )
    );
  }
};

/**
 * API rate limiter middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests per window
 * @param {string} options.message - Error message
 * @param {boolean} options.standardHeaders - Return rate limit info in headers
 * @param {boolean} options.legacyHeaders - Enable legacy rate limit headers
 * @returns {Function} Express middleware
 */
export const apiLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
      // Skip rate limiting for certain paths or in development
      const skipPaths = ['/health', '/favicon.ico'];
      return (
        process.env.NODE_ENV === 'development' ||
        skipPaths.some((path) => req.path.startsWith(path))
      );
    },
    keyGenerator: (req) => {
      // Use IP + API key if available, otherwise just IP
      return req.apiKey ? `${req.apiKey}:${req.ip}` : req.ip;
    },
    ...options,
  };

  return rateLimit({
    ...defaultOptions,
    handler: (req, res, next) => {
      next(
        new ApiError(
          defaultOptions.message,
          429,
          {
            retryAfter: defaultOptions.windowMs / 1000,
          },
          false
        )
      );
    },
  });
};

/**
 * Authentication rate limiter
 * Limits login attempts to prevent brute force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true, // Only count failed login attempts
  keyGenerator: (req) => {
    // Use email + IP as key to prevent multiple users from being blocked
    const email = req.body.email || 'unknown';
    return `${email}:${req.ip}`;
  },
  handler: (req, res, next) => {
    next(
      new ApiError(
        'Too many login attempts, please try again later',
        429,
        {
          retryAfter: 15 * 60, // 15 minutes in seconds
        },
        false
      )
    );
  },
});

/**
 * Public API rate limiter (more lenient)
 */
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: 'Too many requests, please try again in an hour',
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many requests, please try again in an hour',
  keyGenerator: (req) => {
    // Use user ID + IP for stricter rate limiting
    return req.user ? `${req.user.id}:${req.ip}` : req.ip;
  },
});

/**
 * Dynamic rate limiter that adjusts based on request characteristics
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
export const dynamicRateLimiter = (options = {}) => {
  const defaultOptions = {
    // Default rate limits
    default: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
    },
    // Stricter limits for authenticated users
    authenticated: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500,
    },
    // Stricter limits for admin users
    admin: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000,
    },
    // Stricter limits for sensitive endpoints
    sensitive: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
    },
    ...options,
  };

  return (req, res, next) => {
    let limiterOptions = { ...defaultOptions.default };

    // Apply different limits based on user role
    if (req.user) {
      if (req.user.role === 'admin') {
        limiterOptions = { ...defaultOptions.admin };
      } else {
        limiterOptions = { ...defaultOptions.authenticated };
      }
    }

    // Apply stricter limits for sensitive endpoints
    const sensitiveEndpoints = ['/auth/register', '/auth/forgot-password'];
    if (sensitiveEndpoints.some((endpoint) => req.path.includes(endpoint))) {
      limiterOptions = { ...defaultOptions.sensitive };
    }

    // Create rate limiter with dynamic options
    return rateLimit({
      ...limiterOptions,
      keyGenerator: (req) => {
        // Use user ID + IP if authenticated, otherwise just IP
        return req.user ? `${req.user.id}:${req.ip}` : req.ip;
      },
      handler: (req, res, next) => {
        next(
          new ApiError(
            'Too many requests, please try again later',
            429,
            {
              retryAfter: limiterOptions.windowMs / 1000,
              limit: limiterOptions.max,
              reset: new Date(
                Date.now() + limiterOptions.windowMs
              ).toISOString(),
            },
            false
          )
        );
      },
    })(req, res, next);
  };
};
