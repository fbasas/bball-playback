# Error Handling and Logging System

This directory contains a centralized error handling and logging system for the Baseball Playback API. The system provides consistent error responses, better error tracking, and structured logging for improved debugging and monitoring.

## Directory Structure

```
core/
├── errors/
│   ├── ApiError.ts       # API-specific error classes
│   ├── BaseError.ts      # Base error class
│   ├── DomainError.ts    # Domain-specific error classes
│   ├── ErrorHandler.ts   # Central error handler
│   ├── ErrorMiddleware.ts # Express error middleware
│   └── index.ts          # Re-exports all error modules
├── logging/
│   ├── HttpLogger.ts     # HTTP request logging middleware
│   ├── Logger.ts         # Winston logger configuration
│   └── index.ts          # Re-exports all logging modules
└── README.md             # This file
```

## Error Handling

### Error Classes

The error handling system is built around a hierarchy of error classes:

- `BaseError`: The base class for all application errors, extending the built-in `Error` class with additional properties like `httpCode` and `isOperational`.
- `ApiError`: API-specific error classes like `BadRequestError`, `NotFoundError`, etc.
- `DomainError`: Domain-specific error classes like `ValidationError`, `DatabaseError`, etc.

### Error Middleware

The system includes Express middleware for handling errors:

- `errorMiddleware`: Handles errors thrown in route handlers and sends appropriate responses to clients.
- `notFoundMiddleware`: Handles 404 errors for undefined routes.
- `setupErrorHandlers`: Sets up process-level handlers for uncaught exceptions and unhandled rejections.

### Usage

To use the error handling system in route handlers:

```typescript
import { ValidationError, NotFoundError } from '../core/errors';

export const someRoute: RequestHandler = (req, res, next) => {
  try {
    // Validate input
    if (!req.body.requiredField) {
      throw new ValidationError('requiredField is required');
    }
    
    // Business logic
    const resource = findResource(req.params.id);
    if (!resource) {
      throw new NotFoundError(`Resource with ID ${req.params.id} not found`);
    }
    
    // Success response
    res.json(resource);
  } catch (error) {
    // Pass the error to the error handling middleware
    next(error);
  }
};
```

## Logging

### Logger Configuration

The logging system uses Winston for structured logging with different log levels:

- `error`: For errors that require immediate attention
- `warn`: For warnings that don't require immediate attention
- `info`: For informational messages about application state
- `http`: For HTTP request/response logging
- `debug`: For detailed debugging information

Logs are written to both the console and log files:

- `logs/error.log`: Contains only error-level logs
- `logs/combined.log`: Contains all logs

### Context Logger

The system includes a context logger that allows adding context to logs:

```typescript
import { contextLogger } from '../core/logging';

// Create a context-specific logger
const routeLogger = contextLogger({ 
  route: 'getUser', 
  userId: req.params.userId 
});

// Use the context logger
routeLogger.info('User profile accessed');
routeLogger.error('Failed to update user profile', { error });
```

### HTTP Request Logging

The system includes middleware for logging HTTP requests:

- `httpLogger`: Express middleware that logs all HTTP requests using Winston
- `simpleHttpLogger`: A simpler alternative that provides more control over what's logged

## Integration

The error handling and logging system is integrated into the application in `bball-playback.ts`:

```typescript
import { httpLogger, logger } from './core/logging';
import { errorMiddleware, notFoundMiddleware, setupErrorHandlers } from './core/errors';

// Add HTTP request logging
app.use(httpLogger);

// Routes
app.use('/api/game', GameRouter);
app.use('/test', TestRouter);

// Add 404 handler for undefined routes
app.use(notFoundMiddleware);

// Add error handling middleware
app.use(errorMiddleware);

// Set up process-level error handlers
setupErrorHandlers();