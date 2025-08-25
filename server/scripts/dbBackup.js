require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const config = require('../config/config');

// Ensure backups directory exists
const backupsDir = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Get MongoDB URI
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-pro';
const dbName = mongoUri.split('/').pop().split('?')[0];

/**
 * Backup the database
 * @param {string} outputPath - Path to save the backup (optional)
 */
const backupDatabase = (outputPath = null) => {
  const timestamp = moment().format('YYYY-MM-DD-HH-mm-ss');
  const backupFile = outputPath || path.join(backupsDir, `${dbName}-${timestamp}.gz`);
  
  console.log(`Starting backup of ${dbName} to ${backupFile}...`);
  
  const command = `mongodump --uri="${mongoUri}" --archive="${backupFile}" --gzip`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error during backup:', error);
      return;
    }
    
    if (stderr) {
      console.error('Backup stderr:', stderr);
    }
    
    console.log(`Backup completed successfully: ${backupFile}`);
    
    // Clean up old backups (keep last 7 days)
    cleanOldBackups(7);
  });
};

/**
 * Restore the database from a backup
 * @param {string} backupFile - Path to the backup file
 * @param {boolean} drop - Whether to drop the database before restore
 */
const restoreDatabase = (backupFile, drop = false) => {
  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    return;
  }
  
  console.log(`Starting restore of ${dbName} from ${backupFile}...`);
  
  const dropFlag = drop ? '--drop' : '';
  const command = `mongorestore --uri="${mongoUri}" --archive="${backupFile}" --gzip ${dropFlag}`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Error during restore:', error);
      return;
    }
    
    if (stderr) {
      console.error('Restore stderr:', stderr);
    }
    
    console.log('Restore completed successfully');
  });
};

/**
 * Clean up old backups
 * @param {number} daysToKeep - Number of days to keep backups
 */
const cleanOldBackups = (daysToKeep = 7) => {
  const files = fs.readdirSync(backupsDir);
  const now = moment();
  
  files.forEach(file => {
    if (file.endsWith('.gz')) {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = moment().diff(moment(stats.mtime), 'days');
      
      if (fileAge > daysToKeep) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old backup: ${file}`);
      }
    }
  });
};

/**
 * List all available backups
 */
const listBackups = () => {
  const files = fs.readdirSync(backupsDir);
  const backups = [];
  
  files.forEach(file => {
    if (file.endsWith('.gz')) {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      
      backups.push({
        name: file,
        path: filePath,
        size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
        modified: moment(stats.mtime).format('YYYY-MM-DD HH:mm:ss'),
      });
    }
  });
  
  return backups.sort((a, b) => new Date(b.modified) - new Date(a.modified));
};

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'backup':
    backupDatabase(args[1]);
    break;
    
  case 'restore':
    if (!args[1]) {
      console.error('Please provide a backup file to restore');
      process.exit(1);
    }
    restoreDatabase(args[1], args.includes('--drop'));
    break;
    
  case 'list':
    const backups = listBackups();
    console.log('\nAvailable backups:');
    console.table(backups);
    break;
    
  case 'clean':
    const days = parseInt(args[1]) || 7;
    console.log(`Cleaning up backups older than ${days} days...`);
    cleanOldBackups(days);
    break;
    
  default:
    console.log(`
Database Backup Utility
Usage:
  node dbBackup.js backup [outputPath] - Create a backup
  node dbBackup.js restore <backupFile> [--drop] - Restore from a backup
  node dbBackup.js list - List all available backups
  node dbBackup.js clean [days] - Clean up old backups
`);
    break;
}
