import express from 'express';
import { performanceMonitor, queryMonitor } from '../core/performance';
import { connectionManager } from '../core/database';
import { logger } from '../core/logging';

export const PerformanceRouter = express.Router();

/**
 * @route GET /api/performance/metrics
 * @description Get performance metrics
 * @access Private
 */
PerformanceRouter.get('/metrics', async (req, res) => {
  try {
    const summary = performanceMonitor.getSummary();
    const querySummary = queryMonitor.getQuerySummary();
    
    // Get database connection pool stats
    let poolStats = {};
    try {
      const pool = connectionManager.getFreeConnections() >= 0 ? {
        free: connectionManager.getFreeConnections(),
        used: connectionManager.getUsedConnections(),
        total: connectionManager.getFreeConnections() + connectionManager.getUsedConnections()
      } : { status: 'unavailable' };
      
      poolStats = { pool };
    } catch (error) {
      logger.error('Error getting pool stats', { error });
      poolStats = { error: 'Failed to get pool stats' };
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      endpoints: summary,
      queries: querySummary,
      database: poolStats
    });
  } catch (error) {
    logger.error('Error getting performance metrics', { error });
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * @route GET /api/performance/slow-queries
 * @description Get slow query metrics
 * @access Private
 */
PerformanceRouter.get('/slow-queries', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 500; // Default 500ms
    
    const metrics = performanceMonitor.getMetrics()
      .filter(metric => 
        metric.operation.includes('query') && 
        metric.durationMs > threshold
      )
      .sort((a, b) => b.durationMs - a.durationMs) // Sort by duration (descending)
      .slice(0, 20); // Get top 20 slow queries
    
    res.json({
      timestamp: new Date().toISOString(),
      threshold,
      count: metrics.length,
      queries: metrics
    });
  } catch (error) {
    logger.error('Error getting slow query metrics', { error });
    res.status(500).json({ error: 'Failed to get slow query metrics' });
  }
});

/**
 * @route GET /api/performance/slow-endpoints
 * @description Get slow API endpoint metrics
 * @access Private
 */
PerformanceRouter.get('/slow-endpoints', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 1000; // Default 1000ms
    
    const metrics = performanceMonitor.getMetrics()
      .filter(metric => 
        metric.operation.startsWith('api_endpoint_') && 
        metric.durationMs > threshold
      )
      .sort((a, b) => b.durationMs - a.durationMs) // Sort by duration (descending)
      .slice(0, 20); // Get top 20 slow endpoints
    
    res.json({
      timestamp: new Date().toISOString(),
      threshold,
      count: metrics.length,
      endpoints: metrics
    });
  } catch (error) {
    logger.error('Error getting slow endpoint metrics', { error });
    res.status(500).json({ error: 'Failed to get slow endpoint metrics' });
  }
});

/**
 * @route POST /api/performance/reset
 * @description Reset performance metrics
 * @access Private
 */
PerformanceRouter.post('/reset', (req, res) => {
  try {
    performanceMonitor.clearMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting performance metrics', { error });
    res.status(500).json({ error: 'Failed to reset performance metrics' });
  }
});