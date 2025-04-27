/**
 * Type utilities for working with Zod schemas
 */
import { z } from 'zod';

/**
 * Infer the TypeScript type from a Zod schema
 * This is a re-export of Zod's infer type for convenience
 */
export type Infer<T extends z.ZodType<any, any, any>> = z.infer<T>;

/**
 * Utility to create a runtime type checker function from a Zod schema
 * 
 * @param schema The Zod schema to create a checker for
 * @param errorHandler Optional function to handle validation errors
 * @returns A function that checks if data matches the schema
 */
export function createTypeChecker<T extends z.ZodType<any, any, any>>(
  schema: T,
  errorHandler?: (error: z.ZodError) => void
): (data: unknown) => data is z.infer<T> {
  return (data: unknown): data is z.infer<T> => {
    try {
      schema.parse(data);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError && errorHandler) {
        errorHandler(error);
      }
      return false;
    }
  };
}

/**
 * Utility to safely parse data with a Zod schema
 * Returns the parsed data or null if validation fails
 * 
 * @param schema The Zod schema to parse with
 * @param data The data to parse
 * @param errorHandler Optional function to handle validation errors
 * @returns The parsed data or null if validation fails
 */
export function safeParse<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown,
  errorHandler?: (error: z.ZodError) => void
): z.infer<T> | null {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError && errorHandler) {
      errorHandler(error);
    }
    return null;
  }
}

/**
 * Utility to create a partial schema from an existing schema
 * This is useful for update operations where only some fields may be provided
 * 
 * @param schema The Zod schema to make partial
 * @returns A new schema where all fields are optional
 */
export function makePartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Utility to create a schema that validates arrays of items
 * 
 * @param schema The Zod schema for array items
 * @returns A new schema that validates arrays of items
 */
export function makeArray<T extends z.ZodTypeAny>(schema: T) {
  return z.array(schema);
}