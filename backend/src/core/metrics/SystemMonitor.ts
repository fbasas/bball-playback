import os from 'os';
import { logger } from '../logging';
import { metricsCollector } from './MetricsCollector';
import { db } from '../../config/database';
import { connectionManager } from '../database';

/**
 * System monitor for tracking system-level metrics
 */
export class SystemMonitor {
  private static instance: SystemMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly defaultInterval: number = 60000; // 1 minute
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }
  
  /**
   * Starts monitoring system metrics
   * @param intervalMs The monitoring interval in milliseconds (default: 60000)
   */
  public startMonitoring(intervalMs: number = this.defaultInterval): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Collect metrics immediately
    this.collectSystemMetrics();
    this.collectDatabaseMetrics();
    this.collectApplicationMetrics();
    
    // Then collect at the specified interval
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.collectDatabaseMetrics();
      this.collectApplicationMetrics();
    }, intervalMs);
    
    logger.info('System monitoring started', { intervalMs });
  }
  
  /**
   * Stops monitoring system metrics
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('System monitoring stopped');
    }
  }
  
  /**
   * Collects system metrics
   */
  private collectSystemMetrics(): void {
    try {
      // CPU metrics
      const cpus = os.cpus();
      const cpuCount = cpus.length;
      
      // Calculate overall CPU usage
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        const times = cpu.times;
        const idle = times.idle;
        const total = times.user + times.nice + times.sys + times.idle + times.irq;
        
        totalIdle += idle;
        totalTick += total;
      });
      
      const idlePercent = totalIdle / totalTick;
      const usagePercent = 100 - (idlePercent * 100);
      
      metricsCollector.setGauge('system.cpu_usage', usagePercent, { type: 'overall' });
      
      // Memory metrics
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      metricsCollector.setGauge('system.memory_usage', usedMemory, { type: 'used' });
      metricsCollector.setGauge('system.memory_usage', freeMemory, { type: 'free' });
      metricsCollector.setGauge('system.memory_usage', totalMemory, { type: 'total' });
      metricsCollector.setGauge('system.memory_usage_percent', memoryUsagePercent);
      
      // Load average
      const loadAvg = os.loadavg();
      metricsCollector.setGauge('system.load_average', loadAvg[0], { period: '1m' });
      metricsCollector.setGauge('system.load_average', loadAvg[1], { period: '5m' });
      metricsCollector.setGauge('system.load_average', loadAvg[2], { period: '15m' });
      
      // Network interfaces
      const networkInterfaces = os.networkInterfaces();
      let totalRx = 0;
      let totalTx = 0;
      
      Object.entries(networkInterfaces).forEach(([name, interfaces]) => {
        if (interfaces) {
          interfaces.forEach(iface => {
            if (!iface.internal) {
              // Note: We can't get actual network traffic from Node.js directly
              // This would require additional monitoring tools or OS-specific commands
              metricsCollector.setGauge('system.network_interface', 1, { 
                name, 
                family: iface.family,
                address: iface.address
              });
            }
          });
        }
      });
      
      // Disk space (not directly available in Node.js)
      // Would require additional modules or OS-specific commands
      
      // Process metrics
      const memoryUsage = process.memoryUsage();
      metricsCollector.setGauge('process.memory_usage', memoryUsage.rss, { type: 'rss' });
      metricsCollector.setGauge('process.memory_usage', memoryUsage.heapTotal, { type: 'heap_total' });
      metricsCollector.setGauge('process.memory_usage', memoryUsage.heapUsed, { type: 'heap_used' });
      metricsCollector.setGauge('process.memory_usage', memoryUsage.external, { type: 'external' });
      
      // Process uptime
      metricsCollector.setGauge('process.uptime', process.uptime());
      
      // Event loop lag (approximation)
      const start = process.hrtime();
      setImmediate(() => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const lagMs = (seconds * 1000) + (nanoseconds / 1000000);
        metricsCollector.setGauge('process.event_loop_lag', lagMs);
      });
      
    } catch (error) {
      logger.error('Error collecting system metrics', { error });
    }
  }
  
  /**
   * Collects database metrics
   */
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      // Database connection pool metrics
      const freeConnections = connectionManager.getFreeConnections();
      const usedConnections = connectionManager.getUsedConnections();
      
      if (freeConnections >= 0 && usedConnections >= 0) {
        const totalConnections = freeConnections + usedConnections;
        
        metricsCollector.setGauge('db.connection_pool', freeConnections, { state: 'free' });
        metricsCollector.setGauge('db.connection_pool', usedConnections, { state: 'used' });
        metricsCollector.setGauge('db.connection_pool', totalConnections, { state: 'total' });
        
        // Connection utilization percentage
        if (totalConnections > 0) {
          const utilizationPercent = (usedConnections / totalConnections) * 100;
          metricsCollector.setGauge('db.connection_pool_utilization', utilizationPercent);
        }
      }
      
      // Database health check
      try {
        const startTime = performance.now();
        await db.raw('SELECT 1');
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        metricsCollector.setGauge('db.health_check', 1, { status: 'up' });
        metricsCollector.recordHistogram('db.health_check_response_time', responseTime);
      } catch (error) {
        metricsCollector.setGauge('db.health_check', 0, { status: 'down' });
        logger.error('Database health check failed', { error });
      }
      
      // Database size metrics (would require specific queries for your database)
      // This is an example for MySQL
      try {
        const dbName = db.client.config.connection.database;
        if (dbName) {
          const result = await db.raw(`
            SELECT 
              table_schema as 'database',
              table_name as 'table',
              round(((data_length + index_length) / 1024 / 1024), 2) as 'size_mb'
            FROM information_schema.TABLES 
            WHERE table_schema = ?
            ORDER BY size_mb DESC
          `, [dbName]);
          
          if (result && result[0]) {
            let totalSizeMb = 0;
            
            result[0].forEach((row: any) => {
              const tableName = row.table;
              const sizeMb = parseFloat(row.size_mb);
              
              metricsCollector.setGauge('db.table_size', sizeMb, { 
                database: dbName,
                table: tableName
              });
              
              totalSizeMb += sizeMb;
            });
            
            metricsCollector.setGauge('db.total_size', totalSizeMb, { database: dbName });
          }
        }
      } catch (error) {
        logger.error('Error collecting database size metrics', { error });
      }
      
    } catch (error) {
      logger.error('Error collecting database metrics', { error });
    }
  }
  
  /**
   * Collects application-specific metrics
   */
  private async collectApplicationMetrics(): Promise<void> {
    try {
      // Baseball-specific metrics
      try {
        // Count of games
        const gameCountResult = await db.raw(`
          SELECT COUNT(*) as count FROM games
        `);
        
        if (gameCountResult && gameCountResult[0] && gameCountResult[0][0]) {
          const gameCount = parseInt(gameCountResult[0][0].count);
          metricsCollector.setGauge('baseball.game_count', gameCount);
        }
        
        // Count of plays
        const playCountResult = await db.raw(`
          SELECT COUNT(*) as count FROM plays
        `);
        
        if (playCountResult && playCountResult[0] && playCountResult[0][0]) {
          const playCount = parseInt(playCountResult[0][0].count);
          metricsCollector.setGauge('baseball.play_count', playCount);
        }
        
        // Count of players
        const playerCountResult = await db.raw(`
          SELECT COUNT(*) as count FROM players
        `);
        
        if (playerCountResult && playerCountResult[0] && playerCountResult[0][0]) {
          const playerCount = parseInt(playerCountResult[0][0].count);
          metricsCollector.setGauge('baseball.player_count', playerCount);
        }
        
        // Count of lineup changes
        const lineupChangeCountResult = await db.raw(`
          SELECT COUNT(*) as count FROM lineup_states
        `);
        
        if (lineupChangeCountResult && lineupChangeCountResult[0] && lineupChangeCountResult[0][0]) {
          const lineupChangeCount = parseInt(lineupChangeCountResult[0][0].count);
          metricsCollector.setGauge('baseball.lineup_change_count', lineupChangeCount);
        }
        
      } catch (error) {
        logger.error('Error collecting baseball-specific metrics', { error });
      }
      
    } catch (error) {
      logger.error('Error collecting application metrics', { error });
    }
  }
  
  /**
   * Gets a summary of system metrics
   * @returns A summary of system metrics
   */
  public getSystemMetricsSummary(): Record<string, any> {
    return {
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model,
        speed: os.cpus()[0]?.speed
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        type: os.type(),
        uptime: os.uptime()
      },
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        versions: process.versions
      },
      network: {
        interfaces: os.networkInterfaces()
      }
    };
  }
}

// Export a singleton instance
export const systemMonitor = SystemMonitor.getInstance();