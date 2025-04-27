import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { BaseError } from './BaseError';
import { ErrorHandler } from './ErrorHandler';
import { logger } from '../logging/Logger';

/**
 * Express middleware for handling errors
 * This should be registered after all other middleware and routes
 */
export const errorMiddleware = (
  err: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Normalize the error to ensure it's a BaseError
  const normalizedError = ErrorHandler.normalizeError(err);
  
  // Handle the error using our central error handler
  ErrorHandler.handleError(normalizedError);
  
  // Log request details for context
  logger.debug({
    message: 'Request details for error',
    context: {
      method: req.method,
      path: req.path,
      params: req.params,
      query: req.query,
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'accept': req.headers['accept'],
      },
    }
  });
  
  // Send appropriate response to client
  res.status(normalizedError.httpCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'error',
    message: normalizedError.message,
    code: normalizedError.name,
    ...(process.env.NODE_ENV === 'development' && { stack: normalizedError.stack }),
  });
};

/**
 * Express middleware for handling 404 errors (routes not found)
 * This should be registered after all routes but before the error middleware
 */
export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new BaseError(
    'NOT_FOUND',
    StatusCodes.NOT_FOUND,
    `Route not found: ${req.method} ${req.originalUrl}`,
    true
  );
  
  next(error);
};

/**
 * Express middleware for handling uncaught exceptions and unhandled rejections
 * This sets up process-level handlers for errors that might otherwise crash the app
 */
export const setupErrorHandlers = (): void => {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error({
      message: 'Uncaught Exception',
      stack: error.stack,
    });
    
    // In production, we might want to gracefully restart the process
    // using a process manager like PM2
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    let error: Error;
    
    if (reason instanceof Error) {
      error = reason;
    } else {
      error = new Error(String(reason));
    }
    
    logger.error({
      message: 'Unhandled Promise Rejection',
      stack: error.stack,
    });
    
    // In production, we might want to gracefully restart the process
    // using a process manager like PM2
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
};