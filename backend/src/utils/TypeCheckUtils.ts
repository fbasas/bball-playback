/**
 * Utilities for runtime type checking of external data
 */
import { z } from 'zod';
import { logger } from '../core/logging';
import { ValidationError } from '../core/errors';

/**
 * Validates external data against a Zod schema and returns the validated data
 * Throws a ValidationError if validation fails
 * 
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param source Description of the data source for error messages
 * @returns The validated and typed data
 */
export function validateExternalData<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown,
  source: string
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod error messages
      const formattedErrors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      // Log the validation error
      logger.warn(`Validation failed for ${source}`, { 
        errors: formattedErrors,
        data
      });
      
      // Create a validation error with formatted messages
      const errorMessage = `Invalid ${source} data: ` + formattedErrors
        .map(err => `${err.path}: ${err.message}`)
        .join(', ');
      
      throw new ValidationError(errorMessage);
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Safely validates external data against a Zod schema and returns the validated data or null
 * Does not throw errors, but logs validation failures
 * 
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param source Description of the data source for error messages
 * @returns The validated and typed data or null if validation fails
 */
export function safeValidateExternalData<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown,
  source: string
): z.infer<T> | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod error messages
      const formattedErrors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      // Log the validation error
      logger.warn(`Validation failed for ${source}`, { 
        errors: formattedErrors,
        data
      });
      
      return null;
    }
    
    // Log other errors
    logger.error(`Unexpected error validating ${source}`, { error });
    return null;
  }
}

/**
 * Type guard function to check if a value is not null or undefined
 * 
 * @param value The value to check
 * @returns True if the value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard function to check if a value is a string
 * 
 * @param value The value to check
 * @returns True if the value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard function to check if a value is a number
 * 
 * @param value The value to check
 * @returns True if the value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard function to check if a value is a boolean
 * 
 * @param value The value to check
 * @returns True if the value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard function to check if a value is an array
 * 
 * @param value The value to check
 * @returns True if the value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard function to check if a value is an object
 * 
 * @param value The value to check
 * @returns True if the value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}