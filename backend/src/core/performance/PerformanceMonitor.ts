import { logger } from '../logging';

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
  operation: string;
  durationMs: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Performance monitor for tracking execution times and other metrics
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsCount: number = 1000;
  private slowQueryThreshold: number = 500; // 500ms
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  /**
   * Sets the slow query threshold
   * @param thresholdMs The threshold in milliseconds
   */
  public setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs;
  }
  
  /**
   * Records a performance metric
   * @param metric The performance metric to record
   */
  public recordMetric(metric: PerformanceMetrics): void {
    // Add the metric to the beginning of the array for faster access to recent metrics
    this.metrics.unshift(metric);
    
    // Trim the metrics array if it exceeds the maximum size
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(0, this.maxMetricsCount);
    }
    
    // Log slow queries
    if (metric.operation.includes('query') && metric.durationMs > this.slowQueryThreshold) {
      logger.warn(`Slow query detected: ${metric.operation} took ${metric.durationMs}ms`, {
        metric
      });
    }
  }
  
  /**
   * Gets all recorded metrics
   * @returns The recorded metrics
   */
  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Gets metrics for a specific operation
   * @param operation The operation name
   * @returns The metrics for the operation
   */
  public getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter(metric => metric.operation === operation);
  }
  
  /**
   * Gets the average duration for a specific operation
   * @param operation The operation name
   * @returns The average duration in milliseconds
   */
  public getAverageDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    
    if (operationMetrics.length === 0) {
      return 0;
    }
    
    const totalDuration = operationMetrics.reduce((sum, metric) => sum + metric.durationMs, 0);
    return totalDuration / operationMetrics.length;
  }
  
  /**
   * Gets the maximum duration for a specific operation
   * @param operation The operation name
   * @returns The maximum duration in milliseconds
   */
  public getMaxDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    
    if (operationMetrics.length === 0) {
      return 0;
    }
    
    return Math.max(...operationMetrics.map(metric => metric.durationMs));
  }
  
  /**
   * Gets the minimum duration for a specific operation
   * @param operation The operation name
   * @returns The minimum duration in milliseconds
   */
  public getMinDuration(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    
    if (operationMetrics.length === 0) {
      return 0;
    }
    
    return Math.min(...operationMetrics.map(metric => metric.durationMs));
  }
  
  /**
   * Gets the success rate for a specific operation
   * @param operation The operation name
   * @returns The success rate as a percentage
   */
  public getSuccessRate(operation: string): number {
    const operationMetrics = this.getMetricsForOperation(operation);
    
    if (operationMetrics.length === 0) {
      return 0;
    }
    
    const successCount = operationMetrics.filter(metric => metric.success).length;
    return (successCount / operationMetrics.length) * 100;
  }
  
  /**
   * Clears all recorded metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Measures the execution time of a function
   * @param operation The operation name
   * @param fn The function to measure
   * @param metadata Additional metadata to record
   * @returns The result of the function
   */
  public async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = await fn();
      success = true;
      return result;
    } finally {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      this.recordMetric({
        operation,
        durationMs,
        timestamp: Date.now(),
        success,
        metadata
      });
    }
  }
  
  /**
   * Measures the execution time of a synchronous function
   * @param operation The operation name
   * @param fn The function to measure
   * @param metadata Additional metadata to record
   * @returns The result of the function
   */
  public measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    let success = false;
    
    try {
      const result = fn();
      success = true;
      return result;
    } finally {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      this.recordMetric({
        operation,
        durationMs,
        timestamp: Date.now(),
        success,
        metadata
      });
    }
  }
  
  /**
   * Gets a summary of performance metrics
   * @returns A summary of performance metrics
   */
  public getSummary(): Record<string, any> {
    const operations = new Set(this.metrics.map(metric => metric.operation));
    const summary: Record<string, any> = {};
    
    operations.forEach(operation => {
      summary[operation] = {
        count: this.getMetricsForOperation(operation).length,
        avgDuration: this.getAverageDuration(operation),
        maxDuration: this.getMaxDuration(operation),
        minDuration: this.getMinDuration(operation),
        successRate: this.getSuccessRate(operation)
      };
    });
    
    return summary;
  }
  
  /**
   * Logs a summary of performance metrics
   */
  public logSummary(): void {
    const summary = this.getSummary();
    logger.info('Performance metrics summary', { summary });
  }
}

// Export a singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();