import { db } from '../../config/database';
import { logger } from '../logging';
import { performanceMonitor, PerformanceMetrics } from './PerformanceMonitor';

/**
 * Interface for query metrics
 */
export interface QueryMetrics extends PerformanceMetrics {
  query: string;
  params?: any[];
  rows?: number;
}

/**
 * Query monitor for tracking database query performance
 */
export class QueryMonitor {
  private static instance: QueryMonitor;
  private slowQueryThresholdMs: number = 500; // 500ms
  private logAllQueries: boolean = false;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): QueryMonitor {
    if (!QueryMonitor.instance) {
      QueryMonitor.instance = new QueryMonitor();
    }
    return QueryMonitor.instance;
  }
  
  /**
   * Sets the slow query threshold
   * @param thresholdMs The threshold in milliseconds
   */
  public setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThresholdMs = thresholdMs;
  }
  
  /**
   * Enables or disables logging of all queries
   * @param enable Whether to enable logging of all queries
   */
  public setLogAllQueries(enable: boolean): void {
    this.logAllQueries = enable;
  }
  
  /**
   * Executes a query with performance monitoring
   * @param query The SQL query
   * @param params The query parameters
   * @param operationName The operation name for metrics
   * @returns The query result
   */
  public async executeQuery<T>(
    query: string,
    params: any[] = [],
    operationName: string = 'database_query'
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    let rowCount = 0;
    
    try {
      const result = await db.raw(query, params);
      success = true;
      
      // For MySQL, the result is an array where the first element is the rows
      rowCount = Array.isArray(result[0]) ? result[0].length : 1;
      
      return result[0] as T;
    } catch (error) {
      logger.error('Query execution error', {
        query,
        params,
        error
      });
      throw error;
    } finally {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      const metric: QueryMetrics = {
        operation: operationName,
        durationMs,
        timestamp: Date.now(),
        success,
        query,
        params,
        rows: rowCount,
        metadata: {
          queryType: this.getQueryType(query)
        }
      };
      
      performanceMonitor.recordMetric(metric);
      
      // Log slow queries or all queries if enabled
      if (durationMs > this.slowQueryThresholdMs) {
        logger.warn(`Slow query detected: ${durationMs}ms`, {
          query,
          params,
          durationMs
        });
      } else if (this.logAllQueries) {
        logger.debug(`Query executed: ${durationMs}ms`, {
          query,
          params,
          durationMs
        });
      }
    }
  }
  
  /**
   * Executes a select query with performance monitoring
   * @param query The SQL query
   * @param params The query parameters
   * @returns The query result
   */
  public async select<T>(query: string, params: any[] = []): Promise<T[]> {
    return this.executeQuery<T[]>(query, params, 'database_select');
  }
  
  /**
   * Executes an insert query with performance monitoring
   * @param query The SQL query
   * @param params The query parameters
   * @returns The query result
   */
  public async insert<T>(query: string, params: any[] = []): Promise<T> {
    return this.executeQuery<T>(query, params, 'database_insert');
  }
  
  /**
   * Executes an update query with performance monitoring
   * @param query The SQL query
   * @param params The query parameters
   * @returns The query result
   */
  public async update<T>(query: string, params: any[] = []): Promise<T> {
    return this.executeQuery<T>(query, params, 'database_update');
  }
  
  /**
   * Executes a delete query with performance monitoring
   * @param query The SQL query
   * @param params The query parameters
   * @returns The query result
   */
  public async delete<T>(query: string, params: any[] = []): Promise<T> {
    return this.executeQuery<T>(query, params, 'database_delete');
  }
  
  /**
   * Gets the query type from the SQL query
   * @param query The SQL query
   * @returns The query type
   */
  private getQueryType(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    
    if (normalizedQuery.startsWith('select')) {
      return 'SELECT';
    } else if (normalizedQuery.startsWith('insert')) {
      return 'INSERT';
    } else if (normalizedQuery.startsWith('update')) {
      return 'UPDATE';
    } else if (normalizedQuery.startsWith('delete')) {
      return 'DELETE';
    } else {
      return 'OTHER';
    }
  }
  
  /**
   * Gets query metrics for a specific query type
   * @param queryType The query type (SELECT, INSERT, UPDATE, DELETE, OTHER)
   * @returns The query metrics
   */
  public getMetricsForQueryType(queryType: string): QueryMetrics[] {
    return performanceMonitor.getMetrics()
      .filter(metric => 
        metric.metadata && 
        metric.metadata.queryType === queryType.toUpperCase()
      ) as QueryMetrics[];
  }
  
  /**
   * Gets the average duration for a specific query type
   * @param queryType The query type (SELECT, INSERT, UPDATE, DELETE, OTHER)
   * @returns The average duration in milliseconds
   */
  public getAverageDurationForQueryType(queryType: string): number {
    const metrics = this.getMetricsForQueryType(queryType);
    
    if (metrics.length === 0) {
      return 0;
    }
    
    const totalDuration = metrics.reduce((sum, metric) => sum + metric.durationMs, 0);
    return totalDuration / metrics.length;
  }
  
  /**
   * Gets a summary of query metrics
   * @returns A summary of query metrics
   */
  public getQuerySummary(): Record<string, any> {
    const queryTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'OTHER'];
    const summary: Record<string, any> = {};
    
    queryTypes.forEach(queryType => {
      const metrics = this.getMetricsForQueryType(queryType);
      
      summary[queryType] = {
        count: metrics.length,
        avgDuration: this.getAverageDurationForQueryType(queryType),
        maxDuration: metrics.length > 0 ? Math.max(...metrics.map(m => m.durationMs)) : 0,
        minDuration: metrics.length > 0 ? Math.min(...metrics.map(m => m.durationMs)) : 0,
        totalDuration: metrics.reduce((sum, m) => sum + m.durationMs, 0),
        successRate: metrics.length > 0 
          ? (metrics.filter(m => m.success).length / metrics.length) * 100 
          : 0
      };
    });
    
    return summary;
  }
  
  /**
   * Logs a summary of query metrics
   */
  public logQuerySummary(): void {
    const summary = this.getQuerySummary();
    logger.info('Query metrics summary', { summary });
  }
}

// Export a singleton instance
export const queryMonitor = QueryMonitor.getInstance();