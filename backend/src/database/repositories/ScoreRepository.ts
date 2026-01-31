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
   * Preloads cumulative scores for all plays in a game into the cache.
   * This converts O(N) SUM queries into a single query + O(N) cache writes.
   *
   * Call this before iterating through a game's plays to avoid per-play queries.
   *
   * @param gameId The game ID
   * @returns Object with team IDs found and play count
   */
  async preloadCumulativeScores(gameId: string): Promise<{ teams: string[]; playCount: number }> {
    try {
      // Fetch all plays for this game in one query
      const plays = await db('plays')
        .where({ gid: gameId })
        .orderBy('pn', 'asc')
        .select('pn', 'batteam', 'runs');

      if (plays.length === 0) {
        return { teams: [], playCount: 0 };
      }

      // Build running totals per team
      const teamTotals: Map<string, number> = new Map();
      const teams = new Set<string>();

      for (const play of plays) {
        const teamId = play.batteam;
        const runs = play.runs || 0;
        teams.add(teamId);

        // Update running total for this team
        const currentTotal = (teamTotals.get(teamId) || 0) + runs;
        teamTotals.set(teamId, currentTotal);

        // Cache the cumulative score for this (team, playNumber) combination
        const cacheKey = `${this.cacheKeyPrefix}:runs:${gameId}:${teamId}:${play.pn}`;
        this.entityCache.set(cacheKey, currentTotal);

        // Also cache scores for teams that didn't bat this play (their total stays the same)
        for (const otherTeam of teams) {
          if (otherTeam !== teamId) {
            const otherCacheKey = `${this.cacheKeyPrefix}:runs:${gameId}:${otherTeam}:${play.pn}`;
            // Only set if not already cached (preserve existing values)
            if (this.entityCache.get(otherCacheKey) === undefined) {
              this.entityCache.set(otherCacheKey, teamTotals.get(otherTeam) || 0);
            }
          }
        }
      }

      return { teams: Array.from(teams), playCount: plays.length };
    } catch (error) {
      throw new DatabaseError(
        `Error preloading scores for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`
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
