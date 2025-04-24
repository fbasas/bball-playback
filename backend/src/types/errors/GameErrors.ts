/**
 * Custom error types for game-related operations
 */

/**
 * Base class for all game-related errors
 */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class ResourceNotFoundError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Error thrown when required input parameters are missing or invalid
 */
export class InvalidInputError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInputError';
  }
}

/**
 * Error thrown when there's an issue with the database
 */
export class DatabaseError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Error thrown when there's an issue with the lineup data
 */
export class LineupError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'LineupError';
  }
}

/**
 * Error thrown when there's an issue with event translation
 */
export class EventTranslationError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'EventTranslationError';
  }
}