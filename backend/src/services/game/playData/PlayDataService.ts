import { PlayData, PlayDataResult } from '../../../../../common/types/PlayData';
import { playRepository } from '../../../database/repositories/PlayRepository';
import { validateExternalData, safeValidateExternalData } from '../../../utils/TypeCheckUtils';
import { PlayDataSchema, PlayDataResultSchema } from '../../../validation';
import { logger, contextLogger } from '../../../core/logging';
import { BaseService } from '../../BaseService';

/**
 * Service for handling play data operations
 *
 * This service is responsible for retrieving and validating play data from the database.
 * It provides methods for fetching the first play of a game, retrieving play data for
 * a specific play index, and finding plays associated with a specific batter.
 *
 * The PlayDataService uses the playRepository to access the database and applies
 * validation to ensure data integrity before returning results.
 *
 * @example
 * ```typescript
 * // Fetch the first play of a game
 * const firstPlay = await PlayDataService.fetchFirstPlay("CIN201904150");
 *
 * // Fetch play data for a specific play index
 * const playData = await PlayDataService.fetchPlayData("CIN201904150", 42);
 * ```
 */
export class PlayDataService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: PlayDataService;

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): PlayDataService {
    if (!PlayDataService.instance) {
      PlayDataService.instance = new PlayDataService();
    }
    return PlayDataService.instance;
  }

  /**
   * Fetches the first play for a game
   *
   * This method retrieves the first play data for a specified game from the database.
   * The first play typically represents the start of the game with the initial game state.
   * The data is validated against the PlayDataSchema to ensure integrity.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @returns The first play data with complete information
   * @throws {ValidationError} If the play data fails validation
   * @throws {DatabaseError} If there's an error retrieving the data
   * @throws {NotFoundError} If no play data is found for the game
   *
   * @example
   * ```typescript
   * const firstPlay = await PlayDataService.fetchFirstPlay("CIN201904150");
   * console.log(`First play inning: ${firstPlay.inning}, batter: ${firstPlay.batter}`);
   * ```
   */
  public async fetchFirstPlay(gameId: string): Promise<PlayData> {
    const playData = await playRepository.fetchFirstPlay(gameId);
    
    // Validate the play data before returning it
    return validateExternalData(
      PlayDataSchema,
      playData,
      `first play data for game ${gameId}`
    );
  }

  /**
   * Fetches play data for a game based on the current play index
   *
   * This method retrieves both the current play data and the next play data for a
   * specified game and play index. This is useful for determining what happens next
   * in the game sequence and for detecting changes between plays.
   *
   * The data is validated against the PlayDataResultSchema to ensure integrity.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param currentPlay The current play index (e.g., 42)
   * @returns A PlayDataResult object containing current and next play data
   * @throws {ValidationError} If the play data fails validation
   * @throws {DatabaseError} If there's an error retrieving the data
   * @throws {NotFoundError} If no play data is found for the game or play index
   *
   * @example
   * ```typescript
   * const { currentPlayData, nextPlayData } = await PlayDataService.fetchPlayData(
   *   "CIN201904150",
   *   42
   * );
   * console.log(`Current batter: ${currentPlayData.batter}, Next batter: ${nextPlayData.batter}`);
   * ```
   */
  public async fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult> {
    const playDataResult = await playRepository.fetchPlayData(gameId, currentPlay);
    
    // Validate the play data result before returning it
    return validateExternalData(
      PlayDataResultSchema,
      playDataResult,
      `play data for game ${gameId}, play ${currentPlay}`
    );
  }

  /**
   * Fetches the correct play for a specific batter
   *
   * This method retrieves play data for a specific batter in a game. This is useful
   * for finding the exact play where a particular player was at bat, which is important
   * for generating accurate play-by-play commentary and tracking player performance.
   *
   * The data is safely validated, returning null if validation fails rather than throwing an error.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param batter The batter ID (e.g., "vottj001")
   * @returns The play data for the batter, or null if not found or validation fails
   * @throws {DatabaseError} If there's an error retrieving the data
   *
   * @example
   * ```typescript
   * const battingPlay = await PlayDataService.fetchPlayForBatter(
   *   "CIN201904150",
   *   "vottj001"
   * );
   * if (battingPlay) {
   *   console.log(`Joey Votto's play: ${battingPlay.event}`);
   * }
   * ```
   */
  public async fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null> {
    const playData = await playRepository.fetchPlayForBatter(gameId, batter);
    
    // If no play data was found, return null
    if (!playData) {
      return null;
    }
    
    // Safely validate the play data, returning null if validation fails
    return safeValidateExternalData(
      PlayDataSchema,
      playData,
      `play data for batter ${batter} in game ${gameId}`
    );
  }

  // Static methods for backward compatibility during transition
  public static async fetchFirstPlay(gameId: string): Promise<PlayData> {
    return PlayDataService.getInstance().fetchFirstPlay(gameId);
  }

  public static async fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult> {
    return PlayDataService.getInstance().fetchPlayData(gameId, currentPlay);
  }

  public static async fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null> {
    return PlayDataService.getInstance().fetchPlayForBatter(gameId, batter);
  }
}