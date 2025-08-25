import mongoose from 'mongoose';
import logger from '../utils/logger.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export const db = mongoose.connection;

db.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error}`);
});

db.once('open', () => {
  logger.info('Connected to MongoDB');
});

export default {
  connectDB,
  db,
};
