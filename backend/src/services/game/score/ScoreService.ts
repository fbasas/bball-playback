import { PlayData } from '../../../../../common/types/PlayData';
import { BaseService } from '../../BaseService';
import { baseballMetricsCollector } from '../../../core/metrics';
import { logger } from '../../../core/logging';
import { IScoreService, IScoreRepository, ScoreResult, TeamIds } from '../../interfaces';
import { scoreRepository } from '../../../database/repositories/ScoreRepository';

// Re-export ScoreResult interface for backward compatibility
export { ScoreResult, TeamIds } from '../../interfaces';

/**
 * Service for handling score calculations
 *
 * This service contains ALL business logic for score calculations.
 * Data access is delegated to IScoreRepository (dependency injection).
 *
 * Business logic includes:
 * - Determining home vs visitor team from play data
 * - Computing score results from run totals
 * - Tracking score changes in metrics
 */
export class ScoreService extends BaseService implements IScoreService {
  private static instance: ScoreService;
  private scoreRepository: IScoreRepository;

  /**
   * Creates a new instance of ScoreService
   * @param scoreRepo Optional repository for dependency injection (defaults to singleton)
   */
  constructor(scoreRepo?: IScoreRepository) {
    super();
    this.scoreRepository = scoreRepo || scoreRepository;
  }

  /**
   * Gets the singleton instance (for backward compatibility)
   * @returns The singleton instance
   */
  public static getInstance(): ScoreService {
    if (!ScoreService.instance) {
      ScoreService.instance = new ScoreService();
    }
    return ScoreService.instance;
  }

  /**
   * Determines which team is home and which is visitor from play data
   *
   * Baseball convention:
   * - top_bot = 0 (top of inning): visitors are batting, home team is pitching
   * - top_bot = 1 (bottom of inning): home team is batting, visitors are pitching
   *
   * @param playData The play data to analyze
   * @returns Object with homeTeamId and visitorTeamId
   */
  public determineTeams(playData: PlayData): TeamIds {
    if (playData.top_bot === 0) {
      // Top of inning: visitors batting, home pitching
      return {
        homeTeamId: playData.pitteam,
        visitorTeamId: playData.batteam
      };
    } else {
      // Bottom of inning: home batting, visitors pitching
      return {
        homeTeamId: playData.batteam,
        visitorTeamId: playData.pitteam
      };
    }
  }

  /**
   * Computes the score result from raw run totals
   *
   * This is a PURE FUNCTION - no database access, no side effects.
   * Easy to test with mock data.
   *
   * @param homeRunsBefore Total home runs before the play
   * @param visitorRunsBefore Total visitor runs before the play
   * @param nextPlayData The next play data (to determine runs scored)
   * @param homeTeamId The home team ID (to determine who scored)
   * @returns Score result with before and after scores
   */
  public computeScoreResult(
    homeRunsBefore: number,
    visitorRunsBefore: number,
    nextPlayData: PlayData,
    homeTeamId: string
  ): ScoreResult {
    let homeScoreAfterPlay = homeRunsBefore;
    let visitorScoreAfterPlay = visitorRunsBefore;

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
      homeScoreBeforePlay: homeRunsBefore,
      visitorScoreBeforePlay: visitorRunsBefore,
      homeScoreAfterPlay,
      visitorScoreAfterPlay
    };
  }

  /**
   * Calculates the cumulative score for home and visiting teams
   *
   * Orchestrates:
   * 1. Team determination (business logic)
   * 2. Data fetching (via repository)
   * 3. Score computation (business logic)
   * 4. Metrics recording
   *
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
      // 1. Determine teams (business logic)
      const { homeTeamId, visitorTeamId } = this.determineTeams(nextPlayData);

      // 2. Fetch run totals (data access via repository)
      const [homeRunsBefore, visitorRunsBefore] = await Promise.all([
        this.scoreRepository.getRunsForTeam(gameId, homeTeamId, currentPlay),
        this.scoreRepository.getRunsForTeam(gameId, visitorTeamId, currentPlay)
      ]);

      // 3. Compute score result (business logic)
      const result = this.computeScoreResult(
        homeRunsBefore,
        visitorRunsBefore,
        nextPlayData,
        homeTeamId
      );

      const endTime = performance.now();
      const durationMs = endTime - startTime;

      // 4. Record metrics
      this.recordScoreMetrics(gameId, currentPlay, result, durationMs);

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
   * Records score change metrics
   * @private
   */
  private recordScoreMetrics(
    gameId: string,
    currentPlay: number,
    result: ScoreResult,
    durationMs: number
  ): void {
    // Track home team score changes
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

    // Track visitor team score changes
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

  // Static methods for backward compatibility during transition
  public static async calculateScore(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult> {
    return ScoreService.getInstance().calculateScore(gameId, currentPlay, currentPlayData, nextPlayData);
  }

  public static determineTeams(playData: PlayData): TeamIds {
    return ScoreService.getInstance().determineTeams(playData);
  }

  public static computeScoreResult(
    homeRunsBefore: number,
    visitorRunsBefore: number,
    nextPlayData: PlayData,
    homeTeamId: string
  ): ScoreResult {
    return ScoreService.getInstance().computeScoreResult(
      homeRunsBefore,
      visitorRunsBefore,
      nextPlayData,
      homeTeamId
    );
  }
}
