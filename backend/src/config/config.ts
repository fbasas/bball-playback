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
            host: 'localhost',
            port: 5432,
            database: 'baseball_archive',
            user: 'postgres',
            password: 'postgres'
        },
        port: 3001
    },
    production: {
        database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'baseball_archive',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres'
        },
        port: parseInt(process.env.PORT || '3001')
    },
    test: {
        database: {
            host: 'localhost',
            port: 5432,
            database: 'baseball_archive_test',
            user: 'postgres',
            password: 'postgres'
        },
        port: 3001
    }
};

// Get the current environment
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env]; 