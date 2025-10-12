// server/services/logger.js
// Production-grade logging service using Winston
// Replaces console.log statements throughout the codebase

import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, '..', '..', 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

const environment = process.env.NODE_ENV || 'development';
const isProduction = environment === 'production';

// Custom format for development (colorized, readable)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Custom format for production (JSON, structured)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configure transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
    level: isProduction ? 'info' : 'debug'
  })
);

// File transports (production only)
if (isProduction) {
  // Error logs (errors only)
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: prodFormat
    })
  );

  // Combined logs (all levels)
  transports.push(
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      format: prodFormat
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports,
  // Don't exit on uncaught exceptions (let PM2 handle restarts)
  exitOnError: false
});

// Create context-aware child logger
export function createLogger(context) {
  return logger.child({ context });
}

// Export default logger
export default logger;

// Convenience methods for common use cases
export const log = {
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => logger.error(message, meta),
  
  // Specialized loggers
  fmp: (message, meta = {}) => logger.info(`[FMP] ${message}`, meta),
  cache: (message, meta = {}) => logger.debug(`[Cache] ${message}`, meta),
  database: (message, meta = {}) => logger.debug(`[Database] ${message}`, meta),
  sentry: (message, meta = {}) => logger.info(`[Sentry] ${message}`, meta),
  rateLimit: (message, meta = {}) => logger.warn(`[RateLimit] ${message}`, meta),
  ai: (message, meta = {}) => logger.info(`[AI] ${message}`, meta),
  batch: (message, meta = {}) => logger.info(`[Batch] ${message}`, meta)
};
