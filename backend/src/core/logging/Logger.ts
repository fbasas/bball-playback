import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${
      info.context ? ` ${JSON.stringify(info.context)}` : ''
    }${info.stack ? `\n${info.stack}` : ''}`
  )
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.json()
);

// Define log directory
const logDir = process.env.LOG_DIR || 'logs';
const logPath = path.isAbsolute(logDir) ? logDir : path.join(process.cwd(), logDir);

// Create the logger instance
export const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logPath, 'error.log'),
      level: 'error',
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logPath, 'combined.log'),
    }),
  ],
  // Don't exit on uncaught errors
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Export a function to add context to logs
export const contextLogger = (context: Record<string, any>) => {
  return {
    error: (message: string, meta?: Record<string, any>) => 
      logger.error({ message, context: { ...context, ...meta } }),
    warn: (message: string, meta?: Record<string, any>) => 
      logger.warn({ message, context: { ...context, ...meta } }),
    info: (message: string, meta?: Record<string, any>) => 
      logger.info({ message, context: { ...context, ...meta } }),
    http: (message: string, meta?: Record<string, any>) => 
      logger.http({ message, context: { ...context, ...meta } }),
    debug: (message: string, meta?: Record<string, any>) => 
      logger.debug({ message, context: { ...context, ...meta } }),
  };
};