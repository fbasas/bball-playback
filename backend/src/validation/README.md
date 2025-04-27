# Validation System

This module provides a comprehensive validation system for the Baseball Playback application using Zod.

## Overview

The validation system ensures type safety and data integrity throughout the application by:

1. Validating API request/response data
2. Validating external data from databases or third-party services
3. Providing runtime type checking utilities
4. Enforcing consistent error handling for validation failures

## Components

### Schemas (`schemas.ts`)

Contains Zod schemas for all data types used in the application, including:

- Base types (Team, Player, etc.)
- API request/response types
- Database entity types

These schemas define the shape and constraints of data, ensuring type safety and data integrity.

### Query Schemas (`querySchemas.ts`)

Contains Zod schemas specifically for validating query parameters, path parameters, and headers in API requests.

### Middleware (`middleware.ts`)

Express middleware for validating request data against Zod schemas:

- `validateBody`: Validates request body
- `validateQuery`: Validates query parameters
- `validateParams`: Validates path parameters
- `validateHeaders`: Validates request headers

### Type Utilities (`typeUtils.ts`)

Utilities for working with Zod schemas and type checking:

- `validateExternalData`: Validates external data against a schema and throws a ValidationError if validation fails
- `safeValidateExternalData`: Validates external data against a schema and returns null if validation fails
- Type guard functions for runtime type checking

## Usage Examples

### API Route Validation

```typescript
import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../validation';
import { CreateGameRequestSchema, NextPlayQuerySchema, GameIdParamSchema } from '../validation';

const router = Router();

// Validate request body
router.post('/createGame', validateBody(CreateGameRequestSchema), createGameHandler);

// Validate query parameters and path parameters
router.get(
  '/next/:gameId',
  validateParams(GameIdParamSchema),
  validateQuery(NextPlayQuerySchema),
  getNextPlayHandler
);
```

### External Data Validation

```typescript
import { validateExternalData, PlayDataSchema } from '../validation';

// Validate data from database
const playData = await playRepository.fetchFirstPlay(gameId);
const validatedPlayData = validateExternalData(
  PlayDataSchema,
  playData,
  `play data for game ${gameId}`
);
```

### Safe Validation

```typescript
import { safeValidateExternalData, PlayDataSchema } from '../validation';

// Safely validate data, returning null if validation fails
const playData = await playRepository.fetchPlayForBatter(gameId, batter);
const validatedPlayData = safeValidateExternalData(
  PlayDataSchema,
  playData,
  `play data for batter ${batter}`
);

if (validatedPlayData) {
  // Use the validated data
} else {
  // Handle the case where validation failed
}
```

## Benefits

- **Type Safety**: Ensures data conforms to expected types at runtime
- **Consistent Validation**: Centralizes validation logic in one place
- **Better Error Messages**: Provides detailed error messages for validation failures
- **Reduced Boilerplate**: Eliminates repetitive validation code
- **Self-Documenting**: Schemas serve as documentation for data structures