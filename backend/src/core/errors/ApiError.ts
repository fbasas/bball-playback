import { StatusCodes } from 'http-status-codes';
import { BaseError } from './BaseError';

/**
 * API Error classes for different HTTP status codes
 * These errors are meant to be thrown in API routes and controllers
 */

export class BadRequestError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('BAD_REQUEST', StatusCodes.BAD_REQUEST, description, true, context);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('UNAUTHORIZED', StatusCodes.UNAUTHORIZED, description, true, context);
  }
}

export class ForbiddenError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('FORBIDDEN', StatusCodes.FORBIDDEN, description, true, context);
  }
}

export class NotFoundError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('NOT_FOUND', StatusCodes.NOT_FOUND, description, true, context);
  }
}

export class ConflictError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('CONFLICT', StatusCodes.CONFLICT, description, true, context);
  }
}

export class InternalServerError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('INTERNAL_SERVER', StatusCodes.INTERNAL_SERVER_ERROR, description, false, context);
  }
}

export class ServiceUnavailableError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('SERVICE_UNAVAILABLE', StatusCodes.SERVICE_UNAVAILABLE, description, true, context);
  }
}