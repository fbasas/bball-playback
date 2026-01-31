import { developmentConfig } from './development';
import { productionConfig } from './production';
import { testConfig } from './testing';

/**
 * Environment type
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Configuration for all environments
 */
export const environments = {
  development: developmentConfig,
  production: productionConfig,
  test: testConfig
};

/**
 * Gets the current environment
 * @returns The current environment
 */
export function getEnvironment(): Environment {
  const env = process.env.NODE_ENV as Environment || 'development';
  
  // Validate that it's one of our expected environments
  if (env === 'production' || env === 'development' || env === 'test') {
    return env;
  }
  
  // Default to development
  return 'development';
}

/**
 * Gets the configuration for the current environment
 * @returns The configuration for the current environment
 */
export function getEnvironmentConfig() {
  const env = getEnvironment();
  return environments[env];
}