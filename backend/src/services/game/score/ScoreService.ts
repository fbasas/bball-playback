import { db } from '../../../config/database';
import { PlayData } from '../../../../../common/types/PlayData';
import { DatabaseError } from '../../../types/errors/GameErrors';

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
 * Service for handling score calculations
 */
export class ScoreService {
  /**
   * Calculates the cumulative score for home and visiting teams
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  public static async calculateScore(
    gameId: string, 
    currentPlay: number, 
    currentPlayData: PlayData, 
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    try {
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

      return {
        homeScoreBeforePlay,
        visitorScoreBeforePlay,
        homeScoreAfterPlay,
        visitorScoreAfterPlay
      };
    } catch (error) {
      throw new DatabaseError(`Error calculating score for game ${gameId}, play ${currentPlay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimized version of calculateScore that uses a more efficient query
   * This method could be implemented in the future to improve performance
   * for games with many plays
   */
  public static async calculateScoreOptimized(
    gameId: string, 
    currentPlay: number, 
    currentPlayData: PlayData, 
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    try {
      // This is a placeholder for a future optimization
      // Instead of fetching all previous plays, we could:
      // 1. Cache score calculations
      // 2. Use a more efficient query that sums runs directly in the database
      // 3. Maintain a running score in the game state

      // For now, we'll use the standard calculation
      return this.calculateScore(gameId, currentPlay, currentPlayData, nextPlayData);
    } catch (error) {
      throw new DatabaseError(`Error calculating optimized score for game ${gameId}, play ${currentPlay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}