import { z } from 'zod';
import { logger } from '../core/logging';

/**
 * Schema for database configuration validation
 */
const DatabaseConfigSchema = z.object({
  host: z.string().min(1, "Database host is required"),
  port: z.number().int().positive("Database port must be a positive integer"),
  database: z.string().min(1, "Database name is required"),
  user: z.string().min(1, "Database user is required"),
  password: z.string().min(1, "Database password is required")
});

/**
 * Schema for OpenAI configuration validation
 */
const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1, "OpenAI API key is required"),
  model: z.string().min(1, "OpenAI model is required"),
  maxTokens: z.number().int().positive("Max tokens must be a positive integer"),
  temperature: z.number().min(0).max(1, "Temperature must be between 0 and 1")
});

/**
 * Schema for feature flags configuration validation
 */
const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  description: z.string().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  allowedUsers: z.array(z.string()).optional(),
  allowedGroups: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional()
});

/**
 * Schema for feature flags configuration validation
 */
const FeatureFlagsSchema = z.record(z.string(), FeatureFlagSchema);

/**
 * Schema for main configuration validation
 */
const ConfigSchema = z.object({
  environment: z.enum(['development', 'test', 'production']),
  database: DatabaseConfigSchema,
  port: z.number().int().positive("Port must be a positive integer"),
  openai: OpenAIConfigSchema,
  featureFlags: FeatureFlagsSchema.optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).optional().default('info')
});

/**
 * Validates the configuration object against the schema
 * @param config The configuration object to validate
 * @returns The validated configuration object
 * @throws Error if validation fails
 */
export function validateConfig(config: any): any {
  try {
    logger.info('Validating configuration...');
    const validatedConfig = ConfigSchema.parse(config);
    logger.info('Configuration validation successful');
    return validatedConfig;
  } catch (error: any) {
    logger.error('Configuration validation failed', { error });
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
}

/**
 * Validates that required environment variables are present
 * @param requiredVars Array of required environment variable names
 * @throws Error if any required environment variable is missing
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Validates a specific environment variable against a schema
 * @param varName The name of the environment variable
 * @param schema The Zod schema to validate against
 * @returns The validated value
 * @throws Error if validation fails
 */
export function validateEnvVar<T>(varName: string, schema: z.ZodType<T>): T {
  const value = process.env[varName];
  
  try {
    return schema.parse(value);
  } catch (error: any) {
    logger.error(`Environment variable ${varName} validation failed`, { error });
    throw new Error(`Environment variable ${varName} validation failed: ${error.message}`);
  }
}