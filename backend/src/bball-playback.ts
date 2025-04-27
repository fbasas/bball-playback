// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import express = require('express');
import cors = require('cors');
import fs from 'fs';
import path from 'path';
import { TestRouter } from "./routes/test";
import { GameRouter } from "./routes/game/index";
import { PerformanceRouter } from "./routes/performance";
import { MetricsRouter } from "./routes/metrics";
import { httpLogger, logger } from './core/logging';
import { errorMiddleware, notFoundMiddleware, setupErrorHandlers } from './core/errors';
import { connectionManager } from './core/database';
import { performanceMonitor, queryMonitor, performanceMiddleware } from './core/performance';
import {
  metricsCollector,
  alertManager,
  systemMonitor,
  metricsMiddleware,
  baseballMetricsCollector
} from './core/metrics';
import { config, environment, isFeatureEnabled } from './config/config';

// Create logs directory if it doesn't exist
const logDir = process.env.LOG_DIR || 'logs';
const logPath = path.isAbsolute(logDir) ? logDir : path.join(process.cwd(), logDir);
if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
}

// Initialize Express app
const app = express();
const port = config.port; // Use port from validated config

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Add HTTP request logging, performance monitoring, and metrics collection
app.use(httpLogger);
app.use(performanceMiddleware);
app.use(metricsMiddleware);

// Routes
app.use('/api/game', GameRouter);
app.use('/api/performance', PerformanceRouter);
app.use('/api/metrics', MetricsRouter);
app.use('/test', TestRouter);

// Add 404 handler for undefined routes
app.use(notFoundMiddleware);

// Add error handling middleware
app.use(errorMiddleware);

// Set up process-level error handlers
setupErrorHandlers();

// Initialize database connection manager, performance monitoring, and metrics collection
connectionManager.startMonitoring();
performanceMonitor.setSlowQueryThreshold(500); // 500ms
queryMonitor.setSlowQueryThreshold(500); // 500ms

// Initialize metrics collection
metricsCollector.startCollectingSystemMetrics(60000); // 1 minute
systemMonitor.startMonitoring(60000); // 1 minute
alertManager.start(60000); // 1 minute

// Register default alert rules
alertManager.registerRule({
  id: 'high-cpu-usage',
  name: 'High CPU Usage',
  description: 'CPU usage is above 80%',
  metricName: 'system.cpu_usage',
  condition: 'gt',
  threshold: 80,
  duration: 60000, // 1 minute
  severity: 'warning',
  enabled: true,
  notificationChannels: ['console']
});

alertManager.registerRule({
  id: 'high-memory-usage',
  name: 'High Memory Usage',
  description: 'Memory usage is above 80%',
  metricName: 'system.memory_usage_percent',
  condition: 'gt',
  threshold: 80,
  duration: 60000, // 1 minute
  severity: 'warning',
  enabled: true,
  notificationChannels: ['console']
});

alertManager.registerRule({
  id: 'slow-api-response',
  name: 'Slow API Response',
  description: 'API response time is above 2 seconds',
  metricName: 'app.request_duration',
  condition: 'gt',
  threshold: 2000,
  severity: 'warning',
  enabled: true,
  notificationChannels: ['console']
});

alertManager.registerRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  description: 'Error rate is above 5%',
  metricName: 'app.errors',
  condition: 'gt',
  threshold: 5,
  duration: 60000, // 1 minute
  severity: 'error',
  enabled: true,
  notificationChannels: ['console']
});

alertManager.registerRule({
  id: 'database-connection-pool-high',
  name: 'Database Connection Pool High Usage',
  description: 'Database connection pool usage is above 80%',
  metricName: 'db.connection_pool_utilization',
  condition: 'gt',
  threshold: 80,
  duration: 60000, // 1 minute
  severity: 'warning',
  enabled: true,
  notificationChannels: ['console']
});

// Set up periodic performance and metrics logging
const PERFORMANCE_LOG_INTERVAL = 15 * 60 * 1000; // 15 minutes
setInterval(() => {
    performanceMonitor.logSummary();
    queryMonitor.logQuerySummary();
    
    // Log metrics summary
    logger.info('Metrics summary', {
        metrics: Object.keys(metricsCollector.getMetricsSummary()).length,
        alerts: alertManager.getActiveAlerts().length
    });
}, PERFORMANCE_LOG_INTERVAL);

// Check database connection
connectionManager.isConnected()
  .then(connected => {
    if (connected) {
      logger.info('Successfully connected to the database');
    } else {
      logger.error('Failed to connect to the database');
    }
  })
  .catch(error => {
    logger.error('Error checking database connection', { error });
  });

// Start the server
app.listen(port, () => {
    logger.info(`Baseball Playback API listening at http://localhost:${port}`);
    
    // Log initial connection pool stats and monitoring status
    connectionManager.logPoolStats();
    logger.info('Monitoring initialized', {
        slowQueryThreshold: 500,
        performanceLogInterval: PERFORMANCE_LOG_INTERVAL,
        metricsEnabled: true,
        alertingEnabled: true
    });
    
    // Log environment and feature flags
    logger.info('Application started', {
        environment,
        enabledFeatures: Object.entries(config.featureFlags || {})
            .filter(([_, flag]) => flag && typeof flag === 'object' && 'enabled' in flag && flag.enabled)
            .map(([key]) => key)
    });
});

// Handle application shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down gracefully');
  
  // Stop monitoring
  systemMonitor.stopMonitoring();
  metricsCollector.stopCollectingSystemMetrics();
  alertManager.stop();
  
  // Close database connections
  await connectionManager.destroyPool();
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down gracefully');
  
  // Stop monitoring
  systemMonitor.stopMonitoring();
  metricsCollector.stopCollectingSystemMetrics();
  alertManager.stop();
  
  // Close database connections
  await connectionManager.destroyPool();
  
  process.exit(0);
});
