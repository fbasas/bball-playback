import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('lineup_states', (table) => {
    table.string('session_id', 100).notNullable().defaultTo('-1');
    
    // Add index for efficient queries
    table.index(['game_id', 'session_id'], 'idx_game_session');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('lineup_states', (table) => {
    table.dropIndex(['game_id', 'session_id'], 'idx_game_session');
    table.dropColumn('session_id');
  });
}
