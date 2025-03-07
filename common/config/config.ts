export type Environment = 'development' | 'production' | 'test';

interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

interface ApiEndpoints {
    initGame: string;
    nextPlay: string;
    createGame: string;
}

interface ApiConfig {
    baseUrl: string;
    endpoints: ApiEndpoints;
}

interface CommonConfig {
    environment: Environment;
    api: ApiConfig;
}

interface BackendConfig extends CommonConfig {
    database: DatabaseConfig;
    port: number;
}

interface FrontendConfig extends CommonConfig {
    // Frontend-specific config options can be added here
}

// Default API endpoints that are the same across environments
const defaultEndpoints: ApiEndpoints = {
    initGame: '/api/game/init',
    nextPlay: '/api/game/next',
    createGame: '/api/game/createGame'
};

// Configuration for different environments
const configs: Record<Environment, {
    frontend: FrontendConfig;
    backend: BackendConfig;
}> = {
    development: {
        frontend: {
            environment: 'development',
            api: {
                baseUrl: 'http://localhost:3001',
                endpoints: defaultEndpoints
            }
        },
        backend: {
            environment: 'development',
            port: 3001,
            api: {
                baseUrl: 'http://localhost:3001',
                endpoints: defaultEndpoints
            },
            database: {
                host: 'localhost',
                port: 5432,
                database: 'baseball_archive',
                user: '',
                password: ''
            }
        }
    },
    production: {
        frontend: {
            environment: 'production',
            api: {
                baseUrl: process.env.API_BASE_URL || 'https://api.baseball-archive.com',
                endpoints: defaultEndpoints
            }
        },
        backend: {
            environment: 'production',
            port: parseInt(process.env.PORT || '3001'),
            api: {
                baseUrl: process.env.API_BASE_URL || 'https://api.baseball-archive.com',
                endpoints: defaultEndpoints
            },
            database: {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'baseball_archive',
                user: process.env.DB_USER || '',
                password: process.env.DB_PASSWORD || ''
            }
        }
    },
    test: {
        frontend: {
            environment: 'test',
            api: {
                baseUrl: 'http://localhost:3002',
                endpoints: defaultEndpoints
            }
        },
        backend: {
            environment: 'test',
            port: 3002,
            api: {
                baseUrl: 'http://localhost:3002',
                endpoints: defaultEndpoints
            },
            database: {
                host: 'localhost',
                port: 5432,
                database: 'baseball_archive_test',
                user: '',
                password: ''
            }
        }
    }
};

// Helper function to get environment
export const getEnvironment = (): Environment => {
    if (typeof window !== 'undefined') {
        // Browser environment
        const env = (window as any)?.env?.NODE_ENV || 'development';
        return env as Environment;
    } else {
        // Node.js environment
        return (process.env.NODE_ENV as Environment) || 'development';
    }
};

// Get configuration based on environment and type (frontend/backend)
export function getConfig<T extends 'frontend' | 'backend'>(type: T): T extends 'frontend' ? FrontendConfig : BackendConfig {
    const env = getEnvironment();
    const config = configs[env][type];
    return config as T extends 'frontend' ? FrontendConfig : BackendConfig;
}

// Export type-safe configs
export const frontendConfig = getConfig('frontend');
export const backendConfig = getConfig('backend'); 