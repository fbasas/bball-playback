# Developer Guide for Baseball Playback Application

This guide provides instructions for common development tasks in the Baseball Playback application.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Running the Application](#running-the-application)
3. [Adding New Features](#adding-new-features)
4. [Testing](#testing)
5. [Database Operations](#database-operations)
6. [Working with the API](#working-with-the-api)
7. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- MySQL (v8 or higher)
- Git

### Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd bball-playback
   ```

2. Install dependencies:
   ```bash
   npm install
   cd frontend
   npm install
   cd ../backend
   npm install
   cd ..
   ```

3. Set up environment variables:
   - Create a `.env` file in the `backend` directory based on `.env.example`
   - Set your OpenAI API key in the `.env` file
   - Configure database connection details

4. Set up the database:
   ```bash
   cd backend
   npx knex migrate:latest
   ```

## Running the Application

### Backend

```bash
cd backend
npm run dev
```

The backend server will start on http://localhost:3001 by default.

### Frontend

```bash
cd frontend
npm run dev
```

The frontend development server will start on http://localhost:3000 by default.

### Full Stack Development

You can run both frontend and backend concurrently from the project root:

```bash
npm run dev
```

## Adding New Features

### General Workflow

1. Define shared types in `common/types/` if needed
2. Implement backend functionality
3. Implement frontend components
4. Test the feature
5. Document the feature

### Adding a New API Endpoint

1. Create a new route file in `backend/src/routes/game/` or an appropriate subdirectory
2. Define validation schemas in `backend/src/validation/schemas.ts` or `querySchemas.ts`
3. Implement the route handler with proper validation
4. Register the route in `backend/src/routes/game/index.ts`
5. Update OpenAPI documentation in `backend/src/routes/openapi.yaml`
6. Update API documentation in `backend/src/routes/API.md`

Example route file:

```typescript
import { RequestHandler } from 'express';
import { validateParams, validateQuery, validateHeaders } from '../../validation';
import { YourParamSchema, YourQuerySchema, SessionIdHeaderSchema } from '../../validation';

/**
 * Description of your endpoint
 * @returns {YourResponseType} Description of the response
 */
export const yourEndpoint: RequestHandler = async (req, res, next) => {
  try {
    // Implementation
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Apply validation middleware
export const yourEndpointRouter = Router();
yourEndpointRouter.get(
  '/:paramName',
  validateParams(YourParamSchema),
  validateQuery(YourQuerySchema),
  validateHeaders(SessionIdHeaderSchema),
  yourEndpoint
);
```

### Adding a New Service

1. Create a new service file in `backend/src/services/` or an appropriate subdirectory
2. Extend the `BaseService` class
3. Implement the service methods with proper validation and error handling
4. Add JSDoc comments for all methods

Example service file:

```typescript
import { BaseService } from '../BaseService';
import { validateExternalData } from '../../utils/TypeCheckUtils';
import { YourDataSchema } from '../../validation';

/**
 * Service for handling your functionality
 */
export class YourService extends BaseService {
  // Singleton instance
  private static instance: YourService;

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): YourService {
    if (!YourService.instance) {
      YourService.instance = new YourService();
    }
    return YourService.instance;
  }

  /**
   * Your method description
   * @param param1 Description of param1
   * @returns Description of return value
   */
  public async yourMethod(param1: string): Promise<YourReturnType> {
    // Implementation
    return result;
  }

  // Static method for backward compatibility
  public static async yourMethod(param1: string): Promise<YourReturnType> {
    return YourService.getInstance().yourMethod(param1);
  }
}
```

### Adding a New Frontend Component

1. Create a new component file in `frontend/src/components/`
2. Create a CSS file for the component if needed
3. Implement the component with TypeScript and React
4. Add the component to the appropriate parent component

Example component file:

```tsx
import React, { useState, useEffect } from 'react';
import './YourComponent.css';

interface YourComponentProps {
  prop1: string;
  prop2: number;
}

/**
 * YourComponent description
 */
export const YourComponent: React.FC<YourComponentProps> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Effect logic
  }, [prop1, prop2]);

  return (
    <div className="your-component">
      <h2>{prop1}</h2>
      <p>{state}</p>
    </div>
  );
};
```

## Testing

### Running Tests

#### Backend Tests

```bash
cd backend
npm test
```

#### Frontend Tests

```bash
cd frontend
npm test
```

### Writing Tests

#### Backend Tests

Create test files in `backend/src/__tests__/` or alongside the file being tested with a `.test.ts` extension.

Example test file:

```typescript
import { YourService } from '../services/YourService';

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    service = new YourService();
  });

  it('should do something', async () => {
    const result = await service.yourMethod('test');
    expect(result).toBe(expectedValue);
  });
});
```

#### Frontend Tests

Create test files in `frontend/src/components/__tests__/` with a `.test.tsx` extension.

Example test file:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent prop1="test" prop2={42} />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

## Database Operations

### Running Migrations

```bash
cd backend
npx knex migrate:latest
```

### Creating a New Migration

```bash
cd backend
npx knex migrate:make migration_name
```

This will create a new migration file in `backend/src/database/migrations/`.

Example migration file:

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('your_table', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('your_table');
}
```

### Creating a New Repository

1. Create a new repository file in `backend/src/database/repositories/`
2. Extend the `KnexRepository` or `CachedRepository` class
3. Implement the repository methods

Example repository file:

```typescript
import { KnexRepository } from './KnexRepository';
import { CacheManager } from '../../core/caching';

export class YourRepository extends KnexRepository {
  private static instance: YourRepository;
  private cache: CacheManager<YourType>;

  private constructor() {
    super('your_table');
    this.cache = new CacheManager<YourType>('your_entity', 100, 3600);
  }

  public static getInstance(): YourRepository {
    if (!YourRepository.instance) {
      YourRepository.instance = new YourRepository();
    }
    return YourRepository.instance;
  }

  public async getById(id: string): Promise<YourType | null> {
    return this.cache.getOrCompute(
      `id:${id}`,
      async () => {
        const result = await this.db(this.tableName)
          .where({ id })
          .first();
        return result || null;
      }
    );
  }
}

export const yourRepository = YourRepository.getInstance();
```

## Working with the API

### Making API Requests

The frontend uses the Fetch API to make requests to the backend:

```typescript
const fetchData = async (gameId: string) => {
  try {
    const response = await fetch(`/api/game/info/${gameId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};
```

### API Documentation

The API is documented using OpenAPI/Swagger. You can view the documentation by:

1. Starting the backend server
2. Visiting `/api-docs` in your browser

## Troubleshooting

### Common Issues

#### Backend Won't Start

- Check if the port is already in use
- Verify database connection settings in `.env`
- Check for syntax errors in recently modified files

#### Frontend Build Errors

- Clear the node_modules folder and reinstall dependencies
- Check for TypeScript errors
- Verify that all required environment variables are set

#### Database Connection Issues

- Verify database credentials in `.env`
- Check if the MySQL server is running
- Ensure the database exists and the user has appropriate permissions

### Debugging

#### Backend Debugging

1. Use the VSCode "Debug Backend" configuration
2. Set breakpoints in your code
3. Check logs in the console or log files

#### Frontend Debugging

1. Use the browser's developer tools
2. Set breakpoints in the Sources tab
3. Check the Console for errors

### Logging

The application uses a structured logging system:

```typescript
import { logger, contextLogger } from '../core/logging';

// Basic logging
logger.info('This is an info message');
logger.error('This is an error message', { error });

// Context-specific logging
const routeLogger = contextLogger({
  route: 'yourEndpoint',
  gameId: req.params.gameId
});
routeLogger.info('Processing request', { additionalData });
```

Log levels:
- `error`: For errors that require immediate attention
- `warn`: For warnings that don't require immediate action
- `info`: For general information about application operation
- `http`: For HTTP request logging
- `debug`: For detailed debugging information