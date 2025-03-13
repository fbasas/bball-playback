# Database Management

This directory contains database migrations, seeds, and utility scripts for the Baseball Playback application.

## Migrations

Migrations are used to manage database schema changes over time. Each migration file represents a set of changes to the database schema.

### Running Migrations

To run migrations, use the following command:

```bash
npx knex migrate:latest
```

If you encounter permission issues with the default database user, you can use a different user with higher privileges:

1. Create a temporary `.env.migration` file with the admin credentials:

```
# Database Configuration for Migrations
DB_HOST=your-host
DB_PORT=3306
DB_NAME=your-database
DB_USER=admin-user
DB_PASSWORD=admin-password

# Environment
NODE_ENV=development
```

2. Run the migration with the temporary environment file:

```bash
npx dotenv -e .env.migration -- npx knex migrate:latest
```

3. For a specific migration, use:

```bash
npx dotenv -e .env.migration -- npx knex migrate:up migration_filename.ts
```

### Migration History

If migrations have been run directly on the database (e.g., via SQL scripts) and are not tracked in the `knex_migrations` table, you can use the `update_migration_history.ts` script to update the migration history:

```bash
npx dotenv -e .env.migration -- npx ts-node src/database/scripts/update_migration_history.ts
```

This script will:
1. Create the `knex_migrations` table if it doesn't exist
2. Add entries for migrations that have already been run but are not tracked
3. Allow future migrations to run smoothly

## Database Schema

### Lineup Tracking Tables

The following tables are used to track lineup changes during games:

#### `lineup_states`

Stores the game context when a lineup change occurs:

- `id`: Primary key
- `game_id`: Links to the specific game
- `play_index`: The play number when this lineup state was recorded
- `inning` and `is_top_inning`: The inning context
- `outs`: Number of outs when the lineup state was recorded
- `timestamp`: When the lineup state was recorded

#### `lineup_players`

Records each player's position in the lineup for a specific lineup state:

- `id`: Primary key
- `lineup_state_id`: Links to the parent lineup state
- `team_id`: The team the player belongs to
- `player_id`: The player's unique identifier
- `batting_order`: The player's position in the batting order (1-9)
- `position`: The player's field position (P, C, 1B, etc.)
- `is_current_batter` and `is_current_pitcher`: Flags to easily identify these key players

#### `lineup_changes`

Stores human-readable descriptions of lineup changes with structured data:

- `id`: Primary key
- `lineup_state_id`: Links to the parent lineup state
- `change_type`: Type of change (SUBSTITUTION, POSITION_CHANGE, etc.)
- `player_in_id`: ID of the player entering the game (for substitutions)
- `player_out_id`: ID of the player leaving the game (for substitutions)
- `position_from` and `position_to`: Original and new positions (for position changes)
- `batting_order_from` and `batting_order_to`: Original and new batting order positions
- `team_id`: The team making the change
- `description`: Human-readable description of the change
