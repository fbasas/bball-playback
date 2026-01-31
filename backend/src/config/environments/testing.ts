/**
 * Test environment configuration
 */
export const testConfig = {
  environment: 'test' as const,
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '3306'),
    database: process.env.TEST_DB_NAME || 'test_database_name',
    user: process.env.TEST_DB_USER || 'username',
    password: process.env.TEST_DB_PASSWORD || 'password'
  },
  port: parseInt(process.env.TEST_PORT || '3002'),
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
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
      enabled: true,
      description: 'Experimental UI features',
      rolloutPercentage: 100
    }
  }
};