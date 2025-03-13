import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create lineup_states table
  await knex.schema.createTable('lineup_states', (table) => {
    table.bigIncrements('id').primary();
    table.string('game_id', 100).notNullable();
    table.integer('play_index').unsigned().notNullable();
    table.integer('inning').unsigned().notNullable();
    table.boolean('is_top_inning').notNullable();
    table.integer('outs').unsigned().notNullable();
    table.timestamp('timestamp').notNullable().defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['game_id', 'play_index'], 'idx_game_play');
    table.index(['game_id', 'inning', 'is_top_inning'], 'idx_game_inning');
  });

  // Create lineup_players table
  await knex.schema.createTable('lineup_players', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('lineup_state_id').unsigned().notNullable();
    table.string('team_id', 3).notNullable();
    table.string('player_id', 8).notNullable();
    table.integer('batting_order').unsigned().notNullable();
    table.string('position', 2).notNullable();
    table.boolean('is_current_batter').notNullable().defaultTo(false);
    table.boolean('is_current_pitcher').notNullable().defaultTo(false);
    
    // Foreign key
    table.foreign('lineup_state_id').references('id').inTable('lineup_states').onDelete('CASCADE');
    
    // Indexes
    table.index('lineup_state_id', 'idx_lineup_state');
    table.index('player_id', 'idx_player');
    table.index('team_id', 'idx_team');
  });

  // Create lineup_changes table
  await knex.schema.createTable('lineup_changes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('lineup_state_id').unsigned().notNullable();
    table.enum('change_type', [
      'SUBSTITUTION', 
      'POSITION_CHANGE', 
      'BATTING_ORDER_CHANGE', 
      'PITCHING_CHANGE', 
      'INITIAL_LINEUP', 
      'OTHER'
    ]).notNullable();
    table.string('player_in_id', 8).nullable();
    table.string('player_out_id', 8).nullable();
    table.string('position_from', 2).nullable();
    table.string('position_to', 2).nullable();
    table.integer('batting_order_from').unsigned().nullable();
    table.integer('batting_order_to').unsigned().nullable();
    table.string('team_id', 3).notNullable();
    table.text('description').notNullable();
    
    // Foreign key
    table.foreign('lineup_state_id').references('id').inTable('lineup_states').onDelete('CASCADE');
    
    // Indexes
    table.index('lineup_state_id', 'idx_lineup_state_change');
    table.index('player_in_id', 'idx_player_in');
    table.index('player_out_id', 'idx_player_out');
    table.index('team_id', 'idx_team_change');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order to avoid foreign key constraints
  await knex.schema.dropTableIfExists('lineup_changes');
  await knex.schema.dropTableIfExists('lineup_players');
  await knex.schema.dropTableIfExists('lineup_states');
}
