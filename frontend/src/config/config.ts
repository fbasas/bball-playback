import { initializeFeatureFlags, FeatureFlags, isFeatureEnabled } from './featureFlags';

interface Config {
  environment: 'development' | 'production' | 'test';
  api: {
    baseUrl: string;
    endpoints: {
      initGame: string;
      nextPlay: string;
      createGame?: string;
    };
  };
  featureFlags?: FeatureFlags;
}

type Environment = 'development' | 'production' | 'test';

// Get the current environment
const getEnvironment = (): Environment => {
  // Check for environment variable, defaulting to 'development'
  const env = (window as any)?.env?.NODE_ENV || 'development';
  
  // Validate that it's one of our expected environments
  if (env === 'production' || env === 'development' || env === 'test') {
    return env;
  }
  return 'development';
};

// Default configuration for development
const defaultConfig: Config = {
  environment: 'development',
  api: {
    baseUrl: 'http://localhost:3001',
    endpoints: {
      initGame: '/api/game/init',
      nextPlay: '/api/game/next',
      createGame: '/api/game/createGame',
    },
  },
  featureFlags: {
    enhancedScoreboard: {
      enabled: true,
      description: 'Enhanced scoreboard with more detailed statistics',
    },
    experimentalUi: {
      enabled: false,
      description: 'Experimental UI features',
      rolloutPercentage: 0,
    },
    detailedPlayByPlay: {
      enabled: true,
      description: 'Detailed play-by-play commentary',
    }
  }
};

// Production configuration
const productionConfig: Config = {
  environment: 'production',
  api: {
    baseUrl: 'https://prod-api-for-bball-playback.com',
    endpoints: {
      initGame: '/api/v1/game/init',
      nextPlay: '/api/v1/game/next',
      createGame: '/api/v1/game/createGame',
    },
  },
  featureFlags: {
    enhancedScoreboard: {
      enabled: true,
      description: 'Enhanced scoreboard with more detailed statistics',
    },
    experimentalUi: {
      enabled: false,
      description: 'Experimental UI features',
      rolloutPercentage: 10, // Only 10% of users in production
    },
    detailedPlayByPlay: {
      enabled: true,
      description: 'Detailed play-by-play commentary',
    }
  }
};

// Test configuration
const testConfig: Config = {
  environment: 'test',
  api: {
    baseUrl: 'http://localhost:3002',
    endpoints: {
      initGame: '/api/test/game/init',
      nextPlay: '/api/test/game/next',
      createGame: '/api/test/game/createGame',
    },
  },
  featureFlags: {
    enhancedScoreboard: {
      enabled: true,
      description: 'Enhanced scoreboard with more detailed statistics',
    },
    experimentalUi: {
      enabled: true, // Always enabled in test
      description: 'Experimental UI features',
    },
    detailedPlayByPlay: {
      enabled: true,
      description: 'Detailed play-by-play commentary',
    }
  }
};

// Get configuration based on environment
function getConfig(): Config {
  const env = getEnvironment();
  
  // Allow runtime override of API base URL
  const apiBaseUrl = (window as any)?.env?.API_BASE_URL;

  switch (env) {
    case 'production':
      return {
        ...productionConfig,
        api: {
          ...productionConfig.api,
          baseUrl: apiBaseUrl || productionConfig.api.baseUrl,
        },
      };
    case 'test':
      return {
        ...testConfig,
        api: {
          ...testConfig.api,
          baseUrl: apiBaseUrl || testConfig.api.baseUrl,
        },
      };
    default:
      return {
        ...defaultConfig,
        api: {
          ...defaultConfig.api,
          baseUrl: apiBaseUrl || defaultConfig.api.baseUrl,
        },
      };
  }
}

// Get the configuration
export const config = getConfig();

// Initialize feature flags
initializeFeatureFlags(config.featureFlags || {});

// Export the current environment
export const environment = getEnvironment();

// Export a function to check if a feature is enabled
export { isFeatureEnabled };