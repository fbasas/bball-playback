import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('umpires', (table) => {
    table.string('id', 8).primary().comment('Umpire ID');
    table.string('lastname', 50).notNullable().comment('Last name');
    table.string('firstname', 50).notNullable().comment('First name');
    table.date('first_g').notNullable().comment('First game date');
    table.date('last_g').notNullable().comment('Last game date');
    
    // Indexes
    table.index('lastname');
    table.index(['first_g', 'last_g']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('umpires');
}
