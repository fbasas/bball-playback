import knex from 'knex';
import knexConfig from '../../knexfile';

// Get the current environment
const environment = process.env.NODE_ENV || 'development';

// Initialize knex with the configuration for the current environment
export const db = knex(knexConfig[environment]); 