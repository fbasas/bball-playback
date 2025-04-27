# Configuration Management System

This directory contains the configuration management system for the Baseball Playback application. The system provides a robust, type-safe, and environment-aware configuration management solution.

## Features

### 1. Configuration Validation

The configuration system validates all configuration values at startup to ensure that:
- Required configuration values are present
- Configuration values are of the correct type and format
- Invalid configurations are caught early, preventing runtime errors

### 2. Environment-Specific Configurations

The system supports different environments:
- Development: For local development
- Test: For automated testing
- Production: For production deployment

Each environment has its own configuration file with appropriate defaults.

### 3. Feature Flags

The system includes a feature flag system that allows for:
- Gradual rollout of features
- Enabling/disabling features based on configuration
- User-specific or percentage-based feature rollouts
- A/B testing capabilities

### 4. Secret Management

The system provides secure handling of sensitive configuration values:
- Loads secrets from environment variables or secure files
- Provides a consistent API for accessing secrets
- Supports caching for performance optimization
- Validates required secrets at startup

## Usage

### Basic Configuration

```typescript
import { config, environment } from './config/config';

// Access configuration values
const port = config.port;
const dbHost = config.database.host;

// Check current environment
if (environment === 'development') {
  // Development-specific code
}
```

### Feature Flags

```typescript
import { isFeatureEnabled } from './config/config';

// Check if a feature is enabled
if (isFeatureEnabled('enhancedCommentary')) {
  // Use enhanced commentary
}

// Check with user context for percentage-based rollouts
const userContext = { userId: 'user123', groups: ['beta-testers'] };
if (isFeatureEnabled('experimentalUi', userContext)) {
  // Show experimental UI
}
```

### Secret Management

```typescript
import { getSecret, getRequiredSecret } from './config/config';

// Get a secret (returns undefined if not found)
const apiKey = await getSecret('API_KEY');

// Get a required secret (throws error if not found)
const dbPassword = await getRequiredSecret('DB_PASSWORD');
```

## Configuration Files

- `config.ts`: Main configuration file that initializes and exports the configuration
- `validation.ts`: Configuration validation using Zod schemas
- `featureFlags.ts`: Feature flag system implementation
- `secrets.ts`: Secret management system implementation
- `environments/`: Directory containing environment-specific configurations
  - `development.ts`: Development environment configuration
  - `production.ts`: Production environment configuration
  - `test.ts`: Test environment configuration
  - `index.ts`: Environment utilities and exports

## Best Practices

1. **Always validate configuration values** at startup to catch issues early
2. **Use environment variables** for environment-specific values
3. **Keep secrets out of the codebase** and load them from environment variables or secure storage
4. **Use feature flags** for gradual rollout of new features
5. **Document configuration options** in code comments and README files