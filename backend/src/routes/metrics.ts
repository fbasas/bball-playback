import express, { Request, Response, NextFunction } from 'express';
import { ParsedQs } from 'qs';
import { 
  metricsCollector, 
  alertManager, 
  systemMonitor, 
  metricsVisualization 
} from '../core/metrics';
import { logger } from '../core/logging';

export const MetricsRouter = express.Router();

/**
 * @route GET /api/metrics
 * @description Get all metrics
 * @access Private
 */
MetricsRouter.get('/', async (req, res) => {
  try {
    const summary = metricsCollector.getMetricsSummary();
    
    res.json({
      timestamp: new Date().toISOString(),
      metrics: summary
    });
  } catch (error) {
    logger.error('Error getting metrics', { error });
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * @route GET /api/metrics/definitions
 * @description Get all metric definitions
 * @access Private
 */
MetricsRouter.get('/definitions', (req, res) => {
  try {
    const definitions = metricsCollector.getMetricDefinitions();
    
    res.json({
      timestamp: new Date().toISOString(),
      definitions
    });
  } catch (error) {
    logger.error('Error getting metric definitions', { error });
    res.status(500).json({ error: 'Failed to get metric definitions' });
  }
});

/**
 * @route GET /api/metrics/:name
 * @description Get metrics for a specific metric name
 * @access Private
 */
const getMetricByName = function(req: Request, res: Response, next: NextFunction) {
  try {
    const { name } = req.params;
    const values = metricsCollector.getMetricValues(name);
    const definition = metricsCollector.getMetricDefinition(name);
    
    if (!definition) {
      return res.status(404).json({ error: `Metric ${name} not found` });
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      name,
      definition,
      values
    });
  } catch (error) {
    logger.error('Error getting metric values', { error });
    res.status(500).json({ error: 'Failed to get metric values' });
  }
};

MetricsRouter.get('/:name', getMetricByName as any);

/**
 * @route POST /api/metrics/reset
 * @description Reset all metrics
 * @access Private
 */
MetricsRouter.post('/reset', (req, res) => {
  try {
    metricsCollector.clearMetrics();
    
    res.json({
      timestamp: new Date().toISOString(),
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting metrics', { error });
    res.status(500).json({ error: 'Failed to reset metrics' });
  }
});

/**
 * @route GET /api/metrics/system
 * @description Get system metrics
 * @access Private
 */
MetricsRouter.get('/system/info', (req, res) => {
  try {
    const systemInfo = systemMonitor.getSystemMetricsSummary();
    
    res.json({
      timestamp: new Date().toISOString(),
      system: systemInfo
    });
  } catch (error) {
    logger.error('Error getting system metrics', { error });
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

/**
 * @route GET /api/metrics/dashboards
 * @description Get all dashboards
 * @access Private
 */
MetricsRouter.get('/dashboards', (req, res) => {
  try {
    const dashboards = metricsVisualization.getAllDashboards();
    
    res.json({
      timestamp: new Date().toISOString(),
      dashboards
    });
  } catch (error) {
    logger.error('Error getting dashboards', { error });
    res.status(500).json({ error: 'Failed to get dashboards' });
  }
});

/**
 * @route GET /api/metrics/dashboards/:id
 * @description Get a specific dashboard
 * @access Private
 */
const getDashboardById = function(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const dashboard = metricsVisualization.getDashboard(id);
    
    if (!dashboard) {
      return res.status(404).json({ error: `Dashboard ${id} not found` });
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      dashboard
    });
  } catch (error) {
    logger.error('Error getting dashboard', { error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
};

MetricsRouter.get('/dashboards/:id', getDashboardById as any);

/**
 * @route GET /api/metrics/dashboards/:id/data
 * @description Get data for a specific dashboard
 * @access Private
 */
const getDashboardDataById = function(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = metricsVisualization.getDashboardData(id);
    
    if (data.error) {
      return res.status(404).json({ error: data.error });
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      data
    });
  } catch (error) {
    logger.error('Error getting dashboard data', { error });
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

MetricsRouter.get('/dashboards/:id/data', getDashboardDataById as any);

/**
 * @route GET /api/metrics/alerts
 * @description Get all alerts
 * @access Private
 */
MetricsRouter.get('/alerts', (req, res) => {
  try {
    const { status } = req.query;
    let alerts;
    
    if (status === 'active') {
      alerts = alertManager.getActiveAlerts();
    } else {
      alerts = alertManager.getAllAlerts();
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      alerts
    });
  } catch (error) {
    logger.error('Error getting alerts', { error });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * @route GET /api/metrics/alerts/rules
 * @description Get all alert rules
 * @access Private
 */
MetricsRouter.get('/alerts/rules', (req, res) => {
  try {
    const rules = alertManager.getAllRules();
    
    res.json({
      timestamp: new Date().toISOString(),
      rules
    });
  } catch (error) {
    logger.error('Error getting alert rules', { error });
    res.status(500).json({ error: 'Failed to get alert rules' });
  }
});

/**
 * @route POST /api/metrics/alerts/reset
 * @description Reset all alerts
 * @access Private
 */
MetricsRouter.post('/alerts/reset', (req, res) => {
  try {
    alertManager.clearAlerts();
    
    res.json({
      timestamp: new Date().toISOString(),
      message: 'Alerts reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting alerts', { error });
    res.status(500).json({ error: 'Failed to reset alerts' });
  }
});

/**
 * @route GET /api/metrics/baseball
 * @description Get baseball-specific metrics
 * @access Private
 */
MetricsRouter.get('/baseball', (req, res) => {
  try {
    const baseballMetrics = [
      'baseball.game_count',
      'baseball.play_count',
      'baseball.player_count',
      'baseball.lineup_change_count',
      'baseball.commentary_generation_time',
      'baseball.substitution_count'
    ].reduce((acc, name) => {
      acc[name] = metricsCollector.getMetricValues(name);
      return acc;
    }, {} as Record<string, any>);
    
    res.json({
      timestamp: new Date().toISOString(),
      metrics: baseballMetrics
    });
  } catch (error) {
    logger.error('Error getting baseball metrics', { error });
    res.status(500).json({ error: 'Failed to get baseball metrics' });
  }
});