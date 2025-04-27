import { db } from '../../config/database';
import { BaseRepository } from './Repository';
import { DatabaseError } from '../../types/errors/GameErrors';

/**
 * Base Knex repository implementation
 * @template T The entity type
 * @template K The key type
 */
export abstract class KnexRepository<T, K> extends BaseRepository<T, K> {
  /**
   * Find an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to the entity or null if not found
   */
  async findById(id: K): Promise<T | null> {
    try {
      const result = await db(this.tableName)
        .where({ [this.primaryKey]: id })
        .first();
      
      return result || null;
    } catch (error) {
      throw new DatabaseError(`Error finding ${this.tableName} with ID ${String(id)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Find all entities
   * @returns A promise that resolves to an array of entities
   */
  async findAll(): Promise<T[]> {
    try {
      return await db(this.tableName).select('*');
    } catch (error) {
      throw new DatabaseError(`Error finding all ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Create a new entity
   * @param entity The entity to create
   * @returns A promise that resolves to the created entity
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    try {
      const [id] = await db(this.tableName).insert(entity);
      return this.findById(id as unknown as K) as Promise<T>;
    } catch (error) {
      throw new DatabaseError(`Error creating ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing entity
   * @param id The entity ID
   * @param entity The entity data to update
   * @returns A promise that resolves to the updated entity
   */
  async update(id: K, entity: Partial<T>): Promise<T> {
    try {
      await db(this.tableName)
        .where({ [this.primaryKey]: id })
        .update(entity);
      
      return this.findById(id) as Promise<T>;
    } catch (error) {
      throw new DatabaseError(`Error updating ${this.tableName} with ID ${String(id)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Delete an entity by its ID
   * @param id The entity ID
   * @returns A promise that resolves to true if the entity was deleted, false otherwise
   */
  async delete(id: K): Promise<boolean> {
    try {
      const result = await db(this.tableName)
        .where({ [this.primaryKey]: id })
        .delete();
      
      return result > 0;
    } catch (error) {
      throw new DatabaseError(`Error deleting ${this.tableName} with ID ${String(id)}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Find entities by a specific field value
   * @param field The field name
   * @param value The field value
   * @returns A promise that resolves to an array of entities
   */
  async findByField(field: string, value: any): Promise<T[]> {
    try {
      return await db(this.tableName)
        .where({ [field]: value })
        .select('*');
    } catch (error) {
      throw new DatabaseError(`Error finding ${this.tableName} with ${field} = ${value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Find a single entity by a specific field value
   * @param field The field name
   * @param value The field value
   * @returns A promise that resolves to the entity or null if not found
   */
  async findOneByField(field: string, value: any): Promise<T | null> {
    try {
      const result = await db(this.tableName)
        .where({ [field]: value })
        .first();
      
      return result || null;
    } catch (error) {
      throw new DatabaseError(`Error finding ${this.tableName} with ${field} = ${value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Execute a raw query
   * @param query The query function that takes a Knex query builder
   * @returns A promise that resolves to the query result
   */
  async query<R>(query: (qb: any) => any): Promise<R> {
    try {
      return await query(db(this.tableName));
    } catch (error) {
      throw new DatabaseError(`Error executing query on ${this.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}