/**
 * Interface for cache options
 */
export interface CacheOptions {
  /**
   * Time-to-live in milliseconds
   * @default 300000 (5 minutes)
   */
  ttl?: number;
  
  /**
   * Maximum number of items to store in the cache
   * @default 1000
   */
  maxSize?: number;
}

/**
 * Interface for a cache entry
 * @template T The cached value type
 */
interface CacheEntry<T> {
  /**
   * The cached value
   */
  value: T;
  
  /**
   * The expiration timestamp
   */
  expiry: number;
}

/**
 * Cache manager for storing and retrieving cached data
 * @template K The key type
 * @template V The value type
 */
export class CacheManager<K, V> {
  private cache: Map<string, CacheEntry<V>> = new Map();
  private readonly ttl: number;
  private readonly maxSize: number;
  
  /**
   * Creates a new cache manager
   * @param options Cache options
   */
  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || 300000; // Default: 5 minutes
    this.maxSize = options.maxSize || 1000; // Default: 1000 items
  }
  
  /**
   * Gets a value from the cache
   * @param key The cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: K): V | undefined {
    const stringKey = this.getStringKey(key);
    const entry = this.cache.get(stringKey);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if the entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(stringKey);
      return undefined;
    }
    
    return entry.value;
  }
  
  /**
   * Sets a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Optional TTL override for this specific entry
   */
  set(key: K, value: V, ttl?: number): void {
    // Ensure we don't exceed the maximum cache size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const stringKey = this.getStringKey(key);
    const expiry = Date.now() + (ttl || this.ttl);
    
    this.cache.set(stringKey, { value, expiry });
  }
  
  /**
   * Checks if a key exists in the cache and is not expired
   * @param key The cache key
   * @returns True if the key exists and is not expired, false otherwise
   */
  has(key: K): boolean {
    const stringKey = this.getStringKey(key);
    const entry = this.cache.get(stringKey);
    
    if (!entry) {
      return false;
    }
    
    // Check if the entry has expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(stringKey);
      return false;
    }
    
    return true;
  }
  
  /**
   * Deletes a value from the cache
   * @param key The cache key
   * @returns True if the key was deleted, false otherwise
   */
  delete(key: K): boolean {
    const stringKey = this.getStringKey(key);
    return this.cache.delete(stringKey);
  }
  
  /**
   * Clears all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Gets a value from the cache or computes it if not found
   * @param key The cache key
   * @param factory A function that computes the value if not found in the cache
   * @param ttl Optional TTL override for this specific entry
   * @returns The cached or computed value
   */
  async getOrCompute(key: K, factory: () => Promise<V>, ttl?: number): Promise<V> {
    const cachedValue = this.get(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await factory();
    this.set(key, value, ttl);
    
    return value;
  }
  
  /**
   * Evicts the oldest entry from the cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < oldestExpiry) {
        oldestKey = key;
        oldestExpiry = entry.expiry;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Converts a key to a string
   * @param key The key to convert
   * @returns The string representation of the key
   */
  private getStringKey(key: K): string {
    if (typeof key === 'string') {
      return key;
    }
    
    if (typeof key === 'number' || typeof key === 'boolean') {
      return key.toString();
    }
    
    return JSON.stringify(key);
  }
}

/**
 * Global cache instances
 */
export const caches: Record<string, CacheManager<any, any>> = {
  players: new CacheManager<string, any>({ ttl: 3600000 }), // 1 hour TTL for players
  teams: new CacheManager<string, any>({ ttl: 3600000 }), // 1 hour TTL for teams
  plays: new CacheManager<string, any>({ ttl: 300000 }), // 5 minutes TTL for plays
  scores: new CacheManager<string, any>({ ttl: 300000 }), // 5 minutes TTL for scores
};