import { CachedRepository } from './CachedRepository';
import { PlayData } from '../../../../common/types/PlayData';
import { caches } from '../../core/caching';
import { CacheManager } from '../../core/caching/CacheManager';
import { DatabaseError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';

/**
 * Interface for score calculation results
 */
export interface ScoreResult {
  homeScoreBeforePlay: number;
  visitorScoreBeforePlay: number;
  homeScoreAfterPlay: number;
  visitorScoreAfterPlay: number;
}

/**
 * Repository for score data
 */
export class ScoreRepository extends CachedRepository<any, string> {
  protected tableName = 'plays';
  protected primaryKey = 'pn';
  protected cacheKeyPrefix = 'score';
  protected entityCache = caches.scores as CacheManager<string, any>;
  protected collectionCache = new CacheManager<string, any[]>({ ttl: 300000 }); // 5 minutes TTL
  
  /**
   * Calculates the cumulative score for home and visiting teams
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  async calculateScore(
    gameId: string, 
    currentPlay: number, 
    currentPlayData: PlayData, 
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:${currentPlay}`;
    
    try {
      // Check if the result is already cached
      const cachedResult = this.entityCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Fetch all plays up to but NOT including the current play to get score before current play
      // This ensures we don't include the runs from the current play in the "before" score
      const previousPlays = await db('plays')
        .select('gid', 'pn', 'top_bot', 'batteam', 'runs')
        .where({ gid: gameId })
        .where('pn', '<', currentPlay)  // Using '<' instead of '<=' to exclude the current play
        .orderBy('pn', 'asc');
      
      let homeScoreBeforePlay = 0;
      let visitorScoreBeforePlay = 0;
      const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;
      
      previousPlays.forEach(play => {
        const runsOnPlay = play.runs || 0;
        if (runsOnPlay > 0) {
          const isHomeBatting = play.batteam === homeTeamId;
          if (isHomeBatting) {
            homeScoreBeforePlay += runsOnPlay;
          } else {
            visitorScoreBeforePlay += runsOnPlay;
          }
        }
      });
      
      // Calculate score after the next play
      let homeScoreAfterPlay = homeScoreBeforePlay;
      let visitorScoreAfterPlay = visitorScoreBeforePlay;
      const runsOnNextPlay = nextPlayData.runs || 0;
      
      if (runsOnNextPlay > 0) {
        const isHomeBattingNext = nextPlayData.batteam === homeTeamId;
        if (isHomeBattingNext) {
          homeScoreAfterPlay += runsOnNextPlay;
        } else {
          visitorScoreAfterPlay += runsOnNextPlay;
        }
      }
      
      const result = {
        homeScoreBeforePlay,
        visitorScoreBeforePlay,
        homeScoreAfterPlay,
        visitorScoreAfterPlay
      };
      
      // Cache the result
      this.entityCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      throw new DatabaseError(`Error calculating score for game ${gameId}, play ${currentPlay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Optimized version of calculateScore that uses a more efficient query
   * This method improves performance for games with many plays by:
   * 1. Using a running score calculation
   * 2. Caching intermediate results
   * 3. Using a more efficient query that sums runs directly in the database
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  async calculateScoreOptimized(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:${currentPlay}:optimized`;
    
    try {
      // Check if the result is already cached
      const cachedResult = this.entityCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Determine home and visiting team IDs using nextPlayData for consistency with nextPlay.ts
      const homeTeamId = nextPlayData.top_bot === 0 ? nextPlayData.pitteam : nextPlayData.batteam;
      const visitingTeamId = nextPlayData.top_bot === 0 ? nextPlayData.batteam : nextPlayData.pitteam;
      
      // Use a single query to calculate the sum of runs for each team up to AND INCLUDING the current play
      const [homeScoreResult, visitorScoreResult] = await Promise.all([
        db('plays')
          .where({ gid: gameId, batteam: homeTeamId })
          .where('pn', '<=', currentPlay) // Include current play in score calculation
          .sum('runs as total')
          .first(),
        db('plays')
          .where({ gid: gameId, batteam: visitingTeamId })
          .where('pn', '<=', currentPlay) // Include current play in score calculation
          .sum('runs as total')
          .first()
      ]);
      
      // Extract the scores from the query results
      const homeScoreBeforePlay = homeScoreResult?.total ? parseInt(homeScoreResult.total) : 0;
      const visitorScoreBeforePlay = visitorScoreResult?.total ? parseInt(visitorScoreResult.total) : 0;
      
      // Calculate score after the next play
      let homeScoreAfterPlay = homeScoreBeforePlay;
      let visitorScoreAfterPlay = visitorScoreBeforePlay;
      const runsOnNextPlay = nextPlayData.runs || 0;
      
      if (runsOnNextPlay > 0) {
        const isHomeBattingNext = nextPlayData.batteam === homeTeamId;
        if (isHomeBattingNext) {
          homeScoreAfterPlay += runsOnNextPlay;
        } else {
          visitorScoreAfterPlay += runsOnNextPlay;
        }
      }
      
      const result = {
        homeScoreBeforePlay,
        visitorScoreBeforePlay,
        homeScoreAfterPlay,
        visitorScoreAfterPlay
      };
      
      console.log(`[DEBUG] Score result: Home before: ${homeScoreBeforePlay}, Home after: ${homeScoreAfterPlay}, Visitor before: ${visitorScoreBeforePlay}, Visitor after: ${visitorScoreAfterPlay}`);
      
      // Cache the result
      this.entityCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      throw new DatabaseError(`Error calculating optimized score for game ${gameId}, play ${currentPlay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const scoreRepository = new ScoreRepository();