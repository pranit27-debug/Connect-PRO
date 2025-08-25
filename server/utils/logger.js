import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import { createHash } from 'crypto';
import { format as dateFnsFormat } from 'date-fns';
import fs from 'fs/promises';
import fsSync from 'fs';
import config from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { combine, timestamp, printf, colorize, align, json, metadata } = winston.format;

// Log directory setup
const logDir = path.join(__dirname, '../logs');

// Ensure log directory exists
const ensureLogDirExists = async () => {
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Error creating log directory:', error);
      process.exit(1);
    }
  }
};

// Create a hash of the current git commit for tracking
const getGitCommitHash = () => {
  try {
    const rev = fsSync.readFileSync('.git/HEAD').toString().trim().split(/.*[:\s]+/)[1];
    const hash = fsSync.readFileSync(`.git/${rev}`).toString().trim();
    return hash.substring(0, 7);
  } catch (error) {
    return 'unknown';
  }
};

// Request ID generation
const generateRequestId = (req) => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const ip = req?.ip || '0.0.0.0';
  const hash = createHash('md5').update(`${timestamp}${random}${ip}`).digest('hex').substring(0, 6);
  return `${timestamp}-${hash}`;
};

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  sql: 5,
  audit: 6,
};

// Custom colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  sql: 'cyan',
  audit: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    const stackTrace = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}${stackTrace}`;
  })
);

// Custom format for file output
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  json(),
  metadata()
);

// Create transports array based on environment
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: consoleFormat,
    level: config.env === 'development' ? 'debug' : 'info',
  }),
];

// File transports for production
if (config.env === 'production') {
  // Rotate error logs daily
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: fileFormat,
    })
  );

  // Rotate combined logs daily
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: fileFormat,
    })
  );

  // Audit log
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',
      level: 'audit',
      format: fileFormat,
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  level: config.logs.level || 'info',
  levels,
  defaultMeta: {
    service: 'connect-pro',
    env: config.env,
    nodeVersion: process.version,
    commitHash: getGitCommitHash(),
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Create a stream for morgan (HTTP request logging)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add request logging middleware
export const requestLogger = (req, res, next) => {
  const start = process.hrtime();
  const requestId = req.headers['x-request-id'] || generateRequestId(req);
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referer') || '',
  });
  
  // Log response when finished
  res.on('finish', () => {
    const durationInMs = process.hrtime(start)[1] / 1000000; // Convert to ms
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: durationInMs.toFixed(2) + 'ms',
      contentLength: res.get('content-length') || 0,
      user: req.user?.id || 'anonymous',
    };
    
    if (res.statusCode >= 400) {
      logger.error('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });
  
  next();
};

// Audit logging function
export const auditLog = (action, details = {}) => {
  logger.audit(action, {
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// SQL query logger
export const sqlLogger = (query, params = [], duration) => {
  logger.sql('SQL Query', {
    query,
    params,
    duration: `${duration}ms`,
  });
};

// Initialize logger
const initLogger = async () => {
  await ensureLogDirExists();
  
  logger.info('Logger initialized', {
    environment: config.env,
    logLevel: config.logs.level,
    nodeVersion: process.version,
    commitHash: getGitCommitHash(),
  });
  
  return logger;
};

// Initialize logger immediately
initLogger().catch((error) => {
  console.error('Failed to initialize logger:', error);
  process.exit(1);
});

export default logger;
