import { StatusCodes } from 'http-status-codes';
import { BaseError } from './BaseError';

/**
 * Domain-specific error classes
 * These errors are meant to be thrown in domain services and business logic
 */

export class ValidationError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', StatusCodes.BAD_REQUEST, description, true, context);
  }
}

export class DatabaseError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('DATABASE_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, description, false, context);
  }
}

export class ExternalServiceError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('EXTERNAL_SERVICE_ERROR', StatusCodes.BAD_GATEWAY, description, false, context);
  }
}

// Game-specific errors
export class GameError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('GAME_ERROR', StatusCodes.BAD_REQUEST, description, true, context);
  }
}

export class LineupError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('LINEUP_ERROR', StatusCodes.BAD_REQUEST, description, true, context);
  }
}

export class EventTranslationError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('EVENT_TRANSLATION_ERROR', StatusCodes.INTERNAL_SERVER_ERROR, description, false, context);
  }
}

export class AIServiceError extends BaseError {
  constructor(description: string, context?: Record<string, any>) {
    super('AI_SERVICE_ERROR', StatusCodes.SERVICE_UNAVAILABLE, description, false, context);
  }
}