import { z } from 'zod';
import { logger } from '../core/logging';

/**
 * Feature flag configuration interface
 */
export interface FeatureFlag {
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedGroups?: string[];
  expiresAt?: Date;
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
    logger.info('Feature flag service initialized', {
      flagCount: Object.keys(flags).length,
      enabledFlags: Object.entries(flags)
        .filter(([_, flag]) => flag.enabled)
        .map(([key]) => key)
    });
  }

  /**
   * Checks if a feature is enabled
   * @param featureName The name of the feature to check
   * @param context Optional context for user-specific or percentage-based rollouts
   * @returns True if the feature is enabled, false otherwise
   */
  public isEnabled(featureName: string, context?: { userId?: string; groups?: string[] }): boolean {
    const flag = this.flags[featureName];

    // If the flag doesn't exist, it's disabled
    if (!flag) {
      logger.debug(`Feature flag "${featureName}" not found, defaulting to disabled`);
      return false;
    }

    // If the flag is explicitly disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // Check if the flag has expired
    if (flag.expiresAt && new Date() > flag.expiresAt) {
      logger.debug(`Feature flag "${featureName}" has expired`, {
        expiresAt: flag.expiresAt
      });
      return false;
    }

    // If there's no context, just return the enabled status
    if (!context) {
      return flag.enabled;
    }

    // Check if the user is in the allowed users list
    if (context.userId && flag.allowedUsers && flag.allowedUsers.length > 0) {
      if (flag.allowedUsers.includes(context.userId)) {
        return true;
      }
    }

    // Check if the user is in any of the allowed groups
    if (context.groups && flag.allowedGroups && flag.allowedGroups.length > 0) {
      if (context.groups.some(group => flag.allowedGroups!.includes(group))) {
        return true;
      }
    }

    // Check percentage-based rollout
    if (flag.rolloutPercentage !== undefined) {
      // Generate a consistent hash for the user ID or a random number
      const hash = context.userId 
        ? this.hashString(context.userId + featureName) % 100 
        : Math.floor(Math.random() * 100);
      
      return hash < flag.rolloutPercentage;
    }

    // Default to the enabled status
    return flag.enabled;
  }

  /**
   * Updates a feature flag
   * @param featureName The name of the feature to update
   * @param flag The new feature flag configuration
   */
  public updateFlag(featureName: string, flag: FeatureFlag): void {
    this.flags[featureName] = flag;
    logger.info(`Feature flag "${featureName}" updated`, { flag });
  }

  /**
   * Gets all feature flags
   * @returns All feature flags
   */
  public getAllFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Gets a specific feature flag
   * @param featureName The name of the feature to get
   * @returns The feature flag configuration or undefined if not found
   */
  public getFlag(featureName: string): FeatureFlag | undefined {
    return this.flags[featureName];
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
 * @param context Optional context for user-specific or percentage-based rollouts
 * @returns True if the feature is enabled, false otherwise
 * @throws Error if the feature flag service has not been initialized
 */
export function isFeatureEnabled(featureName: string, context?: { userId?: string; groups?: string[] }): boolean {
  return getFeatureFlagService().isEnabled(featureName, context);
}