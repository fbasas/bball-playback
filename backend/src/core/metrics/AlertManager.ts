import { EventEmitter } from 'events';
import { logger } from '../logging';
import { metricsCollector, MetricValue } from './MetricsCollector';

/**
 * Interface for an alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metricName: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration?: number; // Duration in ms that condition must be true before alerting
  tags?: Record<string, string>; // Optional tags to filter metrics
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  notificationChannels: string[];
}

/**
 * Interface for an alert
 */
export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  metricName: string;
  condition: string;
  threshold: number;
  currentValue: number;
  tags?: Record<string, string>;
  severity: string;
  timestamp: number;
  status: 'active' | 'resolved';
  resolvedAt?: number;
}

/**
 * Interface for a notification channel
 */
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Alert manager for monitoring metrics and triggering alerts
 */
export class AlertManager extends EventEmitter {
  private static instance: AlertManager;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private pendingAlerts: Map<string, { metric: MetricValue, rule: AlertRule, since: number }> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
    
    // Register default notification channels
    this.registerNotificationChannel({
      id: 'console',
      name: 'Console Logger',
      type: 'console',
      config: {},
      enabled: true
    });
    
    // Listen for metrics events
    metricsCollector.on('metric', (metric: MetricValue) => {
      this.checkMetricAgainstRules(metric);
    });
  }
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }
  
  /**
   * Registers an alert rule
   * @param rule The alert rule to register
   * @returns The registered rule
   */
  public registerRule(rule: AlertRule): AlertRule {
    if (this.rules.has(rule.id)) {
      logger.warn(`Alert rule with ID ${rule.id} already exists, updating`);
    }
    
    this.rules.set(rule.id, rule);
    logger.info(`Alert rule registered: ${rule.name}`, { rule });
    
    return rule;
  }
  
  /**
   * Registers a notification channel
   * @param channel The notification channel to register
   * @returns The registered channel
   */
  public registerNotificationChannel(channel: NotificationChannel): NotificationChannel {
    if (this.notificationChannels.has(channel.id)) {
      logger.warn(`Notification channel with ID ${channel.id} already exists, updating`);
    }
    
    this.notificationChannels.set(channel.id, channel);
    logger.info(`Notification channel registered: ${channel.name}`, { channel });
    
    return channel;
  }
  
  /**
   * Starts the alert manager
   * @param checkIntervalMs The interval in milliseconds to check for stale alerts (default: 60000)
   */
  public start(checkIntervalMs: number = 60000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(() => {
      this.checkStaleAlerts();
    }, checkIntervalMs);
    
    logger.info('Alert manager started', { checkIntervalMs });
  }
  
  /**
   * Stops the alert manager
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    logger.info('Alert manager stopped');
  }
  
  /**
   * Checks a metric against all registered rules
   * @param metric The metric to check
   */
  private checkMetricAgainstRules(metric: MetricValue): void {
    // Find all rules that apply to this metric
    const applicableRules = Array.from(this.rules.values()).filter(rule => {
      // Check if the rule is enabled and applies to this metric
      if (!rule.enabled || rule.metricName !== metric.name) {
        return false;
      }
      
      // Check if the rule has tag filters and if they match
      if (rule.tags && Object.keys(rule.tags).length > 0) {
        if (!metric.tags) return false;
        
        // Check if all rule tags match the metric tags
        return Object.entries(rule.tags).every(([key, value]) => 
          metric.tags?.[key] === value
        );
      }
      
      return true;
    });
    
    // Check each applicable rule
    applicableRules.forEach(rule => {
      const isConditionMet = this.evaluateCondition(metric.value, rule.condition, rule.threshold);
      const ruleKey = `${rule.id}:${JSON.stringify(metric.tags || {})}`;
      
      if (isConditionMet) {
        // If the rule has a duration, add it to pending alerts
        if (rule.duration && rule.duration > 0) {
          const existing = this.pendingAlerts.get(ruleKey);
          
          if (!existing) {
            this.pendingAlerts.set(ruleKey, {
              metric,
              rule,
              since: Date.now()
            });
          } else if (Date.now() - existing.since >= rule.duration) {
            // Duration threshold met, trigger the alert
            this.pendingAlerts.delete(ruleKey);
            this.triggerAlert(metric, rule);
          }
        } else {
          // No duration, trigger immediately
          this.triggerAlert(metric, rule);
        }
      } else {
        // Condition not met, remove from pending alerts
        this.pendingAlerts.delete(ruleKey);
        
        // Check if there's an active alert that should be resolved
        this.resolveAlertIfExists(rule, metric);
      }
    });
  }
  
  /**
   * Evaluates a condition
   * @param value The value to check
   * @param condition The condition to evaluate
   * @param threshold The threshold to compare against
   * @returns True if the condition is met, false otherwise
   */
  private evaluateCondition(value: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }
  
  /**
   * Triggers an alert
   * @param metric The metric that triggered the alert
   * @param rule The rule that was triggered
   */
  private triggerAlert(metric: MetricValue, rule: AlertRule): void {
    const alertId = `${rule.id}:${JSON.stringify(metric.tags || {})}`;
    
    // Check if this alert is already active
    if (this.alerts.has(alertId) && this.alerts.get(alertId)?.status === 'active') {
      return;
    }
    
    // Create the alert
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metricName: metric.name,
      condition: `${rule.condition} ${rule.threshold}`,
      threshold: rule.threshold,
      currentValue: metric.value,
      tags: metric.tags,
      severity: rule.severity,
      timestamp: Date.now(),
      status: 'active'
    };
    
    // Store the alert
    this.alerts.set(alertId, alert);
    
    // Emit an event
    this.emit('alert', alert);
    
    // Send notifications
    this.sendAlertNotifications(alert, rule);
    
    logger.warn(`Alert triggered: ${rule.name}`, { alert });
  }
  
  /**
   * Resolves an alert if it exists
   * @param rule The rule to check
   * @param metric The current metric value
   */
  private resolveAlertIfExists(rule: AlertRule, metric: MetricValue): void {
    const alertId = `${rule.id}:${JSON.stringify(metric.tags || {})}`;
    const existingAlert = this.alerts.get(alertId);
    
    if (existingAlert && existingAlert.status === 'active') {
      // Update the alert
      const resolvedAlert: Alert = {
        ...existingAlert,
        status: 'resolved',
        resolvedAt: Date.now(),
        currentValue: metric.value
      };
      
      // Store the updated alert
      this.alerts.set(alertId, resolvedAlert);
      
      // Emit an event
      this.emit('alertResolved', resolvedAlert);
      
      // Send notifications
      this.sendAlertResolvedNotifications(resolvedAlert, rule);
      
      logger.info(`Alert resolved: ${rule.name}`, { alert: resolvedAlert });
    }
  }
  
  /**
   * Checks for stale alerts that should be auto-resolved
   */
  private checkStaleAlerts(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    // Check active alerts
    this.alerts.forEach((alert, alertId) => {
      if (alert.status === 'active' && now - alert.timestamp > staleThreshold) {
        // Auto-resolve the alert
        const resolvedAlert: Alert = {
          ...alert,
          status: 'resolved',
          resolvedAt: now
        };
        
        // Store the updated alert
        this.alerts.set(alertId, resolvedAlert);
        
        // Emit an event
        this.emit('alertResolved', resolvedAlert);
        
        // Find the rule
        const rule = this.rules.get(alert.ruleId);
        
        if (rule) {
          // Send notifications
          this.sendAlertResolvedNotifications(resolvedAlert, rule, true);
        }
        
        logger.info(`Alert auto-resolved due to staleness: ${alert.ruleName}`, { alert: resolvedAlert });
      }
    });
  }
  
  /**
   * Sends notifications for an alert
   * @param alert The alert to send notifications for
   * @param rule The rule that triggered the alert
   */
  private sendAlertNotifications(alert: Alert, rule: AlertRule): void {
    rule.notificationChannels.forEach(channelId => {
      const channel = this.notificationChannels.get(channelId);
      
      if (!channel || !channel.enabled) {
        return;
      }
      
      try {
        switch (channel.type) {
          case 'console':
            this.sendConsoleNotification(alert, 'triggered');
            break;
          case 'email':
            // Implement email notifications
            logger.info(`Would send email notification for alert: ${alert.ruleName}`);
            break;
          case 'slack':
            // Implement Slack notifications
            logger.info(`Would send Slack notification for alert: ${alert.ruleName}`);
            break;
          case 'webhook':
            // Implement webhook notifications
            logger.info(`Would send webhook notification for alert: ${alert.ruleName}`);
            break;
        }
      } catch (error) {
        logger.error(`Error sending notification to channel ${channel.name}`, { error, alert });
      }
    });
  }
  
  /**
   * Sends notifications for a resolved alert
   * @param alert The resolved alert
   * @param rule The rule that was triggered
   * @param autoResolved Whether the alert was auto-resolved
   */
  private sendAlertResolvedNotifications(alert: Alert, rule: AlertRule, autoResolved: boolean = false): void {
    rule.notificationChannels.forEach(channelId => {
      const channel = this.notificationChannels.get(channelId);
      
      if (!channel || !channel.enabled) {
        return;
      }
      
      try {
        switch (channel.type) {
          case 'console':
            this.sendConsoleNotification(alert, autoResolved ? 'auto-resolved' : 'resolved');
            break;
          case 'email':
            // Implement email notifications
            logger.info(`Would send email notification for resolved alert: ${alert.ruleName}`);
            break;
          case 'slack':
            // Implement Slack notifications
            logger.info(`Would send Slack notification for resolved alert: ${alert.ruleName}`);
            break;
          case 'webhook':
            // Implement webhook notifications
            logger.info(`Would send webhook notification for resolved alert: ${alert.ruleName}`);
            break;
        }
      } catch (error) {
        logger.error(`Error sending resolution notification to channel ${channel.name}`, { error, alert });
      }
    });
  }
  
  /**
   * Sends a console notification
   * @param alert The alert
   * @param status The alert status
   */
  private sendConsoleNotification(alert: Alert, status: 'triggered' | 'resolved' | 'auto-resolved'): void {
    const message = `[ALERT ${status.toUpperCase()}] ${alert.ruleName}: ${alert.metricName} is ${alert.condition} (current: ${alert.currentValue})`;
    
    switch (alert.severity) {
      case 'critical':
      case 'error':
        logger.error(message, { alert });
        break;
      case 'warning':
        logger.warn(message, { alert });
        break;
      default:
        logger.info(message, { alert });
        break;
    }
  }
  
  /**
   * Gets all active alerts
   * @returns All active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }
  
  /**
   * Gets all alerts
   * @returns All alerts
   */
  public getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }
  
  /**
   * Gets all alert rules
   * @returns All alert rules
   */
  public getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }
  
  /**
   * Gets all notification channels
   * @returns All notification channels
   */
  public getAllNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }
  
  /**
   * Clears all alerts
   */
  public clearAlerts(): void {
    this.alerts.clear();
    this.pendingAlerts.clear();
    logger.info('All alerts cleared');
  }
}

// Export a singleton instance
export const alertManager = AlertManager.getInstance();