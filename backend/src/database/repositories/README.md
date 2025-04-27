# Repository Pattern Implementation

This directory contains the implementation of the repository pattern for database access in the bball-playback application.

## Overview

The repository pattern is a design pattern that abstracts the data access layer from the rest of the application. It provides a clean separation of concerns and makes it easier to:

1. Centralize database access logic
2. Optimize queries
3. Implement caching
4. Test the application without hitting the database
5. Switch database providers if needed

## Structure

- `Repository.ts`: Defines the base repository interface and abstract class
- `KnexRepository.ts`: Implements the base repository using Knex.js
- `CachedRepository.ts`: Extends the Knex repository with caching capabilities
- `PlayerRepository.ts`: Repository for player data
- `PlayRepository.ts`: Repository for play data
- `ScoreRepository.ts`: Repository for score calculations
- `GameRepository.ts`: Repository for game and team data

## Caching

The repositories use a caching mechanism to reduce database load and improve performance. The caching is implemented in the `CachedRepository` class, which extends the `KnexRepository` class.

The caching mechanism:

- Uses in-memory caching with configurable TTL (time-to-live)
- Automatically invalidates cache entries when data is updated
- Supports different cache stores for different entity types
- Handles cache misses by fetching data from the database

## Usage

Services should use the repositories instead of directly accessing the database. For example:

```typescript
// Before
const player = await db('allplayers').where({ id: playerId }).first();

// After
const player = await playerRepository.getPlayerById(playerId);
```

## Optimizations

The repositories include optimized query methods that:

1. Use more efficient SQL queries
2. Leverage caching for frequently accessed data
3. Batch operations where possible
4. Use appropriate indexes

For example, the `ScoreRepository` includes an optimized `calculateScoreOptimized` method that uses a more efficient query to calculate scores.

## Adding New Repositories

To add a new repository:

1. Create a new file in this directory
2. Extend the appropriate base repository class
3. Implement the required methods
4. Export a singleton instance
5. Add the export to `index.ts`