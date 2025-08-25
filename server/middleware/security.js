import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import rateLimit from 'express-rate-limit';
import { rateLimit as redisRateLimit } from 'express-rate-limit';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createClient } from 'redis';
import config from '../config/config.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// Security middleware configuration
export const securityMiddleware = [
  // Set security HTTP headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://cdn.jsdelivr.net',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdnjs.cloudflare.com',
        ],
        fontSrc: [
          "'self'",
          'https://fonts.gstatic.com',
          'https://cdnjs.cloudflare.com',
          'data:',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com',
          'https://via.placeholder.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.cloudinary.com',
          'ws://localhost:*',
          'wss://*.herokuapp.com',
        ],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some CDNs
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow loading resources from other origins
  }),

  // Limit request size (body-parser is already included in Express)
  (req, res, next) => {
    // Limit to 10kb for JSON payloads
    if (req.is('application/json')) {
      const limit = '10kb';
      req.headers['content-length'] = limit;
    }
    next();
  },

  // Data sanitization against NoSQL query injection
  mongoSanitize({
    onSanitize: ({ req, key }) => {
      logger.warn(`NoSQL Injection attempt detected: ${key}`, {
        ip: req.ip,
        url: req.originalUrl,
        user: req.user?.id,
      });
    },
  }),

  // Data sanitization against XSS
  xss(),

  // Prevent parameter pollution
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
];

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://connect-pro.vercel.app',
      'https://www.connect-pro.vercel.app',
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg =
        'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }

    return callback(null, true);
  },
  credentials: true, // Allow cookies to be sent with requests
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  maxAge: 86400, // 24 hours
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable browser caching for sensitive routes
  if (req.path.startsWith('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature policy
  res.setHeader(
    'Feature-Policy',
    "geolocation 'none'; microphone 'none'; camera 'none'"
  );
  
  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  
  // Content Security Policy Report Only
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
  );
  
  next();
};

// Request validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(
      { ...req.body, ...req.params, ...req.query },
      { abortEarly: false }
    );

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/[\"]/g, ''),
      }));

      return next(new ApiError('Validation failed', 400, errors));
    }

    next();
  };
};

// Rate limiting for API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use IP + API key if available, otherwise just IP
    return req.apiKey ? `${req.apiKey}:${req.ip}` : req.ip;
  },
  handler: (req, res, next) => {
    next(
      new ApiError(
        'Too many requests, please try again later',
        429,
        {
          retryAfter: 15 * 60, // 15 minutes in seconds
        },
        false
      )
    );
  },
});

// Redis-based rate limiting for production
let redisClient;
let redisLimiter;

if (process.env.NODE_ENV === 'production') {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Too many Redis reconnection attempts');
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 50, 2000); // Exponential backoff
      },
    },
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error:', err);
  });

  redisLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rate_limit',
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
    blockDuration: 600, // block for 10 minutes if limit is reached
  });
}

export const redisRateLimiter = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  try {
    if (!redisClient.isReady) {
      await redisClient.connect();
    }

    const clientIp = req.ip || req.connection.remoteAddress;
    await redisLimiter.consume(clientIp);
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

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for API routes and non-modifying methods
  if (
    req.path.startsWith('/api/') ||
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  ) {
    return next();
  }

  // Check CSRF token for other routes
  const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!csrfToken || csrfToken !== req.csrfToken()) {
    return next(new ApiError('Invalid CSRF token', 403));
  }
  
  next();
};

// Request validation middleware for file uploads
export const validateFileUpload = (options = {}) => {
  const {
    fieldName = 'file',
    allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
    maxSize = 5 * 1024 * 1024, // 5MB
  } = options;

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
