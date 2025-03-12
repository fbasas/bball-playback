import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('openai_completions', (table) => {
    table.bigIncrements('id').primary();
    
    table.text('prompt').notNullable();
    table.string('model', 50).notNullable();
    table.decimal('temperature', 3, 2).notNullable().defaultTo(0.7);
    table.integer('max_tokens').unsigned().notNullable().defaultTo(500);
    table.decimal('top_p', 3, 2).nullable();
    table.decimal('frequency_penalty', 3, 2).nullable();
    table.decimal('presence_penalty', 3, 2).nullable();
    
    table.string('completion_id', 100).notNullable();
    table.text('content').notNullable();
    table.string('finish_reason', 20).nullable();
    
    table.integer('prompt_tokens').unsigned().nullable();
    table.integer('completion_tokens').unsigned().nullable();
    table.integer('total_tokens').unsigned().nullable();
    
    table.string('game_id', 100).notNullable();
    table.integer('play_index').unsigned().nullable();
    table.integer('inning').unsigned().nullable();
    table.boolean('is_top_inning').nullable();
    table.integer('outs').unsigned().nullable();
    
    table.integer('latency_ms').unsigned().nullable();
    table.tinyint('retry_count').unsigned().notNullable().defaultTo(0);
    
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.bigint('openai_created_at').unsigned().nullable();
    
    // Indexes
    table.index('game_id');
    table.index('model');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('openai_completions');
}
