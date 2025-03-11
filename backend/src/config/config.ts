interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

interface Config {
    database: DatabaseConfig;
    port: number;
}

// Configuration for different environments
const configs: Record<string, Config> = {
    development: {
        database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'database_name',
            user: process.env.DB_USER || 'username',
            password: process.env.DB_PASSWORD || 'password'
        },
        port: parseInt(process.env.PORT || '3001')
    },
    production: {
        database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'database_name',
            user: process.env.DB_USER || 'username',
            password: process.env.DB_PASSWORD || 'password'
        },
        port: parseInt(process.env.PORT || '3001')
    },
    test: {
        database: {
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '5432'),
            database: process.env.TEST_DB_NAME || 'test_database_name',
            user: process.env.TEST_DB_USER || 'username',
            password: process.env.TEST_DB_PASSWORD || 'password'
        },
        port: parseInt(process.env.TEST_PORT || '3001')
    }
};

// Get the current environment
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env];
