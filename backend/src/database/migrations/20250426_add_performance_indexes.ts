import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add indexes to the plays table
  await knex.schema.alterTable('plays', (table) => {
    // Index for fetching plays by game ID and play number
    // This improves performance for the fetchPlayData method in PlayRepository
    table.index(['gid', 'pn'], 'idx_plays_gid_pn');
    
    // Index for fetching plays by game ID and ordering by play number
    // This improves performance for the fetchFirstPlay and fetchAllPlaysForGame methods
    table.index(['gid'], 'idx_plays_gid');
    
    // Index for fetching plays by batter
    // This improves performance for the fetchPlayForBatter method
    table.index(['gid', 'batter'], 'idx_plays_gid_batter');
    
    // Index for inning and top/bottom
    // This improves performance for queries that filter by inning
    table.index(['gid', 'inning', 'top_bot'], 'idx_plays_gid_inning_topbot');
    
    // Index for event field
    // This improves performance for queries that filter by event type
    table.index(['event'], 'idx_plays_event');
  });
  
  // Add indexes to the allplayers table
  await knex.schema.alterTable('allplayers', (table) => {
    // Index for player name fields
    // This improves performance for player name searches
    table.index(['last', 'first'], 'idx_players_name');
    
    // Index for retrosheet_id
    // This improves performance for queries that use retrosheet_id
    table.index(['retrosheet_id'], 'idx_players_retrosheet_id');
  });
  
  // Add indexes to the openai_completions_log table
  await knex.schema.alterTable('openai_completions_log', (table) => {
    // Index for play_index
    // This improves performance for queries that filter by play_index
    table.index(['play_index'], 'idx_completions_play_index');
    
    // Composite index for game_id and play_index
    // This improves performance for queries that filter by both game_id and play_index
    table.index(['game_id', 'play_index'], 'idx_completions_game_play');
    
    // Index for inning and is_top_inning
    // This improves performance for queries that filter by inning
    table.index(['inning', 'is_top_inning'], 'idx_completions_inning');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Remove indexes from the plays table
  await knex.schema.alterTable('plays', (table) => {
    table.dropIndex([], 'idx_plays_gid_pn');
    table.dropIndex([], 'idx_plays_gid');
    table.dropIndex([], 'idx_plays_gid_batter');
    table.dropIndex([], 'idx_plays_gid_inning_topbot');
    table.dropIndex([], 'idx_plays_event');
  });
  
  // Remove indexes from the allplayers table
  await knex.schema.alterTable('allplayers', (table) => {
    table.dropIndex([], 'idx_players_name');
    table.dropIndex([], 'idx_players_retrosheet_id');
  });
  
  // Remove indexes from the openai_completions_log table
  await knex.schema.alterTable('openai_completions_log', (table) => {
    table.dropIndex([], 'idx_completions_play_index');
    table.dropIndex([], 'idx_completions_game_play');
    table.dropIndex([], 'idx_completions_inning');
  });
}