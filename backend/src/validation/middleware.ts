import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../core/errors';
import { logger, contextLogger } from '../core/logging';

/**
 * Middleware factory for validating request data against a Zod schema
 * 
 * @param schema The Zod schema to validate against
 * @param source Where to find the data to validate ('body', 'query', 'params', or 'headers')
 * @returns Express middleware function
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' | 'headers' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const routeLogger = contextLogger({ 
      middleware: 'validate',
      path: req.path
    });

    try {
      // Get the data to validate based on the source
      const data = req[source];
      
      // Validate the data against the schema
      await schema.parseAsync(data);
      
      routeLogger.debug('Validation successful', { source });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod error messages
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        routeLogger.warn('Validation failed', { 
          source, 
          errors: formattedErrors 
        });
        
        // Create a validation error with formatted messages
        const errorMessage = formattedErrors
          .map(err => `${err.path}: ${err.message}`)
          .join(', ');
        
        next(new ValidationError(errorMessage));
      } else {
        // Pass other errors to the error handler
        next(error);
      }
    }
  };
};

/**
 * Middleware for validating request body
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateBody = (schema: AnyZodObject) => validate(schema, 'body');

/**
 * Middleware for validating request query parameters
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateQuery = (schema: AnyZodObject) => validate(schema, 'query');

/**
 * Middleware for validating request path parameters
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateParams = (schema: AnyZodObject) => validate(schema, 'params');

/**
 * Middleware for validating request headers
 * 
 * @param schema The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateHeaders = (schema: AnyZodObject) => validate(schema, 'headers');