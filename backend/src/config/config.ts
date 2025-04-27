import { getEnvironmentConfig, getEnvironment } from './environments';
import { validateConfig } from './validation';
import { initializeFeatureFlags } from './featureFlags';
import { initializeSecretManager, getRequiredSecret } from './secrets';
import { logger } from '../core/logging';

// Initialize the secret manager
initializeSecretManager({
  useEnvVars: true,
  secretsDir: process.env.SECRETS_DIR,
  useCache: true
});

// Get the environment configuration
const environmentConfig = getEnvironmentConfig();

// Validate the configuration
const validatedConfig = validateConfig(environmentConfig);

// Initialize feature flags
const featureFlagService = initializeFeatureFlags(validatedConfig.featureFlags || {});

// Log the current environment and configuration
logger.info('Application configuration loaded', {
  environment: validatedConfig.environment,
  featureFlags: Object.keys(validatedConfig.featureFlags || {})
});

// Export the validated configuration
export const config = validatedConfig;

// Export the current environment
export const environment = getEnvironment();

// Export a function to check if a feature is enabled
export function isFeatureEnabled(featureName: string, context?: { userId?: string; groups?: string[] }): boolean {
  return featureFlagService.isEnabled(featureName, context);
}

// Export a function to get all feature flags
export function getAllFeatureFlags() {
  return featureFlagService.getAllFlags();
}

// Export a function to update a feature flag
export function updateFeatureFlag(featureName: string, enabled: boolean, options?: Partial<{
  rolloutPercentage: number;
  allowedUsers: string[];
  allowedGroups: string[];
  expiresAt: Date;
}>) {
  const currentFlag = featureFlagService.getFlag(featureName) || { enabled: false };
  
  featureFlagService.updateFlag(featureName, {
    ...currentFlag,
    enabled,
    ...(options || {})
  });
  
  logger.info(`Feature flag "${featureName}" updated`, { enabled, options });
}

// Export a function to get a secret
export async function getSecret(key: string): Promise<string | undefined> {
  return getRequiredSecret(key);
}
