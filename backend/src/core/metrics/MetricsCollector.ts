import { logger } from '../logging';
import { EventEmitter } from 'events';
import os from 'os';

/**
 * Interface for a metric value
 */
export interface MetricValue {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

/**
 * Interface for a metric definition
 */
export interface MetricDefinition {
  name: string;
  description: string;
  unit?: string;
  type: 'counter' | 'gauge' | 'histogram';
  tags?: string[];
}

/**
 * Metrics collector for tracking application metrics
 */
export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private metrics: Map<string, MetricValue[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private readonly maxMetricsPerType: number = 1000;
  private collectSystemMetricsInterval: NodeJS.Timeout | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    this.registerBaseMetrics();
  }
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }
  
  /**
   * Registers base system metrics
   */
  private registerBaseMetrics(): void {
    this.registerMetric({
      name: 'system.cpu_usage',
      description: 'CPU usage percentage',
      unit: 'percent',
      type: 'gauge',
      tags: ['core']
    });
    
    this.registerMetric({
      name: 'system.memory_usage',
      description: 'Memory usage',
      unit: 'bytes',
      type: 'gauge',
      tags: ['type']
    });
    
    this.registerMetric({
      name: 'system.load_average',
      description: 'System load average',
      type: 'gauge'
    });
    
    this.registerMetric({
      name: 'app.uptime',
      description: 'Application uptime',
      unit: 'seconds',
      type: 'gauge'
    });
    
    this.registerMetric({
      name: 'app.request_count',
      description: 'Total number of HTTP requests',
      type: 'counter',
      tags: ['method', 'path', 'status']
    });
    
    this.registerMetric({
      name: 'app.request_duration',
      description: 'HTTP request duration',
      unit: 'milliseconds',
      type: 'histogram',
      tags: ['method', 'path']
    });
    
    this.registerMetric({
      name: 'db.query_count',
      description: 'Total number of database queries',
      type: 'counter',
      tags: ['type', 'table']
    });
    
    this.registerMetric({
      name: 'db.query_duration',
      description: 'Database query duration',
      unit: 'milliseconds',
      type: 'histogram',
      tags: ['type', 'table']
    });
    
    this.registerMetric({
      name: 'db.connection_pool',
      description: 'Database connection pool stats',
      type: 'gauge',
      tags: ['state']
    });
    
    // Baseball-specific metrics
    this.registerMetric({
      name: 'baseball.game_count',
      description: 'Total number of baseball games',
      type: 'counter'
    });
    
    this.registerMetric({
      name: 'baseball.play_count',
      description: 'Total number of baseball plays',
      type: 'counter',
      tags: ['game_id', 'type']
    });
    
    this.registerMetric({
      name: 'baseball.commentary_generation_time',
      description: 'Time to generate commentary',
      unit: 'milliseconds',
      type: 'histogram',
      tags: ['game_id', 'provider']
    });
    
    this.registerMetric({
      name: 'baseball.substitution_count',
      description: 'Number of player substitutions',
      type: 'counter',
      tags: ['game_id', 'team']
    });
  }
  
  /**
   * Registers a new metric
   * @param definition The metric definition
   */
  public registerMetric(definition: MetricDefinition): void {
    if (this.definitions.has(definition.name)) {
      logger.warn(`Metric ${definition.name} already registered`);
      return;
    }
    
    this.definitions.set(definition.name, definition);
    this.metrics.set(definition.name, []);
    
    logger.debug(`Registered metric: ${definition.name}`, { definition });
  }
  
  /**
   * Records a metric value
   * @param metric The metric value to record
   */
  public recordMetric(metric: MetricValue): void {
    if (!this.definitions.has(metric.name)) {
      logger.warn(`Metric ${metric.name} not registered`);
      return;
    }
    
    const values = this.metrics.get(metric.name) || [];
    values.unshift({
      ...metric,
      timestamp: metric.timestamp || Date.now()
    });
    
    // Trim the metrics array if it exceeds the maximum size
    if (values.length > this.maxMetricsPerType) {
      values.length = this.maxMetricsPerType;
    }
    
    this.metrics.set(metric.name, values);
    
    // Emit an event for this metric
    this.emit('metric', metric);
    
    // Emit specific events for alerting
    this.emit(`metric.${metric.name}`, metric);
  }
  
  /**
   * Increments a counter metric
   * @param name The metric name
   * @param value The increment value (default: 1)
   * @param tags Optional tags
   */
  public incrementCounter(name: string, value: number = 1, tags?: Record<string, string>): void {
    const definition = this.definitions.get(name);
    
    if (!definition) {
      logger.warn(`Metric ${name} not registered`);
      return;
    }
    
    if (definition.type !== 'counter') {
      logger.warn(`Metric ${name} is not a counter`);
      return;
    }
    
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Sets a gauge metric
   * @param name The metric name
   * @param value The gauge value
   * @param tags Optional tags
   */
  public setGauge(name: string, value: number, tags?: Record<string, string>): void {
    const definition = this.definitions.get(name);
    
    if (!definition) {
      logger.warn(`Metric ${name} not registered`);
      return;
    }
    
    if (definition.type !== 'gauge') {
      logger.warn(`Metric ${name} is not a gauge`);
      return;
    }
    
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Records a histogram value
   * @param name The metric name
   * @param value The histogram value
   * @param tags Optional tags
   */
  public recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    const definition = this.definitions.get(name);
    
    if (!definition) {
      logger.warn(`Metric ${name} not registered`);
      return;
    }
    
    if (definition.type !== 'histogram') {
      logger.warn(`Metric ${name} is not a histogram`);
      return;
    }
    
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      tags
    });
  }
  
  /**
   * Gets all metric values for a specific metric
   * @param name The metric name
   * @returns The metric values
   */
  public getMetricValues(name: string): MetricValue[] {
    return [...(this.metrics.get(name) || [])];
  }
  
  /**
   * Gets all metric definitions
   * @returns The metric definitions
   */
  public getMetricDefinitions(): MetricDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  /**
   * Gets a specific metric definition
   * @param name The metric name
   * @returns The metric definition or undefined if not found
   */
  public getMetricDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }
  
  /**
   * Starts collecting system metrics
   * @param intervalMs The collection interval in milliseconds (default: 60000)
   */
  public startCollectingSystemMetrics(intervalMs: number = 60000): void {
    if (this.collectSystemMetricsInterval) {
      clearInterval(this.collectSystemMetricsInterval);
    }
    
    // Collect immediately
    this.collectSystemMetrics();
    
    // Then collect at the specified interval
    this.collectSystemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
    
    logger.info('System metrics collection started', { intervalMs });
  }
  
  /**
   * Stops collecting system metrics
   */
  public stopCollectingSystemMetrics(): void {
    if (this.collectSystemMetricsInterval) {
      clearInterval(this.collectSystemMetricsInterval);
      this.collectSystemMetricsInterval = null;
      logger.info('System metrics collection stopped');
    }
  }
  
  /**
   * Collects system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // CPU usage
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      
      // Calculate CPU usage for each core
      cpus.forEach((cpu, index) => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        const usage = 100 - (idle / total * 100);
        
        this.setGauge('system.cpu_usage', usage, { core: index.toString() });
      });
      
      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      this.setGauge('system.memory_usage', usedMemory, { type: 'used' });
      this.setGauge('system.memory_usage', freeMemory, { type: 'free' });
      this.setGauge('system.memory_usage', totalMemory, { type: 'total' });
      
      // Load average
      const loadAvg = os.loadavg();
      this.setGauge('system.load_average', loadAvg[0]); // 1 minute load average
      
      // App uptime
      this.setGauge('app.uptime', process.uptime());
      
      // Process memory usage
      const memoryUsage = process.memoryUsage();
      this.setGauge('system.memory_usage', memoryUsage.rss, { type: 'process_rss' });
      this.setGauge('system.memory_usage', memoryUsage.heapTotal, { type: 'process_heap_total' });
      this.setGauge('system.memory_usage', memoryUsage.heapUsed, { type: 'process_heap_used' });
      
    } catch (error) {
      logger.error('Error collecting system metrics', { error });
    }
  }
  
  /**
   * Gets a summary of all metrics
   * @returns A summary of all metrics
   */
  public getMetricsSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    this.definitions.forEach((definition, name) => {
      const values = this.getMetricValues(name);
      
      if (values.length === 0) {
        summary[name] = {
          description: definition.description,
          type: definition.type,
          unit: definition.unit,
          count: 0
        };
        return;
      }
      
      // Group by tags if present
      const tagGroups = new Map<string, MetricValue[]>();
      
      if (definition.tags && definition.tags.length > 0) {
        values.forEach(value => {
          if (!value.tags) {
            const key = 'no_tags';
            const group = tagGroups.get(key) || [];
            group.push(value);
            tagGroups.set(key, group);
            return;
          }
          
          // Create a key from the tags
          const key = definition.tags!
            .map(tag => `${tag}:${value.tags?.[tag] || 'unknown'}`)
            .join(',');
          
          const group = tagGroups.get(key) || [];
          group.push(value);
          tagGroups.set(key, group);
        });
        
        summary[name] = {
          description: definition.description,
          type: definition.type,
          unit: definition.unit,
          count: values.length,
          groups: {}
        };
        
        tagGroups.forEach((groupValues, key) => {
          summary[name].groups[key] = this.calculateMetricStats(groupValues, definition.type);
        });
      } else {
        summary[name] = {
          description: definition.description,
          type: definition.type,
          unit: definition.unit,
          count: values.length,
          ...this.calculateMetricStats(values, definition.type)
        };
      }
    });
    
    return summary;
  }
  
  /**
   * Calculates statistics for a set of metric values
   * @param values The metric values
   * @param type The metric type
   * @returns The calculated statistics
   */
  private calculateMetricStats(values: MetricValue[], type: string): Record<string, any> {
    if (values.length === 0) {
      return {};
    }
    
    const numericValues = values.map(v => v.value);
    
    const stats: Record<string, any> = {
      latest: numericValues[0],
      count: numericValues.length
    };
    
    if (type === 'counter') {
      stats.total = numericValues.reduce((sum, value) => sum + value, 0);
    }
    
    if (type === 'gauge' || type === 'histogram') {
      stats.min = Math.min(...numericValues);
      stats.max = Math.max(...numericValues);
      stats.avg = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
      
      // Calculate percentiles for histograms
      if (type === 'histogram' && numericValues.length > 1) {
        const sorted = [...numericValues].sort((a, b) => a - b);
        stats.p50 = this.calculatePercentile(sorted, 50);
        stats.p90 = this.calculatePercentile(sorted, 90);
        stats.p95 = this.calculatePercentile(sorted, 95);
        stats.p99 = this.calculatePercentile(sorted, 99);
      }
    }
    
    return stats;
  }
  
  /**
   * Calculates a percentile value from a sorted array
   * @param sorted The sorted array
   * @param percentile The percentile to calculate (0-100)
   * @returns The percentile value
   */
  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];
    
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (upper >= sorted.length) return sorted[lower];
    if (lower === upper) return sorted[lower];
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  /**
   * Clears all metrics
   */
  public clearMetrics(): void {
    this.metrics.forEach((_, key) => {
      this.metrics.set(key, []);
    });
    
    logger.info('All metrics cleared');
  }
}

// Export a singleton instance
export const metricsCollector = MetricsCollector.getInstance();