import { BaseError } from './BaseError';
import { InternalServerError } from './ApiError';
import { logger } from '../logging/Logger';

/**
 * Central error handler class
 * Provides methods for handling operational and programming errors
 */
export class ErrorHandler {
  /**
   * Handle an error by determining if it's operational or not
   * @param error The error to handle
   */
  public static handleError(error: Error | BaseError): void {
    if (ErrorHandler.isOperationalError(error)) {
      ErrorHandler.handleOperationalError(error as BaseError);
    } else {
      ErrorHandler.handleProgrammerError(error);
    }
  }

  /**
   * Handle an operational error (expected error)
   * @param error The operational error to handle
   */
  private static handleOperationalError(error: BaseError): void {
    logger.warn({
      message: `Operational error: ${error.message}`,
      name: error.name,
      httpCode: error.httpCode,
      stack: error.stack,
      context: error.context
    });
  }

  /**
   * Handle a programmer error (unexpected error)
   * @param error The programmer error to handle
   */
  private static handleProgrammerError(error: Error): void {
    logger.error({
      message: `Programmer error: ${error.message}`,
      name: error.name,
      stack: error.stack
    });

    // For programmer errors, we might want to implement additional actions:
    // - Send to error monitoring service (e.g., Sentry)
    // - Restart the process in production (using process manager like PM2)
  }

  /**
   * Check if an error is operational (expected)
   * @param error The error to check
   * @returns True if the error is operational, false otherwise
   */
  public static isOperationalError(error: Error | BaseError): boolean {
    if (error instanceof BaseError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Convert any error to a BaseError
   * @param error The error to convert
   * @returns A BaseError instance
   */
  public static normalizeError(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new InternalServerError(error.message, { originalError: error.name });
    }
    
    return new InternalServerError('An unknown error occurred');
  }
}