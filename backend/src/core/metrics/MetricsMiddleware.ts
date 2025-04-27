import { Request, Response, NextFunction } from 'express';
import { metricsCollector } from './MetricsCollector';
import { logger } from '../logging';

/**
 * Middleware for tracking API endpoint metrics
 * @param req The request object
 * @param res The response object
 * @param next The next function
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = performance.now();
  const url = req.originalUrl || req.url;
  const method = req.method;
  const path = url.split('?')[0]; // Remove query parameters
  
  // Add a unique request ID for tracking if not already present
  const requestId = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = requestId as string;
  }
  
  // Increment request counter
  metricsCollector.incrementCounter('app.request_count', 1, {
    method,
    path,
    requestId: requestId as string
  });
  
  // Store the start time on the request object
  (req as any).metricsStartTime = startTime;
  
  // Track response time
  res.on('finish', () => {
    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const statusCode = res.statusCode;
    const statusCategory = Math.floor(statusCode / 100) * 100; // e.g., 200, 400, 500
    
    // Record request duration
    metricsCollector.recordHistogram('app.request_duration', durationMs, {
      method,
      path,
      status: statusCode.toString(),
      statusCategory: statusCategory.toString()
    });
    
    // Track status codes
    metricsCollector.incrementCounter('app.status_codes', 1, {
      method,
      path,
      status: statusCode.toString(),
      statusCategory: statusCategory.toString()
    });
    
    // Track response size if available
    const contentLength = res.getHeader('content-length');
    if (contentLength) {
      metricsCollector.recordHistogram('app.response_size', parseInt(contentLength as string), {
        method,
        path
      });
    }
    
    // Track errors
    if (statusCode >= 400) {
      metricsCollector.incrementCounter('app.errors', 1, {
        method,
        path,
        status: statusCode.toString(),
        statusCategory: statusCategory.toString()
      });
      
      // Log error details for 5xx errors
      if (statusCode >= 500) {
        logger.error(`Server error in ${method} ${path}`, {
          statusCode,
          durationMs,
          requestId
        });
      }
    }
    
    // Track slow requests
    if (durationMs > 1000) { // 1 second threshold
      metricsCollector.incrementCounter('app.slow_requests', 1, {
        method,
        path
      });
      
      logger.warn(`Slow request: ${method} ${path} took ${durationMs.toFixed(2)}ms`, {
        method,
        path,
        durationMs,
        statusCode,
        requestId
      });
    }
  });
  
  next();
}

/**
 * Middleware for tracking route-specific metrics
 * @param routeName The name of the route for tracking
 * @returns A middleware function
 */
export function trackRouteMetrics(routeName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();
    const method = req.method;
    
    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method
    const newEnd = function(this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void): Response {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      const statusCode = res.statusCode;
      
      // Record route-specific metrics
      metricsCollector.recordHistogram(`route.${routeName}.duration`, durationMs, {
        method,
        status: statusCode.toString()
      });
      
      metricsCollector.incrementCounter(`route.${routeName}.requests`, 1, {
        method,
        status: statusCode.toString()
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

/**
 * Middleware for tracking baseball-specific metrics
 * @param gameId The game ID
 * @returns A middleware function
 */
export function trackBaseballMetrics(gameId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = performance.now();
    const method = req.method;
    const path = req.path;
    
    // Store the original end method
    const originalEnd = res.end;
    
    // Override the end method
    const newEnd = function(this: Response, chunk?: any, encoding?: BufferEncoding, cb?: () => void): Response {
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      const statusCode = res.statusCode;
      
      // Record baseball-specific metrics
      metricsCollector.recordHistogram('baseball.api_request_duration', durationMs, {
        game_id: gameId,
        endpoint: path,
        method,
        status: statusCode.toString()
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