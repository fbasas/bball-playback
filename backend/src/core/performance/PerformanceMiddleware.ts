import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from './PerformanceMonitor';
import { logger } from '../logging';

/**
 * Middleware for tracking API endpoint performance
 * @param req The request object
 * @param res The response object
 * @param next The next function
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();
  const url = req.originalUrl || req.url;
  const method = req.method;
  const operationName = `api_endpoint_${method}_${url.split('?')[0].replace(/\//g, '_')}`;
  
  // Add a unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  req.headers['x-request-id'] = requestId;
  
  // Store the start time on the request object
  (req as any).performanceStartTime = startTime;
  
  // Track response time
  res.on('finish', () => {
    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const statusCode = res.statusCode;
    const success = statusCode < 400;
    
    // Record the metric
    performanceMonitor.recordMetric({
      operation: operationName,
      durationMs,
      timestamp: Date.now(),
      success,
      metadata: {
        requestId,
        method,
        url,
        statusCode,
        contentLength: res.getHeader('content-length'),
        userAgent: req.headers['user-agent']
      }
    });
    
    // Log slow API responses
    if (durationMs > 1000) { // 1 second threshold for slow API responses
      logger.warn(`Slow API response: ${method} ${url} took ${durationMs.toFixed(2)}ms`, {
        method,
        url,
        durationMs,
        statusCode
      });
    }
  });
  
  next();
}

/**
 * Middleware for tracking route-specific performance
 * @param routeName The name of the route for tracking
 * @returns A middleware function
 */
export function trackRoutePerformance(routeName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();
    
    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method
    const newEnd = function(this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void): Response {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      performanceMonitor.recordMetric({
        operation: `route_${routeName}`,
        durationMs,
        timestamp: Date.now(),
        success: res.statusCode < 400,
        metadata: {
          method: req.method,
          url: req.originalUrl || req.url,
          statusCode: res.statusCode
        }
      });
      
      // Call the original end method with proper handling of optional parameters
      if (typeof chunk === 'function') {
        return originalEnd.call(this, null, 'utf8', chunk as any);
      } else if (typeof encoding === 'function') {
        return originalEnd.call(this, chunk, 'utf8', encoding as any);
      } else {
        return originalEnd.call(this, chunk, encoding || 'utf8', cb);
      }
    };
    
    // Use type assertion to override the end method
    res.end = newEnd as typeof res.end;
    
    next();
  };
}