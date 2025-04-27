import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/logging';

// Load environment variables from .env file
dotenv.config();

/**
 * Secret provider interface
 */
interface SecretProvider {
  getSecret(key: string): Promise<string | undefined>;
}

/**
 * Environment variable secret provider
 */
class EnvVarSecretProvider implements SecretProvider {
  /**
   * Gets a secret from environment variables
   * @param key The key of the secret
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    return process.env[key];
  }
}

/**
 * File-based secret provider
 */
class FileSecretProvider implements SecretProvider {
  private secretsDir: string;

  /**
   * Creates a new instance of the FileSecretProvider
   * @param secretsDir The directory containing secret files
   */
  constructor(secretsDir: string) {
    this.secretsDir = secretsDir;
  }

  /**
   * Gets a secret from a file
   * @param key The key of the secret (filename)
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    try {
      const filePath = path.join(this.secretsDir, key);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8').trim();
      }
      return undefined;
    } catch (error) {
      logger.error(`Error reading secret from file: ${key}`, { error });
      return undefined;
    }
  }
}

/**
 * In-memory cache for secrets
 */
class SecretCache {
  private cache: Map<string, string> = new Map();

  /**
   * Gets a secret from the cache
   * @param key The key of the secret
   * @returns The secret value or undefined if not found
   */
  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  /**
   * Sets a secret in the cache
   * @param key The key of the secret
   * @param value The secret value
   */
  set(key: string, value: string): void {
    this.cache.set(key, value);
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Secret manager for securely handling sensitive configuration values
 */
export class SecretManager {
  private providers: SecretProvider[] = [];
  private cache: SecretCache = new SecretCache();
  private useCache: boolean = true;

  /**
   * Creates a new instance of the SecretManager
   * @param options Options for the secret manager
   */
  constructor(options: {
    useEnvVars?: boolean;
    secretsDir?: string;
    useCache?: boolean;
  } = {}) {
    const { useEnvVars = true, secretsDir, useCache = true } = options;

    // Add environment variable provider
    if (useEnvVars) {
      this.providers.push(new EnvVarSecretProvider());
    }

    // Add file provider if secretsDir is provided
    if (secretsDir) {
      this.providers.push(new FileSecretProvider(secretsDir));
    }

    this.useCache = useCache;

    logger.info('Secret manager initialized', {
      providerCount: this.providers.length,
      useCache
    });
  }

  /**
   * Gets a secret
   * @param key The key of the secret
   * @returns The secret value or undefined if not found
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first if enabled
    if (this.useCache) {
      const cachedValue = this.cache.get(key);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
    }

    // Try each provider in order
    for (const provider of this.providers) {
      const value = await provider.getSecret(key);
      if (value !== undefined) {
        // Cache the value if caching is enabled
        if (this.useCache) {
          this.cache.set(key, value);
        }
        return value;
      }
    }

    // Secret not found
    logger.warn(`Secret not found: ${key}`);
    return undefined;
  }

  /**
   * Gets a required secret
   * @param key The key of the secret
   * @returns The secret value
   * @throws Error if the secret is not found
   */
  async getRequiredSecret(key: string): Promise<string> {
    const value = await this.getSecret(key);
    if (value === undefined) {
      throw new Error(`Required secret not found: ${key}`);
    }
    return value;
  }

  /**
   * Clears the secret cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Secret cache cleared');
  }
}

// Create a singleton instance of the secret manager
let secretManager: SecretManager | null = null;

/**
 * Initializes the secret manager with the provided options
 * @param options Options for the secret manager
 * @returns The secret manager instance
 */
export function initializeSecretManager(options: {
  useEnvVars?: boolean;
  secretsDir?: string;
  useCache?: boolean;
} = {}): SecretManager {
  secretManager = new SecretManager(options);
  return secretManager;
}

/**
 * Gets the secret manager instance
 * @returns The secret manager instance
 * @throws Error if the secret manager has not been initialized
 */
export function getSecretManager(): SecretManager {
  if (!secretManager) {
    throw new Error('Secret manager has not been initialized');
  }
  return secretManager;
}

/**
 * Gets a secret
 * @param key The key of the secret
 * @returns The secret value or undefined if not found
 * @throws Error if the secret manager has not been initialized
 */
export async function getSecret(key: string): Promise<string | undefined> {
  return getSecretManager().getSecret(key);
}

/**
 * Gets a required secret
 * @param key The key of the secret
 * @returns The secret value
 * @throws Error if the secret is not found or the secret manager has not been initialized
 */
export async function getRequiredSecret(key: string): Promise<string> {
  return getSecretManager().getRequiredSecret(key);
}