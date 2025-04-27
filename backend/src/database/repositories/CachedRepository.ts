import { KnexRepository } from './KnexRepository';
import { CacheManager } from '../../core/caching/CacheManager';

/**
 * Base cached repository implementation
 * @template T The entity type
 * @template K The key type
 */
export abstract class CachedRepository<T, K> extends KnexRepository<T, K> {
  /**
   * The cache manager for single entities
   */
  protected abstract entityCache: CacheManager<K | string, T | null>;
  
  /**
   * The cache manager for entity collections
   */
  protected abstract collectionCache: CacheManager<string, T[]>;
  
  /**
   * The cache key prefix
   */
  protected abstract cacheKeyPrefix: string;
  
  /**
   * Find an entity by its ID with caching
   * @param id The entity ID
   * @returns A promise that resolves to the entity or null if not found
   */
  async findById(id: K): Promise<T | null> {
    const cacheKey = id;
    
    return this.entityCache.getOrCompute(cacheKey, async () => {
      return super.findById(id);
    });
  }
  
  /**
   * Find all entities with caching
   * @returns A promise that resolves to an array of entities
   */
  async findAll(): Promise<T[]> {
    const cacheKey = `${this.cacheKeyPrefix}:all`;
    
    return this.collectionCache.getOrCompute(cacheKey, async () => {
      return super.findAll();
    });
  }
  
  /**
   * Create a new entity and update cache
   * @param entity The entity to create
   * @returns A promise that resolves to the created entity
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    const result = await super.create(entity);
    
    // Update cache
    const id = result[this.primaryKey as keyof T] as unknown as K;
    this.entityCache.set(id, result);
    
    // Invalidate findAll cache
    this.collectionCache.delete(`${this.cacheKeyPrefix}:all`);
    
    return result;
  }
  
  /**
   * Update an existing entity and update cache
   * @param id The entity ID
   * @param entity The entity data to update
   * @returns A promise that resolves to the updated entity
   */
  async update(id: K, entity: Partial<T>): Promise<T> {
    const result = await super.update(id, entity);
    
    // Update cache
    this.entityCache.set(id, result);
    
    // Invalidate findAll cache
    this.collectionCache.delete(`${this.cacheKeyPrefix}:all`);
    
    return result;
  }
  
  /**
   * Delete an entity by its ID and update cache
   * @param id The entity ID
   * @returns A promise that resolves to true if the entity was deleted, false otherwise
   */
  async delete(id: K): Promise<boolean> {
    const result = await super.delete(id);
    
    // Update cache
    if (result) {
      this.entityCache.delete(id);
      
      // Invalidate findAll cache
      this.collectionCache.delete(`${this.cacheKeyPrefix}:all`);
    }
    
    return result;
  }
  
  /**
   * Find entities by a specific field value with caching
   * @param field The field name
   * @param value The field value
   * @returns A promise that resolves to an array of entities
   */
  async findByField(field: string, value: any): Promise<T[]> {
    const cacheKey = `${this.cacheKeyPrefix}:${field}:${value}`;
    
    return this.collectionCache.getOrCompute(cacheKey, async () => {
      return super.findByField(field, value);
    });
  }
  
  /**
   * Find a single entity by a specific field value with caching
   * @param field The field name
   * @param value The field value
   * @returns A promise that resolves to the entity or null if not found
   */
  async findOneByField(field: string, value: any): Promise<T | null> {
    const cacheKey = `${this.cacheKeyPrefix}:${field}:${value}:one`;
    
    return this.entityCache.getOrCompute(cacheKey, async () => {
      return super.findOneByField(field, value);
    });
  }
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.entityCache.clear();
    this.collectionCache.clear();
  }
}