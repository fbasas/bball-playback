# Caching Mechanism

This directory contains the implementation of the caching mechanism used throughout the bball-playback application.

## Overview

The caching mechanism provides a way to store and retrieve frequently accessed data without hitting the database. This improves performance and reduces database load, especially for data that doesn't change frequently.

## Features

- In-memory caching with configurable TTL (time-to-live)
- Automatic cache invalidation based on TTL
- LRU (Least Recently Used) eviction policy when the cache reaches its maximum size
- Support for different cache stores for different data types
- Type-safe API with TypeScript generics

## Components

- `CacheManager.ts`: The main class that implements the caching mechanism
- `index.ts`: Exports from the caching module

## Usage

### Basic Usage

```typescript
import { CacheManager } from '../../core/caching';

// Create a cache manager
const cache = new CacheManager<string, User>({
  ttl: 300000, // 5 minutes
  maxSize: 1000 // Maximum 1000 items
});

// Set a value
cache.set('user:123', user);

// Get a value
const user = cache.get('user:123');

// Check if a key exists
const exists = cache.has('user:123');

// Delete a value
cache.delete('user:123');

// Clear the cache
cache.clear();
```

### Advanced Usage: Get or Compute

The `getOrCompute` method provides a convenient way to get a value from the cache or compute it if it doesn't exist:

```typescript
const user = await cache.getOrCompute('user:123', async () => {
  // This function is only called if the key doesn't exist in the cache
  return await fetchUserFromDatabase('123');
});
```

### Global Cache Instances

The caching module provides pre-configured cache instances for common data types:

```typescript
import { caches } from '../../core/caching';

// Use the players cache
const player = caches.players.get('player:123');

// Use the teams cache
const team = caches.teams.get('team:NYA');
```

## Configuration

The `CacheManager` constructor accepts an options object with the following properties:

- `ttl`: Time-to-live in milliseconds (default: 300000, or 5 minutes)
- `maxSize`: Maximum number of items to store in the cache (default: 1000)

## Best Practices

1. Use appropriate TTL values based on how frequently the data changes
2. Use different cache instances for different data types
3. Consider cache invalidation when data is updated
4. Use the `getOrCompute` method to avoid race conditions
5. Monitor cache hit/miss rates in production