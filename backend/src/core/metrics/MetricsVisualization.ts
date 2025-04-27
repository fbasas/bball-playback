import { metricsCollector, MetricValue } from './MetricsCollector';
import { systemMonitor } from './SystemMonitor';
import { alertManager, Alert } from './AlertManager';
import { logger } from '../logging';

/**
 * Interface for a metrics dashboard
 */
export interface MetricsDashboard {
  id: string;
  name: string;
  description: string;
  panels: MetricsPanel[];
}

/**
 * Interface for a metrics panel
 */
export interface MetricsPanel {
  id: string;
  title: string;
  type: 'gauge' | 'counter' | 'chart' | 'table' | 'alert';
  metrics: string[];
  options?: Record<string, any>;
}

/**
 * Metrics visualization for generating dashboard data
 */
export class MetricsVisualization {
  private static instance: MetricsVisualization;
  private dashboards: Map<string, MetricsDashboard> = new Map();
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.registerDefaultDashboards();
  }
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): MetricsVisualization {
    if (!MetricsVisualization.instance) {
      MetricsVisualization.instance = new MetricsVisualization();
    }
    return MetricsVisualization.instance;
  }
  
  /**
   * Registers default dashboards
   */
  private registerDefaultDashboards(): void {
    // System dashboard
    this.registerDashboard({
      id: 'system',
      name: 'System Overview',
      description: 'System-level metrics and health',
      panels: [
        {
          id: 'system-cpu',
          title: 'CPU Usage',
          type: 'gauge',
          metrics: ['system.cpu_usage'],
          options: {
            unit: '%',
            min: 0,
            max: 100,
            thresholds: [
              { value: 70, color: 'yellow' },
              { value: 90, color: 'red' }
            ]
          }
        },
        {
          id: 'system-memory',
          title: 'Memory Usage',
          type: 'gauge',
          metrics: ['system.memory_usage_percent'],
          options: {
            unit: '%',
            min: 0,
            max: 100,
            thresholds: [
              { value: 70, color: 'yellow' },
              { value: 90, color: 'red' }
            ]
          }
        },
        {
          id: 'system-load',
          title: 'System Load',
          type: 'chart',
          metrics: ['system.load_average'],
          options: {
            chartType: 'line',
            timeRange: '1h'
          }
        },
        {
          id: 'system-uptime',
          title: 'Uptime',
          type: 'counter',
          metrics: ['app.uptime'],
          options: {
            unit: 'seconds',
            displayFormat: 'duration'
          }
        }
      ]
    });
    
    // API dashboard
    this.registerDashboard({
      id: 'api',
      name: 'API Performance',
      description: 'API endpoint performance and metrics',
      panels: [
        {
          id: 'api-requests',
          title: 'Request Rate',
          type: 'chart',
          metrics: ['app.request_count'],
          options: {
            chartType: 'bar',
            timeRange: '1h',
            groupBy: 'method'
          }
        },
        {
          id: 'api-latency',
          title: 'Request Latency',
          type: 'chart',
          metrics: ['app.request_duration'],
          options: {
            chartType: 'line',
            timeRange: '1h',
            percentiles: [50, 90, 99]
          }
        },
        {
          id: 'api-errors',
          title: 'Error Rate',
          type: 'chart',
          metrics: ['app.errors'],
          options: {
            chartType: 'line',
            timeRange: '1h',
            groupBy: 'statusCategory'
          }
        },
        {
          id: 'api-status-codes',
          title: 'Status Codes',
          type: 'table',
          metrics: ['app.status_codes'],
          options: {
            groupBy: ['method', 'status']
          }
        }
      ]
    });
    
    // Database dashboard
    this.registerDashboard({
      id: 'database',
      name: 'Database Performance',
      description: 'Database performance and metrics',
      panels: [
        {
          id: 'db-queries',
          title: 'Query Rate',
          type: 'chart',
          metrics: ['db.query_count'],
          options: {
            chartType: 'bar',
            timeRange: '1h',
            groupBy: 'type'
          }
        },
        {
          id: 'db-latency',
          title: 'Query Latency',
          type: 'chart',
          metrics: ['db.query_duration'],
          options: {
            chartType: 'line',
            timeRange: '1h',
            percentiles: [50, 90, 99],
            groupBy: 'type'
          }
        },
        {
          id: 'db-connections',
          title: 'Connection Pool',
          type: 'gauge',
          metrics: ['db.connection_pool_utilization'],
          options: {
            unit: '%',
            min: 0,
            max: 100,
            thresholds: [
              { value: 70, color: 'yellow' },
              { value: 90, color: 'red' }
            ]
          }
        },
        {
          id: 'db-size',
          title: 'Database Size',
          type: 'table',
          metrics: ['db.table_size'],
          options: {
            unit: 'MB',
            sortBy: 'value',
            sortDirection: 'desc'
          }
        }
      ]
    });
    
    // Baseball dashboard
    this.registerDashboard({
      id: 'baseball',
      name: 'Baseball Metrics',
      description: 'Baseball-specific metrics and performance',
      panels: [
        {
          id: 'baseball-games',
          title: 'Game Count',
          type: 'counter',
          metrics: ['baseball.game_count']
        },
        {
          id: 'baseball-plays',
          title: 'Play Count',
          type: 'counter',
          metrics: ['baseball.play_count']
        },
        {
          id: 'baseball-commentary',
          title: 'Commentary Generation Time',
          type: 'chart',
          metrics: ['baseball.commentary_generation_time'],
          options: {
            chartType: 'line',
            timeRange: '1h',
            percentiles: [50, 90, 99]
          }
        },
        {
          id: 'baseball-substitutions',
          title: 'Substitution Count',
          type: 'chart',
          metrics: ['baseball.substitution_count'],
          options: {
            chartType: 'bar',
            timeRange: '1h',
            groupBy: 'team'
          }
        }
      ]
    });
    
    // Alerts dashboard
    this.registerDashboard({
      id: 'alerts',
      name: 'Alerts',
      description: 'Active and recent alerts',
      panels: [
        {
          id: 'active-alerts',
          title: 'Active Alerts',
          type: 'alert',
          metrics: [],
          options: {
            status: 'active',
            sortBy: 'timestamp',
            sortDirection: 'desc'
          }
        },
        {
          id: 'recent-alerts',
          title: 'Recent Alerts',
          type: 'alert',
          metrics: [],
          options: {
            status: 'resolved',
            limit: 20,
            sortBy: 'timestamp',
            sortDirection: 'desc'
          }
        }
      ]
    });
  }
  
  /**
   * Registers a dashboard
   * @param dashboard The dashboard to register
   * @returns The registered dashboard
   */
  public registerDashboard(dashboard: MetricsDashboard): MetricsDashboard {
    if (this.dashboards.has(dashboard.id)) {
      logger.warn(`Dashboard with ID ${dashboard.id} already exists, updating`);
    }
    
    this.dashboards.set(dashboard.id, dashboard);
    logger.info(`Dashboard registered: ${dashboard.name}`, { dashboardId: dashboard.id });
    
    return dashboard;
  }
  
  /**
   * Gets a dashboard by ID
   * @param id The dashboard ID
   * @returns The dashboard or undefined if not found
   */
  public getDashboard(id: string): MetricsDashboard | undefined {
    return this.dashboards.get(id);
  }
  
  /**
   * Gets all dashboards
   * @returns All dashboards
   */
  public getAllDashboards(): MetricsDashboard[] {
    return Array.from(this.dashboards.values());
  }
  
  /**
   * Gets dashboard data for a specific dashboard
   * @param id The dashboard ID
   * @returns The dashboard data
   */
  public getDashboardData(id: string): Record<string, any> {
    const dashboard = this.dashboards.get(id);
    
    if (!dashboard) {
      return { error: `Dashboard with ID ${id} not found` };
    }
    
    const data: Record<string, any> = {
      id: dashboard.id,
      name: dashboard.name,
      description: dashboard.description,
      timestamp: new Date().toISOString(),
      panels: {}
    };
    
    dashboard.panels.forEach(panel => {
      data.panels[panel.id] = this.getPanelData(panel);
    });
    
    return data;
  }
  
  /**
   * Gets data for a specific panel
   * @param panel The panel
   * @returns The panel data
   */
  private getPanelData(panel: MetricsPanel): Record<string, any> {
    const data: Record<string, any> = {
      title: panel.title,
      type: panel.type,
      options: panel.options || {}
    };
    
    switch (panel.type) {
      case 'gauge':
      case 'counter':
        data.values = this.getLatestMetricValues(panel.metrics);
        break;
      
      case 'chart':
        data.series = this.getMetricTimeSeries(panel.metrics, panel.options);
        break;
      
      case 'table':
        data.rows = this.getMetricTableData(panel.metrics, panel.options);
        break;
      
      case 'alert':
        data.alerts = this.getAlertData(panel.options);
        break;
    }
    
    return data;
  }
  
  /**
   * Gets the latest values for a set of metrics
   * @param metricNames The metric names
   * @returns The latest metric values
   */
  private getLatestMetricValues(metricNames: string[]): Record<string, any> {
    const values: Record<string, any> = {};
    
    metricNames.forEach(name => {
      const metricValues = metricsCollector.getMetricValues(name);
      
      if (metricValues.length === 0) {
        values[name] = null;
        return;
      }
      
      // Group by tags if present
      const tagGroups: Record<string, MetricValue[]> = {};
      
      metricValues.forEach(value => {
        if (!value.tags || Object.keys(value.tags).length === 0) {
          const key = 'no_tags';
          tagGroups[key] = tagGroups[key] || [];
          tagGroups[key].push(value);
          return;
        }
        
        // Create a key from the tags
        const key = Object.entries(value.tags)
          .map(([k, v]) => `${k}:${v}`)
          .join(',');
        
        tagGroups[key] = tagGroups[key] || [];
        tagGroups[key].push(value);
      });
      
      // Get the latest value for each tag group
      values[name] = Object.entries(tagGroups).map(([key, groupValues]) => {
        // Sort by timestamp (descending)
        groupValues.sort((a, b) => b.timestamp - a.timestamp);
        
        const latest = groupValues[0];
        
        return {
          tags: latest.tags || {},
          value: latest.value,
          timestamp: latest.timestamp
        };
      });
    });
    
    return values;
  }
  
  /**
   * Gets time series data for a set of metrics
   * @param metricNames The metric names
   * @param options The chart options
   * @returns The time series data
   */
  private getMetricTimeSeries(metricNames: string[], options?: Record<string, any>): Record<string, any> {
    const series: Record<string, any> = {};
    const timeRange = options?.timeRange || '1h';
    const groupBy = options?.groupBy;
    const percentiles = options?.percentiles;
    
    // Calculate the start time based on the time range
    const now = Date.now();
    let startTime = now;
    
    switch (timeRange) {
      case '5m': startTime = now - 5 * 60 * 1000; break;
      case '15m': startTime = now - 15 * 60 * 1000; break;
      case '30m': startTime = now - 30 * 60 * 1000; break;
      case '1h': startTime = now - 60 * 60 * 1000; break;
      case '3h': startTime = now - 3 * 60 * 60 * 1000; break;
      case '6h': startTime = now - 6 * 60 * 60 * 1000; break;
      case '12h': startTime = now - 12 * 60 * 60 * 1000; break;
      case '24h': startTime = now - 24 * 60 * 60 * 1000; break;
      case '7d': startTime = now - 7 * 24 * 60 * 60 * 1000; break;
      case '30d': startTime = now - 30 * 24 * 60 * 60 * 1000; break;
      default: startTime = now - 60 * 60 * 1000; // Default to 1 hour
    }
    
    metricNames.forEach(name => {
      const metricValues = metricsCollector.getMetricValues(name)
        .filter(value => value.timestamp >= startTime);
      
      if (metricValues.length === 0) {
        series[name] = [];
        return;
      }
      
      // Group by time and tags if specified
      const timeGroups: Record<string, Record<string, MetricValue[]>> = {};
      const interval = this.calculateTimeInterval(timeRange);
      
      metricValues.forEach(value => {
        // Round timestamp to the nearest interval
        const timeKey = Math.floor(value.timestamp / interval) * interval;
        
        timeGroups[timeKey] = timeGroups[timeKey] || {};
        
        if (groupBy && value.tags && value.tags[groupBy]) {
          const tagValue = value.tags[groupBy];
          timeGroups[timeKey][tagValue] = timeGroups[timeKey][tagValue] || [];
          timeGroups[timeKey][tagValue].push(value);
        } else {
          const key = 'value';
          timeGroups[timeKey][key] = timeGroups[timeKey][key] || [];
          timeGroups[timeKey][key].push(value);
        }
      });
      
      // Convert to time series format
      const timeSeries: any[] = [];
      
      Object.entries(timeGroups).forEach(([timeKey, tagGroups]) => {
        const timestamp = parseInt(timeKey);
        
        Object.entries(tagGroups).forEach(([tagValue, values]) => {
          // Calculate statistics
          const sum = values.reduce((acc, v) => acc + v.value, 0);
          const avg = sum / values.length;
          const min = Math.min(...values.map(v => v.value));
          const max = Math.max(...values.map(v => v.value));
          const count = values.length;
          
          // Calculate percentiles if specified
          const percentileValues: Record<string, number> = {};
          
          if (percentiles && percentiles.length > 0) {
            const sorted = values.map(v => v.value).sort((a, b) => a - b);
            
            percentiles.forEach((p: number) => {
              percentileValues[`p${p}`] = this.calculatePercentile(sorted, p);
            });
          }
          
          timeSeries.push({
            timestamp,
            group: tagValue,
            avg,
            min,
            max,
            count,
            sum,
            ...percentileValues
          });
        });
      });
      
      // Sort by timestamp
      timeSeries.sort((a, b) => a.timestamp - b.timestamp);
      
      series[name] = timeSeries;
    });
    
    return series;
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
   * Calculates the time interval for a time range
   * @param timeRange The time range
   * @returns The time interval in milliseconds
   */
  private calculateTimeInterval(timeRange: string): number {
    switch (timeRange) {
      case '5m': return 10 * 1000; // 10 seconds
      case '15m': return 30 * 1000; // 30 seconds
      case '30m': return 60 * 1000; // 1 minute
      case '1h': return 2 * 60 * 1000; // 2 minutes
      case '3h': return 5 * 60 * 1000; // 5 minutes
      case '6h': return 10 * 60 * 1000; // 10 minutes
      case '12h': return 20 * 60 * 1000; // 20 minutes
      case '24h': return 30 * 60 * 1000; // 30 minutes
      case '7d': return 3 * 60 * 60 * 1000; // 3 hours
      case '30d': return 12 * 60 * 60 * 1000; // 12 hours
      default: return 60 * 1000; // Default to 1 minute
    }
  }
  
  /**
   * Gets table data for a set of metrics
   * @param metricNames The metric names
   * @param options The table options
   * @returns The table data
   */
  private getMetricTableData(metricNames: string[], options?: Record<string, any>): Record<string, any> {
    const tableData: Record<string, any> = {};
    const groupBy = options?.groupBy || [];
    const sortBy = options?.sortBy || 'value';
    const sortDirection = options?.sortDirection || 'desc';
    
    metricNames.forEach(name => {
      const metricValues = metricsCollector.getMetricValues(name);
      
      if (metricValues.length === 0) {
        tableData[name] = [];
        return;
      }
      
      // Group by tags if specified
      const groups: Record<string, MetricValue[]> = {};
      
      metricValues.forEach(value => {
        let key = 'no_tags';
        
        if (value.tags && Object.keys(value.tags).length > 0) {
          if (Array.isArray(groupBy) && groupBy.length > 0) {
            // Group by specific tags
            key = groupBy
              .map(tag => `${tag}:${value.tags?.[tag] || 'unknown'}`)
              .join(',');
          } else {
            // Group by all tags
            key = Object.entries(value.tags)
              .map(([k, v]) => `${k}:${v}`)
              .join(',');
          }
        }
        
        groups[key] = groups[key] || [];
        groups[key].push(value);
      });
      
      // Calculate statistics for each group
      const rows = Object.entries(groups).map(([key, values]) => {
        const sum = values.reduce((acc, v) => acc + v.value, 0);
        const avg = sum / values.length;
        const min = Math.min(...values.map(v => v.value));
        const max = Math.max(...values.map(v => v.value));
        const count = values.length;
        
        // Parse the key into tags
        const tags: Record<string, string> = {};
        
        if (key !== 'no_tags') {
          key.split(',').forEach(pair => {
            const [tagKey, tagValue] = pair.split(':');
            tags[tagKey] = tagValue;
          });
        }
        
        return {
          tags,
          count,
          sum,
          avg,
          min,
          max,
          latest: values[0].value
        };
      });
      
      // Sort the rows
      rows.sort((a, b) => {
        let aValue: any;
        let bValue: any;
        
        if (sortBy === 'tags' && Object.keys(a.tags).length > 0) {
          const tagKey = Object.keys(a.tags)[0];
          aValue = a.tags[tagKey];
          bValue = b.tags[tagKey];
        } else if (sortBy in a) {
          aValue = (a as any)[sortBy];
          bValue = (b as any)[sortBy];
        } else {
          aValue = 0;
          bValue = 0;
        }
        
        if (aValue === bValue) return 0;
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : 1;
        } else {
          return aValue > bValue ? -1 : 1;
        }
      });
      
      tableData[name] = rows;
    });
    
    return tableData;
  }
  
  /**
   * Gets alert data
   * @param options The alert options
   * @returns The alert data
   */
  private getAlertData(options?: Record<string, any>): Alert[] {
    const status = options?.status || 'active';
    const limit = options?.limit || 100;
    const sortBy = options?.sortBy || 'timestamp';
    const sortDirection = options?.sortDirection || 'desc';
    
    let alerts: Alert[] = [];
    
    if (status === 'active') {
      alerts = alertManager.getActiveAlerts();
    } else {
      alerts = alertManager.getAllAlerts().filter(alert => alert.status === status);
    }
    
    // Sort the alerts
    alerts.sort((a, b) => {
      const aValue = a[sortBy as keyof Alert];
      const bValue = b[sortBy as keyof Alert];
      
      if (aValue === bValue) return 0;
      if (sortDirection === 'asc') {
        return (aValue ?? 0) < (bValue ?? 0) ? -1 : 1;
      } else {
        return (aValue ?? 0) > (bValue ?? 0) ? -1 : 1;
      }
    });
    
    // Limit the number of alerts
    if (limit > 0 && alerts.length > limit) {
      alerts = alerts.slice(0, limit);
    }
    
    return alerts;
  }
}

// Export a singleton instance
export const metricsVisualization = MetricsVisualization.getInstance();