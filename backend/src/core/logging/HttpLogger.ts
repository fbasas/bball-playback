import { Request, Response, NextFunction } from 'express';
import expressWinston from 'express-winston';
import { logger, stream } from './Logger';

/**
 * Express middleware for logging HTTP requests
 * This should be registered before routes
 */
export const httpLogger = expressWinston.logger({
  winstonInstance: logger,
  meta: true,
  msg: 'HTTP {{req.method}} {{req.url}}',
  expressFormat: true,
  colorize: true,
  // Don't log body for these content types
  ignoreRoute: (req: Request) => {
    const contentType = req.headers['content-type'] || '';
    return contentType.includes('multipart/form-data') || 
           contentType.includes('application/octet-stream');
  },
});

/**
 * Simple middleware for logging HTTP requests
 * Alternative to expressWinston if you want more control
 */
export const simpleHttpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request
  logger.http({
    message: `Incoming request: ${req.method} ${req.url}`,
    context: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
        'accept': req.headers['accept'],
      },
      // Only log body for certain content types
      ...(shouldLogBody(req) && { body: req.body }),
    }
  });
  
  // Add response logging
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const duration = Date.now() - start;
    
    logger.http({
      message: `Outgoing response: ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`,
      context: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      }
    });
    
    res.end = originalEnd;
    return originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Helper function to determine if request body should be logged
 */
function shouldLogBody(req: Request): boolean {
  // Don't log body for multipart/form-data or binary data
  const contentType = req.headers['content-type'] || '';
  if (
    contentType.includes('multipart/form-data') || 
    contentType.includes('application/octet-stream')
  ) {
    return false;
  }
  
  // Don't log body for large payloads
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 10000) { // Don't log bodies larger than ~10KB
    return false;
  }
  
  return true;
}