interface Config {
  api: {
    baseUrl: string;
    endpoints: {
      initGame: string;
      nextPlay: string;
    };
  };
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
  api: {
    baseUrl: 'http://localhost:3001',
    endpoints: {
      initGame: '/api/game/init',
      nextPlay: '/api/game/next',
    },
  },
};

// Production configuration
const productionConfig: Config = {
  api: {
    baseUrl: 'https://prod-api-for-bball-playback.com',
    endpoints: {
      initGame: '/api/v1/game/init',
      nextPlay: '/api/v1/game/next',
    },
  },
};

// Test configuration
const testConfig: Config = {
  api: {
    baseUrl: 'http://localhost:3002',
    endpoints: {
      initGame: '/api/test/game/init',
      nextPlay: '/api/test/game/next',
    },
  },
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

export const config = getConfig(); 