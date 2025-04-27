/**
 * Base error class for all application errors
 * Extends the built-in Error class with additional properties
 */
export class BaseError extends Error {
  public readonly name: string;
  public readonly httpCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    name: string,
    httpCode: number,
    description: string,
    isOperational: boolean,
    context?: Record<string, any>
  ) {
    super(description);
    
    this.name = name;
    this.httpCode = httpCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }
}