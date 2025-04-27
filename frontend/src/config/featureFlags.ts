/**
 * Feature flag configuration interface
 */
export interface FeatureFlag {
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
}

/**
 * Feature flags configuration interface
 */
export interface FeatureFlags {
  [key: string]: FeatureFlag;
}

/**
 * Feature flag service for managing feature flags
 */
export class FeatureFlagService {
  private flags: FeatureFlags;

  /**
   * Creates a new instance of the FeatureFlagService
   * @param flags The feature flags configuration
   */
  constructor(flags: FeatureFlags = {}) {
    this.flags = flags;
    console.info(`Feature flag service initialized with ${Object.keys(flags).length} flags`);
  }

  /**
   * Checks if a feature is enabled
   * @param featureName The name of the feature to check
   * @param userId Optional user ID for percentage-based rollouts
   * @returns True if the feature is enabled, false otherwise
   */
  public isEnabled(featureName: string, userId?: string): boolean {
    const flag = this.flags[featureName];

    // If the flag doesn't exist, it's disabled
    if (!flag) {
      return false;
    }

    // If the flag is explicitly disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check percentage-based rollout
    if (flag.rolloutPercentage !== undefined && userId) {
      // Generate a consistent hash for the user ID
      const hash = this.hashString(userId + featureName) % 100;
      return hash < flag.rolloutPercentage;
    }

    // Default to the enabled status
    return flag.enabled;
  }

  /**
   * Gets all feature flags
   * @returns All feature flags
   */
  public getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Simple string hash function for consistent percentage-based rollouts
   * @param str The string to hash
   * @returns A hash value between 0 and 2^32 - 1
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Create a singleton instance of the feature flag service
let featureFlagService: FeatureFlagService | null = null;

/**
 * Initializes the feature flag service with the provided flags
 * @param flags The feature flags configuration
 * @returns The feature flag service instance
 */
export function initializeFeatureFlags(flags: FeatureFlags): FeatureFlagService {
  featureFlagService = new FeatureFlagService(flags);
  return featureFlagService;
}

/**
 * Gets the feature flag service instance
 * @returns The feature flag service instance
 * @throws Error if the feature flag service has not been initialized
 */
export function getFeatureFlagService(): FeatureFlagService {
  if (!featureFlagService) {
    throw new Error('Feature flag service has not been initialized');
  }
  return featureFlagService;
}

/**
 * Checks if a feature is enabled
 * @param featureName The name of the feature to check
 * @param userId Optional user ID for percentage-based rollouts
 * @returns True if the feature is enabled, false otherwise
 * @throws Error if the feature flag service has not been initialized
 */
export function isFeatureEnabled(featureName: string, userId?: string): boolean {
  return getFeatureFlagService().isEnabled(featureName, userId);
}