# Testing Guide for Baseball Playback Application

This guide provides information about testing procedures and best practices for the Baseball Playback application.

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Test Types](#test-types)
3. [Running Tests](#running-tests)
4. [Writing Tests](#writing-tests)
5. [Test Coverage](#test-coverage)
6. [Mocking](#mocking)
7. [Integration Testing](#integration-testing)
8. [End-to-End Testing](#end-to-end-testing)
9. [Performance Testing](#performance-testing)
10. [Troubleshooting](#troubleshooting)

## Testing Overview

The Baseball Playback application uses a comprehensive testing strategy that includes:

- **Unit Tests**: Testing individual components and functions in isolation
- **Integration Tests**: Testing interactions between components
- **End-to-End Tests**: Testing the complete application flow
- **Performance Tests**: Testing application performance under load

The testing framework uses Jest for both backend and frontend tests, with React Testing Library for frontend component testing and Cypress for end-to-end testing.

## Test Types

### Unit Tests

Unit tests focus on testing individual functions, methods, and components in isolation. They should:

- Test a single unit of code
- Be fast and deterministic
- Use mocks for external dependencies
- Cover edge cases and error conditions

### Integration Tests

Integration tests verify that different parts of the application work together correctly. They:

- Test interactions between components
- May involve multiple services or repositories
- Often use a test database
- Verify correct data flow between components

### End-to-End Tests

End-to-end tests validate the entire application flow from the user's perspective. They:

- Simulate user interactions
- Test complete features
- Verify the application works as a whole
- Run in a browser environment

### Performance Tests

Performance tests evaluate the application's performance characteristics. They:

- Measure response times
- Test under various load conditions
- Identify bottlenecks
- Verify caching mechanisms

## Running Tests

### Backend Tests

To run all backend tests:

```bash
cd backend
npm test
```

To run a specific test file:

```bash
cd backend
npm test -- src/services/__tests__/BaseService.test.ts
```

To run tests with coverage:

```bash
cd backend
npm run test:coverage
```

### Frontend Tests

To run all frontend tests:

```bash
cd frontend
npm test
```

To run a specific test file:

```bash
cd frontend
npm test -- src/components/__tests__/Scoreboard.test.tsx
```

To run tests with coverage:

```bash
cd frontend
npm run test:coverage
```

### End-to-End Tests

To run Cypress tests:

```bash
# Start the application in test mode
npm run start:test

# In a separate terminal
npm run cypress:open
```

## Writing Tests

### Backend Test Structure

Backend tests should follow this structure:

```typescript
import { YourService } from '../YourService';
import { mockDependency } from '../../__mocks__/mockDependency';

describe('YourService', () => {
  let service: YourService;
  
  beforeEach(() => {
    // Set up the service with mock dependencies
    service = new YourService({
      dependency: mockDependency
    });
  });
  
  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });
  
  describe('yourMethod', () => {
    it('should return expected result when given valid input', async () => {
      // Arrange
      const input = 'validInput';
      const expectedOutput = 'expectedResult';
      mockDependency.someMethod.mockResolvedValue('mockResult');
      
      // Act
      const result = await service.yourMethod(input);
      
      // Assert
      expect(result).toBe(expectedOutput);
      expect(mockDependency.someMethod).toHaveBeenCalledWith(input);
    });
    
    it('should throw an error when given invalid input', async () => {
      // Arrange
      const input = null;
      
      // Act & Assert
      await expect(service.yourMethod(input)).rejects.toThrow('Invalid input');
    });
  });
});
```

### Frontend Test Structure

Frontend component tests should follow this structure:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('should render correctly with default props', () => {
    // Arrange & Act
    render(<YourComponent prop1="value1" />);
    
    // Assert
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interaction correctly', () => {
    // Arrange
    const mockHandler = jest.fn();
    render(<YourComponent prop1="value1" onAction={mockHandler} />);
    
    // Act
    fireEvent.click(screen.getByRole('button', { name: 'Action Button' }));
    
    // Assert
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
  
  it('should display loading state when isLoading is true', () => {
    // Arrange & Act
    render(<YourComponent prop1="value1" isLoading={true} />);
    
    // Assert
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### End-to-End Test Structure

Cypress tests should follow this structure:

```javascript
describe('Game Playback', () => {
  beforeEach(() => {
    // Set up the test environment
    cy.visit('/');
  });
  
  it('should initialize a game and display the first play', () => {
    // Arrange
    cy.intercept('GET', '/api/game/init/*', { fixture: 'gameInit.json' }).as('initGame');
    
    // Act
    cy.get('[data-testid="game-id-input"]').type('CIN201904150');
    cy.get('[data-testid="start-game-button"]').click();
    
    // Assert
    cy.wait('@initGame');
    cy.get('[data-testid="scoreboard"]').should('be.visible');
    cy.get('[data-testid="inning-display"]').should('contain', '1st');
    cy.get('[data-testid="outs-display"]').should('contain', '0 out');
  });
  
  it('should advance to the next play when the next button is clicked', () => {
    // Arrange
    cy.intercept('GET', '/api/game/init/*', { fixture: 'gameInit.json' }).as('initGame');
    cy.intercept('GET', '/api/game/next/*', { fixture: 'nextPlay.json' }).as('nextPlay');
    
    // Act
    cy.get('[data-testid="game-id-input"]').type('CIN201904150');
    cy.get('[data-testid="start-game-button"]').click();
    cy.wait('@initGame');
    cy.get('[data-testid="next-play-button"]').click();
    
    // Assert
    cy.wait('@nextPlay');
    cy.get('[data-testid="game-log"]').should('contain', 'Almora flies out to center field');
  });
});
```

## Test Coverage

The project aims for high test coverage, with a target of at least:

- 80% statement coverage
- 70% branch coverage
- 80% function coverage
- 80% line coverage

To view coverage reports:

1. Run tests with coverage (see [Running Tests](#running-tests))
2. Open the coverage report:
   - Backend: `backend/coverage/lcov-report/index.html`
   - Frontend: `frontend/coverage/lcov-report/index.html`

## Mocking

### Mocking Dependencies

Use Jest's mocking capabilities to mock dependencies:

```typescript
// Manual mocks
const mockRepository = {
  getById: jest.fn(),
  getAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// Automatic mocks
jest.mock('../../database/repositories/YourRepository', () => ({
  yourRepository: {
    getById: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));
```

### Mocking API Responses

For frontend tests, mock API responses using MSW (Mock Service Worker):

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/game/init/:gameId', (req, res, ctx) => {
    return res(ctx.json({ /* mock response data */ }));
  }),
  
  rest.get('/api/game/next/:gameId', (req, res, ctx) => {
    return res(ctx.json({ /* mock response data */ }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Mocking OpenAI API

For tests involving the OpenAI API, use a mock implementation:

```typescript
jest.mock('../../services/openai', () => ({
  generateCompletion: jest.fn().mockResolvedValue('Mock AI-generated commentary')
}));
```

## Integration Testing

### Database Integration Tests

For tests that interact with the database:

1. Use a separate test database
2. Set up the database before tests
3. Clean up after tests
4. Use transactions to isolate tests

Example:

```typescript
import { db } from '../../config/database';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Set up test database
    await db.migrate.latest();
  });
  
  beforeEach(async () => {
    // Start a transaction
    await db.raw('BEGIN');
  });
  
  afterEach(async () => {
    // Roll back the transaction
    await db.raw('ROLLBACK');
  });
  
  afterAll(async () => {
    // Close the database connection
    await db.destroy();
  });
  
  it('should retrieve data from the database', async () => {
    // Arrange
    await db('players').insert({ id: 'test001', firstName: 'Test', lastName: 'Player' });
    
    // Act
    const result = await playerRepository.getPlayerById('test001');
    
    // Assert
    expect(result).toEqual({
      id: 'test001',
      firstName: 'Test',
      lastName: 'Player',
      fullName: 'Test Player'
    });
  });
});
```

### API Integration Tests

For testing API endpoints:

1. Use supertest to make HTTP requests
2. Mock external services
3. Verify response status and body

Example:

```typescript
import request from 'supertest';
import { app } from '../../app';
import { db } from '../../config/database';

jest.mock('../../services/openai', () => ({
  generateCompletion: jest.fn().mockResolvedValue('Mock AI-generated commentary')
}));

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Set up test database
    await db.migrate.latest();
  });
  
  beforeEach(async () => {
    // Start a transaction
    await db.raw('BEGIN');
    // Seed test data
    await db('games').insert({ /* test game data */ });
  });
  
  afterEach(async () => {
    // Roll back the transaction
    await db.raw('ROLLBACK');
  });
  
  afterAll(async () => {
    // Close the database connection
    await db.destroy();
  });
  
  it('should return game data when initializing a game', async () => {
    // Act
    const response = await request(app)
      .get('/api/game/init/TEST001')
      .set('session-id', 'test-session-id');
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('gameId', 'TEST001');
    expect(response.body).toHaveProperty('game');
    expect(response.body.game).toHaveProperty('inning', 1);
  });
});
```

## End-to-End Testing

### Cypress Best Practices

1. Use data attributes for test selectors:
   ```html
   <button data-testid="next-play-button">Next Play</button>
   ```

2. Intercept network requests to make tests deterministic:
   ```javascript
   cy.intercept('GET', '/api/game/next/*', { fixture: 'nextPlay.json' }).as('nextPlay');
   ```

3. Wait for network requests to complete:
   ```javascript
   cy.wait('@nextPlay');
   ```

4. Use custom commands for common operations:
   ```javascript
   // In cypress/support/commands.js
   Cypress.Commands.add('initializeGame', (gameId) => {
     cy.get('[data-testid="game-id-input"]').type(gameId);
     cy.get('[data-testid="start-game-button"]').click();
     cy.wait('@initGame');
   });
   
   // In your test
   cy.initializeGame('CIN201904150');
   ```

### Example Cypress Test

```javascript
describe('Baseball Playback', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.intercept('POST', '/api/game/createGame', { fixture: 'createGame.json' }).as('createGame');
    cy.intercept('GET', '/api/game/init/*', { fixture: 'gameInit.json' }).as('initGame');
    cy.intercept('GET', '/api/game/next/*', { fixture: 'nextPlay.json' }).as('nextPlay');
  });
  
  it('should play through a complete game', () => {
    // Create a new game
    cy.get('[data-testid="home-team-select"]').select('CIN');
    cy.get('[data-testid="visiting-team-select"]').select('CHN');
    cy.get('[data-testid="create-game-button"]').click();
    cy.wait('@createGame');
    
    // Initialize the game
    cy.get('[data-testid="start-game-button"]').click();
    cy.wait('@initGame');
    
    // Verify initial state
    cy.get('[data-testid="inning-display"]').should('contain', '1st');
    cy.get('[data-testid="outs-display"]').should('contain', '0 out');
    cy.get('[data-testid="home-team-score"]').should('contain', '0');
    cy.get('[data-testid="visiting-team-score"]').should('contain', '0');
    
    // Advance to the next play
    cy.get('[data-testid="next-play-button"]').click();
    cy.wait('@nextPlay');
    
    // Verify updated state
    cy.get('[data-testid="game-log"]').should('contain', 'Almora flies out to center field');
    cy.get('[data-testid="outs-display"]').should('contain', '1 out');
  });
});
```

## Performance Testing

### Response Time Testing

Use Jest with a custom timer to measure response times:

```typescript
describe('Performance Tests', () => {
  it('should retrieve play data within acceptable time', async () => {
    // Arrange
    const gameId = 'CIN201904150';
    const currentPlay = 42;
    const startTime = Date.now();
    
    // Act
    await PlayDataService.fetchPlayData(gameId, currentPlay);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Assert
    expect(responseTime).toBeLessThan(100); // Response time should be less than 100ms
  });
});
```

### Load Testing

Use a load testing tool like Artillery or k6 to test the API under load:

```javascript
// k6 script example
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10, // 10 virtual users
  duration: '30s', // Test duration
};

export default function () {
  const gameId = 'CIN201904150';
  const sessionId = 'test-session-id';
  
  // Initialize game
  const initResponse = http.get(`http://localhost:3001/api/game/init/${gameId}`, {
    headers: { 'session-id': sessionId }
  });
  
  check(initResponse, {
    'init status is 200': (r) => r.status === 200,
    'init response has gameId': (r) => JSON.parse(r.body).gameId === gameId
  });
  
  sleep(1);
  
  // Get next play
  const nextResponse = http.get(`http://localhost:3001/api/game/next/${gameId}?currentPlay=0`, {
    headers: { 'session-id': sessionId }
  });
  
  check(nextResponse, {
    'next status is 200': (r) => r.status === 200,
    'next response has currentPlay': (r) => JSON.parse(r.body).currentPlay === 1
  });
  
  sleep(1);
}
```

### Cache Performance Testing

Test the effectiveness of the caching system:

```typescript
describe('Cache Performance Tests', () => {
  it('should be faster on subsequent calls due to caching', async () => {
    // Arrange
    const gameId = 'CIN201904150';
    const playerId = 'vottj001';
    
    // Act - First call (no cache)
    const startTime1 = Date.now();
    await PlayerService.getPlayerById(playerId);
    const endTime1 = Date.now();
    const firstCallTime = endTime1 - startTime1;
    
    // Act - Second call (should use cache)
    const startTime2 = Date.now();
    await PlayerService.getPlayerById(playerId);
    const endTime2 = Date.now();
    const secondCallTime = endTime2 - startTime2;
    
    // Assert
    expect(secondCallTime).toBeLessThan(firstCallTime * 0.5); // Should be at least 50% faster
  });
});
```

## Troubleshooting

### Common Test Issues

1. **Tests failing intermittently**
   - Check for race conditions
   - Ensure proper cleanup between tests
   - Verify that tests are not dependent on each other

2. **Mock not working**
   - Verify the mock path matches the import path
   - Check that the mock is set up before the test runs
   - Ensure the mock is reset between tests

3. **Database tests failing**
   - Verify database connection settings
   - Check that migrations are running
   - Ensure proper transaction handling

4. **Timeout errors**
   - Increase the test timeout for long-running tests
   - Check for infinite loops or unresolved promises
   - Verify that external services are properly mocked

### Debugging Tests

1. Use console.log for simple debugging:
   ```typescript
   console.log('Test data:', result);
   ```

2. Use the debugger with VS Code:
   - Set breakpoints in your test files
   - Use the "Debug Jest Tests" configuration
   - Step through the code to identify issues

3. Use Jest's --verbose flag for more detailed output:
   ```bash
   npm test -- --verbose
   ```

4. Isolate failing tests with .only:
   ```typescript
   it.only('should work correctly', () => {
     // Only this test will run
   });