/**
 * Base repository interface
 * @template T The entity type
 * @template K The key type
 */
export interface Repository<T, K> {
  /**
   * Find an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to the entity or null if not found
   */
  findById(id: K): Promise<T | null>;
  
  /**
   * Find all entities
   * @returns A promise that resolves to an array of entities
   */
  findAll(): Promise<T[]>;
  
  /**
   * Create a new entity
   * @param entity The entity to create
   * @returns A promise that resolves to the created entity
   */
  create(entity: Omit<T, 'id'>): Promise<T>;
  
  /**
   * Update an existing entity
   * @param id The entity ID
   * @param entity The entity data to update
   * @returns A promise that resolves to the updated entity
   */
  update(id: K, entity: Partial<T>): Promise<T>;
  
  /**
   * Delete an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to true if the entity was deleted, false otherwise
   */
  delete(id: K): Promise<boolean>;
}

/**
 * Base repository implementation
 * @template T The entity type
 * @template K The key type
 */
export abstract class BaseRepository<T, K> implements Repository<T, K> {
  /**
   * The table name
   */
  protected abstract tableName: string;
  
  /**
   * The primary key column name
   */
  protected abstract primaryKey: string;
  
  /**
   * Find an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to the entity or null if not found
   */
  abstract findById(id: K): Promise<T | null>;
  
  /**
   * Find all entities
   * @returns A promise that resolves to an array of entities
   */
  abstract findAll(): Promise<T[]>;
  
  /**
   * Create a new entity
   * @param entity The entity to create
   * @returns A promise that resolves to the created entity
   */
  abstract create(entity: Omit<T, 'id'>): Promise<T>;
  
  /**
   * Update an existing entity
   * @param id The entity ID
   * @param entity The entity data to update
   * @returns A promise that resolves to the updated entity
   */
  abstract update(id: K, entity: Partial<T>): Promise<T>;
  
  /**
   * Delete an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to true if the entity was deleted, false otherwise
   */
  abstract delete(id: K): Promise<boolean>;
}