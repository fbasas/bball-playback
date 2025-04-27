import { z } from 'zod';

/**
 * Development environment configuration
 */
export const developmentConfig = {
  environment: 'development' as const,
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
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
  featureFlags: {
    enhancedCommentary: {
      enabled: true,
      description: 'Enhanced commentary with more detailed play descriptions',
      rolloutPercentage: 100
    },
    advancedStatistics: {
      enabled: true,
      description: 'Advanced statistics in game summaries',
      rolloutPercentage: 100
    },
    experimentalUi: {
      enabled: false,
      description: 'Experimental UI features',
      rolloutPercentage: 0
    }
  }
};