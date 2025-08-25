require('dotenv').config();
const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Client } = require('@elastic/elasticsearch');
const { MongoClient } = require('mongodb');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;

// Configuration
const config = {
  // Logging
  logsDir: path.join(__dirname, '..', 'logs'),
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Monitoring intervals (in milliseconds)
  systemStatsInterval: 60000, // 1 minute
  dbStatsInterval: 300000,    // 5 minutes
  apiMonitoringInterval: 60000, // 1 minute
  
  // Elasticsearch (optional)
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    index: 'connect-pro-monitoring',
    auth: process.env.ELASTICSEARCH_AUTH && {
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD,
    },
  },
  
  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-pro',
  
  // Alerts
  diskSpaceThreshold: 80, // Percentage
  memoryThreshold: 90,    // Percentage
  cpuThreshold: 80,      // Percentage
  
  // API monitoring
  apiEndpoints: [
    { name: 'API Health', url: '/api/health', method: 'GET' },
    { name: 'Auth Login', url: '/api/auth/login', method: 'POST' },
    { name: 'Get Feed', url: '/api/posts/feed', method: 'GET' },
  ],
};

// Ensure logs directory exists
if (!fs.existsSync(config.logsDir)) {
  fs.mkdirSync(config.logsDir, { recursive: true });
}

// Logger configuration
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata, null, 2)}`;
  }
  return msg;
});

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json(),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      ),
    }),
    new transports.File({
      filename: path.join(config.logsDir, 'monitor-error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: path.join(config.logsDir, 'monitor-combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Elasticsearch client (optional)
let esClient = null;
if (config.elasticsearch.node) {
  esClient = new Client({
    node: config.elasticsearch.node,
    auth: config.elasticsearch.auth,
  });
  
  // Test connection
  esClient.ping()
    .then(() => logger.info('Connected to Elasticsearch'))
    .catch(err => logger.error('Elasticsearch connection error:', err));
}

// MongoDB client
let mongoClient = null;
let db = null;

async function connectToMongo() {
  try {
    mongoClient = await MongoClient.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    db = mongoClient.db();
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

/**
 * Collect system statistics
 */
async function collectSystemStats() {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;
    
    const loadAvg = os.loadavg();
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu, i) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const usage = ((total - cpu.times.idle) / total) * 100;
      acc[`cpu_${i}`] = usage.toFixed(2);
      return acc;
    }, {});
    
    const stats = {
      timestamp: new Date(),
      type: 'system',
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: memUsage,
      },
      cpu: {
        load: loadAvg,
        usage: cpuUsage,
        cores: cpus.length,
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        uptime: os.uptime(),
      },
    };
    
    // Log to console and file
    logger.info('System stats collected', { memoryUsage: `${memUsage.toFixed(2)}%` });
    
    // Send to Elasticsearch if configured
    if (esClient) {
      try {
        await esClient.index({
          index: `${config.elasticsearch.index}-system-${new Date().toISOString().split('T')[0]}`,
          body: stats,
        });
      } catch (err) {
        logger.error('Error sending system stats to Elasticsearch:', err);
      }
    }
    
    // Check thresholds and alert if needed
    if (memUsage > config.memoryThreshold) {
      logger.warn(`High memory usage: ${memUsage.toFixed(2)}%`);
      // TODO: Send alert (email, Slack, etc.)
    }
    
    return stats;
  } catch (err) {
    logger.error('Error collecting system stats:', err);
  }
}

/**
 * Collect database statistics
 */
async function collectDbStats() {
  if (!db) return;
  
  try {
    const adminDb = db.admin();
    const serverStatus = await adminDb.serverStatus();
    const dbStats = await db.stats();
    
    const stats = {
      timestamp: new Date(),
      type: 'database',
      version: serverStatus.version,
      uptime: serverStatus.uptime,
      connections: serverStatus.connections,
      memory: serverStatus.mem,
      network: serverStatus.network,
      opcounters: serverStatus.opcounters,
      storage: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        fileSize: dbStats.fileSize,
      },
      collections: dbStats.collections,
      indexes: dbStats.indexes,
    };
    
    logger.info('Database stats collected', { 
      collections: stats.collections,
      storageSize: `${(stats.storage.storageSize / (1024 * 1024)).toFixed(2)} MB`,
    });
    
    // Send to Elasticsearch if configured
    if (esClient) {
      try {
        await esClient.index({
          index: `${config.elasticsearch.index}-database-${new Date().toISOString().split('T')[0]}`,
          body: stats,
        });
      } catch (err) {
        logger.error('Error sending database stats to Elasticsearch:', err);
      }
    }
    
    return stats;
  } catch (err) {
    logger.error('Error collecting database stats:', err);
  }
}

/**
 * Monitor API endpoints
 */
async function monitorApiEndpoints() {
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');
  
  for (const endpoint of config.apiEndpoints) {
    const url = new URL(endpoint.url, 'http://localhost:5000'); // Base URL from config
    const start = Date.now();
    let statusCode = 0;
    let error = null;
    
    try {
      const response = await new Promise((resolve, reject) => {
        const req = (url.protocol === 'https:' ? https : http).request({
          hostname: url.hostname || 'localhost',
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Connect-PRO-Monitor/1.0',
          },
          timeout: 10000, // 10 seconds
        }, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: data,
            });
          });
        });
        
        req.on('error', reject);
        req.end();
      });
      
      statusCode = response.statusCode;
      const responseTime = Date.now() - start;
      
      const stats = {
        timestamp: new Date(),
        type: 'api',
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        statusCode,
        responseTime,
        success: statusCode >= 200 && statusCode < 300,
      };
      
      logger.info(`API ${endpoint.name} (${endpoint.method} ${endpoint.url})`, { 
        statusCode,
        responseTime: `${responseTime}ms`,
      });
      
      // Send to Elasticsearch if configured
      if (esClient) {
        try {
          await esClient.index({
            index: `${config.elasticsearch.index}-api-${new Date().toISOString().split('T')[0]}`,
            body: stats,
          });
        } catch (err) {
          logger.error('Error sending API stats to Elasticsearch:', err);
        }
      }
      
      // Check for slow responses
      if (responseTime > 1000) { // 1 second
        logger.warn(`Slow API response: ${endpoint.name} (${responseTime}ms)`);
        // TODO: Send alert for slow response
      }
      
      // Check for errors
      if (statusCode >= 400) {
        logger.error(`API error: ${endpoint.name} returned ${statusCode}`);
        // TODO: Send alert for API error
      }
      
    } catch (err) {
      error = err.message;
      logger.error(`API monitor error for ${endpoint.name}:`, err);
      // TODO: Send alert for API monitoring error
    }
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace() {
  try {
    const diskInfo = await new Promise((resolve, reject) => {
      const cmd = process.platform === 'win32' 
        ? 'wmic logicaldisk get size,freespace,caption'
        : 'df -k';
      
      exec(cmd, (error, stdout) => {
        if (error) return reject(error);
        resolve(stdout);
      });
    });
    
    logger.info('Disk space check completed');
    
    // Parse disk info based on platform
    if (process.platform === 'win32') {
      // Parse Windows disk info
      const lines = diskInfo.split('\n')
        .filter(line => line.trim() && !line.startsWith('Caption'));
      
      for (const line of lines) {
        const [drive, , free, total] = line.trim().split(/\s+/);
        const freeGB = parseInt(free) / (1024 * 1024 * 1024);
        const totalGB = parseInt(total) / (1024 * 1024 * 1024);
        const usedGB = totalGB - freeGB;
        const usage = (usedGB / totalGB) * 100;
        
        logger.info(`Drive ${drive}: ${usage.toFixed(2)}% used (${usedGB.toFixed(2)}GB / ${totalGB.toFixed(2)}GB)`);
        
        if (usage > config.diskSpaceThreshold) {
          logger.warn(`High disk usage on ${drive}: ${usage.toFixed(2)}%`);
          // TODO: Send alert for high disk usage
        }
      }
    } else {
      // Parse Linux/Unix disk info
      const lines = diskInfo.split('\n')
        .filter(line => line.startsWith('/'));
      
      for (const line of lines) {
        const [filesystem, size, used, available, usePercent, mountedOn] = line.trim().split(/\s+/);
        const usage = parseInt(usePercent);
        
        logger.info(`Filesystem ${filesystem} (${mountedOn}): ${usage}% used`);
        
        if (usage > config.diskSpaceThreshold) {
          logger.warn(`High disk usage on ${mountedOn}: ${usage}%`);
          // TODO: Send alert for high disk usage
        }
      }
    }
  } catch (err) {
    logger.error('Error checking disk space:', err);
  }
}

/**
 * Initialize monitoring
 */
async function initMonitoring() {
  try {
    // Connect to MongoDB
    await connectToMongo();
    
    // Start monitoring intervals
    setInterval(collectSystemStats, config.systemStatsInterval);
    setInterval(collectDbStats, config.dbStatsInterval);
    setInterval(monitorApiEndpoints, config.apiMonitoringInterval);
    setInterval(checkDiskSpace, config.systemStatsInterval * 5); // Every 5 minutes
    
    // Initial collection
    await Promise.all([
      collectSystemStats(),
      collectDbStats(),
      monitorApiEndpoints(),
      checkDiskSpace(),
    ]);
    
    logger.info('Monitoring started');
  } catch (err) {
    logger.error('Error initializing monitoring:', err);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  logger.info('Shutting down monitor...');
  
  if (mongoClient) {
    await mongoClient.close();
    logger.info('MongoDB connection closed');
  }
  
  process.exit(0);
});

// Start monitoring
initMonitoring().catch(err => {
  logger.error('Fatal error in monitor:', err);
  process.exit(1);
});

module.exports = {
  collectSystemStats,
  collectDbStats,
  monitorApiEndpoints,
  checkDiskSpace,
};
