import { db } from '../../config/database';
import { logger } from '../logging';

/**
 * Database connection manager for monitoring and managing database connections
 */
export class ConnectionManager {
  private static instance: ConnectionManager;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly monitoringFrequency: number = 60000; // 1 minute

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Starts monitoring the connection pool
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.logPoolStats();
    }, this.monitoringFrequency);

    logger.info('Database connection pool monitoring started');
  }

  /**
   * Stops monitoring the connection pool
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring || !this.monitoringInterval) {
      return;
    }

    clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
    this.isMonitoring = false;

    logger.info('Database connection pool monitoring stopped');
  }

  /**
   * Logs the current pool statistics
   */
  public async logPoolStats(): Promise<void> {
    try {
      const pool = db.client.pool;
      
      if (!pool) {
        logger.warn('Database connection pool not available');
        return;
      }

      const stats = {
        name: db.client.config.client,
        min: pool.min,
        max: pool.max,
        free: pool.numFree(),
        used: pool.numUsed(),
        pending: pool.numPendingAcquires(),
        total: pool.numFree() + pool.numUsed() + pool.numPendingAcquires()
      };

      logger.info('Database connection pool stats', { stats });
    } catch (error) {
      logger.error('Error getting database connection pool stats', { error });
    }
  }

  /**
   * Destroys the connection pool
   * @returns A promise that resolves when the pool is destroyed
   */
  public async destroyPool(): Promise<void> {
    try {
      this.stopMonitoring();
      await db.destroy();
      logger.info('Database connection pool destroyed');
    } catch (error) {
      logger.error('Error destroying database connection pool', { error });
      throw error;
    }
  }

  /**
   * Checks if the database is connected
   * @returns A promise that resolves to true if connected, false otherwise
   */
  public async isConnected(): Promise<boolean> {
    try {
      await db.raw('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connection check failed', { error });
      return false;
    }
  }

  /**
   * Gets the current number of free connections
   * @returns The number of free connections or -1 if the pool is not available
   */
  public getFreeConnections(): number {
    try {
      const pool = db.client.pool;
      return pool ? pool.numFree() : -1;
    } catch (error) {
      logger.error('Error getting free connections', { error });
      return -1;
    }
  }

  /**
   * Gets the current number of used connections
   * @returns The number of used connections or -1 if the pool is not available
   */
  public getUsedConnections(): number {
    try {
      const pool = db.client.pool;
      return pool ? pool.numUsed() : -1;
    } catch (error) {
      logger.error('Error getting used connections', { error });
      return -1;
    }
  }
}

// Export a singleton instance
export const connectionManager = ConnectionManager.getInstance();