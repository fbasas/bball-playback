import { CachedRepository } from './CachedRepository';
import { CacheManager } from '../../core/caching/CacheManager';
import { DatabaseError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';
import { ITeamStatsRepository, TeamStatsData, StartingLineup } from '../../services/interfaces';

/**
 * Repository for team stats data
 *
 * This is a THIN data access layer - it only handles SQL queries.
 * All business logic belongs in services.
 */
export class TeamStatsRepository extends CachedRepository<TeamStatsData, string> implements ITeamStatsRepository {
  protected tableName = 'teamstats';
  protected primaryKey = 'gid';
  protected cacheKeyPrefix = 'teamstats';
  protected entityCache = new CacheManager<string, TeamStatsData | null>({ ttl: 3600000 }); // 1 hour TTL
  protected collectionCache = new CacheManager<string, TeamStatsData[]>({ ttl: 3600000 }); // 1 hour TTL

  /**
   * Gets team stats for a game (both home and visitor teams)
   * @param gameId The game ID
   * @returns Array of team stats (should be 2 - home and visitor)
   */
  async getTeamStatsForGame(gameId: string): Promise<TeamStatsData[]> {
    const cacheKey = `${this.cacheKeyPrefix}:game:${gameId}`;

    try {
      // Check collection cache first
      const cachedResult = this.collectionCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      const teamstats = await db(this.tableName)
        .where({ gid: gameId })
        .select(
          'team',
          'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5',
          'start_l6', 'start_l7', 'start_l8', 'start_l9',
          'start_f1'
        );

      // Cache the result
      this.collectionCache.set(cacheKey, teamstats);

      return teamstats;
    } catch (error) {
      throw new DatabaseError(
        `Error fetching team stats for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets the starting lineup for a specific team
   * @param gameId The game ID
   * @param teamId The team ID
   * @returns The starting lineup with batting order and pitcher
   */
  async getStartingLineup(gameId: string, teamId: string): Promise<StartingLineup> {
    const cacheKey = `${this.cacheKeyPrefix}:lineup:${gameId}:${teamId}`;

    try {
      // Check entity cache first
      const cachedResult = this.entityCache.get(cacheKey);
      if (cachedResult !== undefined && cachedResult !== null) {
        return this.toStartingLineup(cachedResult);
      }

      const teamStats = await db(this.tableName)
        .where({ gid: gameId, team: teamId })
        .select(
          'team',
          'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5',
          'start_l6', 'start_l7', 'start_l8', 'start_l9',
          'start_f1'
        )
        .first();

      if (!teamStats) {
        // Return empty lineup if not found
        return { battingOrder: [], pitcher: null };
      }

      // Cache the raw team stats
      this.entityCache.set(cacheKey, teamStats);

      return this.toStartingLineup(teamStats);
    } catch (error) {
      throw new DatabaseError(
        `Error fetching starting lineup for team ${teamId} in game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets the starting pitcher for a specific team
   * @param gameId The game ID
   * @param teamId The team ID
   * @returns The starting pitcher ID or null
   */
  async getStartingPitcher(gameId: string, teamId: string): Promise<string | null> {
    const lineup = await this.getStartingLineup(gameId, teamId);
    return lineup.pitcher;
  }

  /**
   * Converts TeamStatsData to StartingLineup
   */
  private toStartingLineup(teamStats: TeamStatsData): StartingLineup {
    return {
      battingOrder: [
        teamStats.start_l1,
        teamStats.start_l2,
        teamStats.start_l3,
        teamStats.start_l4,
        teamStats.start_l5,
        teamStats.start_l6,
        teamStats.start_l7,
        teamStats.start_l8,
        teamStats.start_l9,
      ].filter(Boolean),
      pitcher: teamStats.start_f1 || null,
    };
  }
}

// Export a singleton instance
export const teamStatsRepository = new TeamStatsRepository();
