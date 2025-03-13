import { Knex } from 'knex';
import { db } from '../../config/database';

/**
 * This script updates the knex_migrations table with information about migrations
 * that have already been run but are not tracked in the knex_migrations table.
 * 
 * Run this script with:
 * npx ts-node src/database/scripts/update_migration_history.ts
 */

interface Migration {
  name: string;
  batch: number;
  migration_time: Date;
}

async function updateMigrationHistory() {
  try {
    // Check if knex_migrations table exists
    const tableExists = await db.schema.hasTable('knex_migrations');
    
    if (!tableExists) {
      console.log('Creating knex_migrations table...');
      await db.schema.createTable('knex_migrations', (table) => {
        table.increments('id').primary();
        table.string('name', 255);
        table.integer('batch');
        table.timestamp('migration_time');
      });
    }
    
    // List of migrations that have already been run
    const completedMigrations: Migration[] = [
      {
        name: '20250311_create_openai_completions.ts',
        batch: 1,
        migration_time: new Date()
      },
      {
        name: '20250312_create_umpires.ts',
        batch: 1,
        migration_time: new Date()
      },
      {
        name: '20250313_create_lineup_tracking.ts',
        batch: 2,
        migration_time: new Date()
      }
    ];
    
    // Check which migrations are already in the knex_migrations table
    const existingMigrations = await db('knex_migrations').select('name');
    const existingMigrationNames = existingMigrations.map((m: any) => m.name);
    
    // Filter out migrations that are already in the knex_migrations table
    const migrationsToAdd = completedMigrations.filter(
      (m) => !existingMigrationNames.includes(m.name)
    );
    
    if (migrationsToAdd.length === 0) {
      console.log('All migrations are already tracked in knex_migrations table.');
      return;
    }
    
    // Insert the missing migrations into the knex_migrations table
    await db('knex_migrations').insert(migrationsToAdd);
    
    console.log(`Added ${migrationsToAdd.length} migrations to knex_migrations table.`);
    console.log('Migration history updated successfully.');
  } catch (error) {
    console.error('Error updating migration history:', error);
  } finally {
    // Close the database connection
    await db.destroy();
  }
}

// Run the function
updateMigrationHistory();
