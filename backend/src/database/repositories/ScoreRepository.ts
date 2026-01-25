import { CachedRepository } from './CachedRepository';
import { caches } from '../../core/caching';
import { CacheManager } from '../../core/caching/CacheManager';
import { DatabaseError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';
import { IScoreRepository } from '../../services/interfaces';

/**
 * Repository for score data
 *
 * This is a THIN data access layer - it only handles SQL queries.
 * All business logic (team determination, score calculations) belongs in ScoreService.
 */
export class ScoreRepository extends CachedRepository<any, string> implements IScoreRepository {
  protected tableName = 'plays';
  protected primaryKey = 'pn';
  protected cacheKeyPrefix = 'score';
  protected entityCache = caches.scores as CacheManager<string, any>;
  protected collectionCache = new CacheManager<string, any[]>({ ttl: 300000 }); // 5 minutes TTL

  /**
   * Gets the total runs scored by a team up to (and including) a specific play
   * @param gameId The game ID
   * @param teamId The team ID (batting team)
   * @param upToPlay The play number to sum runs up to (inclusive)
   * @returns Total runs scored by the team
   */
  async getRunsForTeam(gameId: string, teamId: string, upToPlay: number): Promise<number> {
    const cacheKey = `${this.cacheKeyPrefix}:runs:${gameId}:${teamId}:${upToPlay}`;

    try {
      // Check cache first
      const cachedResult = this.entityCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      const result = await db('plays')
        .where({ gid: gameId, batteam: teamId })
        .where('pn', '<=', upToPlay)
        .sum('runs as total')
        .first();

      const runs = result?.total ? parseInt(result.total) : 0;

      // Cache the result
      this.entityCache.set(cacheKey, runs);

      return runs;
    } catch (error) {
      throw new DatabaseError(
        `Error fetching runs for team ${teamId} in game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gets the total runs scored by a team up to (but NOT including) a specific play
   * @param gameId The game ID
   * @param teamId The team ID (batting team)
   * @param beforePlay The play number to sum runs before (exclusive)
   * @returns Total runs scored by the team before this play
   */
  async getRunsForTeamBefore(gameId: string, teamId: string, beforePlay: number): Promise<number> {
    const cacheKey = `${this.cacheKeyPrefix}:runs-before:${gameId}:${teamId}:${beforePlay}`;

    try {
      // Check cache first
      const cachedResult = this.entityCache.get(cacheKey);
      if (cachedResult !== undefined) {
        return cachedResult;
      }

      const result = await db('plays')
        .where({ gid: gameId, batteam: teamId })
        .where('pn', '<', beforePlay)
        .sum('runs as total')
        .first();

      const runs = result?.total ? parseInt(result.total) : 0;

      // Cache the result
      this.entityCache.set(cacheKey, runs);

      return runs;
    } catch (error) {
      throw new DatabaseError(
        `Error fetching runs before play ${beforePlay} for team ${teamId} in game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export a singleton instance
export const scoreRepository = new ScoreRepository();
