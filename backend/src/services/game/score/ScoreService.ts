import { PlayData } from '../../../../../common/types/PlayData';
import { scoreRepository, ScoreResult } from '../../../database/repositories/ScoreRepository';
import { BaseService } from '../../BaseService';
import { baseballMetricsCollector } from '../../../core/metrics';
import { logger } from '../../../core/logging';

// Re-export ScoreResult interface from the repository
export { ScoreResult } from '../../../database/repositories/ScoreRepository';

/**
 * Service for handling score calculations
 */
export class ScoreService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: ScoreService;

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): ScoreService {
    if (!ScoreService.instance) {
      ScoreService.instance = new ScoreService();
    }
    return ScoreService.instance;
  }

  /**
   * Calculates the cumulative score for home and visiting teams
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  /**
   * Calculates the cumulative score for home and visiting teams
   * This method uses the optimized version for better performance
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  public async calculateScore(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    const startTime = performance.now();
    
    try {
      // Use the optimized version by default for better performance
      const result = await this.calculateScoreOptimized(gameId, currentPlay, currentPlayData, nextPlayData);
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Track score changes in metrics
      if (result) {
        // Check if home team score changed
        const homeScoreChange = result.homeScoreAfterPlay - result.homeScoreBeforePlay;
        if (homeScoreChange > 0) {
          baseballMetricsCollector.recordScoreChange(
            gameId,
            'home',
            homeScoreChange,
            { playIndex: currentPlay }
          );
          
          logger.debug(`Home team scored ${homeScoreChange} run(s) in game ${gameId}`, {
            gameId,
            playIndex: currentPlay,
            homeScoreBefore: result.homeScoreBeforePlay,
            homeScoreAfter: result.homeScoreAfterPlay
          });
        }
        
        // Check if visitor team score changed
        const visitorScoreChange = result.visitorScoreAfterPlay - result.visitorScoreBeforePlay;
        if (visitorScoreChange > 0) {
          baseballMetricsCollector.recordScoreChange(
            gameId,
            'visitors',
            visitorScoreChange,
            { playIndex: currentPlay }
          );
          
          logger.debug(`Visitor team scored ${visitorScoreChange} run(s) in game ${gameId}`, {
            gameId,
            playIndex: currentPlay,
            visitorScoreBefore: result.visitorScoreBeforePlay,
            visitorScoreAfter: result.visitorScoreAfterPlay
          });
        }
        
        // Record the score calculation performance
        baseballMetricsCollector.recordDatabaseQuery(
          'score_calculation',
          'plays',
          durationMs,
          1
        );
      }
      
      return result;
    } catch (error) {
      logger.error('Error calculating score', {
        gameId,
        currentPlay,
        error
      });
      
      // Return default scores in case of error
      return {
        homeScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreBeforePlay: 0,
        visitorScoreAfterPlay: 0
      };
    }
  }

  /**
   * Legacy version of calculateScore that uses a less efficient query
   * Kept for backward compatibility
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  public async calculateScoreLegacy(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    const startTime = performance.now();
    
    try {
      const result = await scoreRepository.calculateScore(gameId, currentPlay, currentPlayData, nextPlayData);
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Record the legacy score calculation performance
      baseballMetricsCollector.recordDatabaseQuery(
        'score_calculation_legacy',
        'plays',
        durationMs,
        1
      );
      
      return result;
    } catch (error) {
      logger.error('Error calculating score (legacy)', {
        gameId,
        currentPlay,
        error
      });
      
      // Return default scores in case of error
      return {
        homeScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreBeforePlay: 0,
        visitorScoreAfterPlay: 0
      };
    }
  }

  /**
   * Optimized version of calculateScore that uses a more efficient query
   * This method could be implemented in the future to improve performance
   * for games with many plays
   */
  /**
   * Optimized version of calculateScore that uses a more efficient query
   * This method improves performance for games with many plays
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns A ScoreResult object with scores before and after the play
   */
  public async calculateScoreOptimized(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    const startTime = performance.now();
    
    try {
      const result = await scoreRepository.calculateScoreOptimized(gameId, currentPlay, currentPlayData, nextPlayData);
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Record the optimized score calculation performance
      baseballMetricsCollector.recordDatabaseQuery(
        'score_calculation_optimized',
        'plays',
        durationMs,
        1
      );
      
      return result;
    } catch (error) {
      logger.error('Error calculating score (optimized)', {
        gameId,
        currentPlay,
        error
      });
      
      // Return default scores in case of error
      return {
        homeScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreBeforePlay: 0,
        visitorScoreAfterPlay: 0
      };
    }
  }

  // Static methods for backward compatibility during transition
  public static async calculateScore(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    return ScoreService.getInstance().calculateScore(gameId, currentPlay, currentPlayData, nextPlayData);
  }

  public static async calculateScoreLegacy(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    return ScoreService.getInstance().calculateScoreLegacy(gameId, currentPlay, currentPlayData, nextPlayData);
  }

  public static async calculateScoreOptimized(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    return ScoreService.getInstance().calculateScoreOptimized(gameId, currentPlay, currentPlayData, nextPlayData);
  }
}