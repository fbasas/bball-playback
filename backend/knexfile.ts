import type { Knex } from 'knex';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8mb4'
    },
    pool: {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 60000, // 60 seconds
      createTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      reapIntervalMillis: 1000, // 1 second
      createRetryIntervalMillis: 200, // 0.2 seconds
      propagateCreateError: false // Don't propagate pool creation errors
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8mb4'
    },
    pool: {
      min: 5,
      max: 30,
      acquireTimeoutMillis: 60000, // 60 seconds
      createTimeoutMillis: 30000, // 30 seconds
      idleTimeoutMillis: 30000, // 30 seconds
      reapIntervalMillis: 1000, // 1 second
      createRetryIntervalMillis: 200, // 0.2 seconds
      propagateCreateError: false // Don't propagate pool creation errors
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './src/database/migrations'
    }
  }
};

export default knexConfig;
