interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

interface OpenAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
}

interface Config {
    database: DatabaseConfig;
    port: number;
    openai: OpenAIConfig;
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
        port: parseInt(process.env.PORT || '3001'),
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || '',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
        }
    },
    production: {
        database: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'database_name',
            user: process.env.DB_USER || 'username',
            password: process.env.DB_PASSWORD || 'password'
        },
        port: parseInt(process.env.PORT || '3001'),
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || '',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
        }
    },
    test: {
        database: {
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '3306'),
            database: process.env.TEST_DB_NAME || 'test_database_name',
            user: process.env.TEST_DB_USER || 'username',
            password: process.env.TEST_DB_PASSWORD || 'password'
        },
        port: parseInt(process.env.TEST_PORT || '3001'),
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            model: process.env.OPENAI_MODEL || '',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
        }
    }
};

// Get the current environment
const env = process.env.NODE_ENV || 'development';

// Export the configuration for the current environment
export const config = configs[env];
