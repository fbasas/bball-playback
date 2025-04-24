import { db } from '../../../config/database';
import { PlayData, PlayDataResult } from '../../../../../common/types/PlayData';
import { ResourceNotFoundError, DatabaseError } from '../../../types/errors/GameErrors';

/**
 * Service for handling play data operations
 */
export class PlayDataService {
  /**
   * Fetches the first play for a game
   * @param gameId The game ID
   * @returns The first play data
   */
  public static async fetchFirstPlay(gameId: string): Promise<PlayData> {
    try {
      const firstPlay = await db('plays')
        .select('*', 'runs')
        .where({ gid: gameId })
        .orderBy('pn', 'asc')
        .first();
        
      if (!firstPlay) {
        throw new ResourceNotFoundError(`No plays found for the specified game ID: ${gameId}`);
      }
      
      return firstPlay;
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error fetching first play for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetches play data for a game based on the current play index
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @returns A PlayDataResult object containing current and next play data
   */
  public static async fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult> {
    try {
      // Special case for currentPlay=0 (after initialization)
      if (currentPlay === 0) {
        // For currentPlay=0, create a dummy current play data
        const dummyCurrentPlayData = {
          gid: gameId,
          pn: 0,
          inning: 1,
          top_bot: 0, // Top of inning
          outs_pre: 0,
          batteam: '', // Will be populated from first play
          pitteam: '', // Will be populated from first play
        };
        
        // Get the first play
        const firstPlay = await this.fetchFirstPlay(gameId);
            
        // Set batteam and pitteam from first play
        dummyCurrentPlayData.batteam = firstPlay.batteam;
        dummyCurrentPlayData.pitteam = firstPlay.pitteam;
        
        return {
          currentPlayData: dummyCurrentPlayData as PlayData,
          nextPlayData: firstPlay
        };
      }
      
      // Find the next play directly with a more efficient query
      const nextPlayData = await db('plays')
        .where({ gid: gameId })
        .where('pn', '>', currentPlay)
        .orderBy('pn', 'asc')
        .first();
      
      if (!nextPlayData) {
        throw new ResourceNotFoundError(`No more plays found for the specified game ID: ${gameId}`);
      }
      
      // Get the current play data
      const currentPlayData = await db('plays')
        .where({ gid: gameId, pn: currentPlay })
        .first();
      
      if (!currentPlayData) {
        throw new ResourceNotFoundError(`Current play not found for the specified game ID: ${gameId}`);
      }
      
      this.validatePlayData(currentPlayData, 'current play');
      this.validatePlayData(nextPlayData, 'next play');
      
      // Default runs to 0 if missing
      if (nextPlayData.runs === undefined || nextPlayData.runs === null) {
        nextPlayData.runs = 0;
      }
      
      // Check for the event field
      if (!nextPlayData.event) {
        throw new ResourceNotFoundError(`Event data not found for the specified play`);
      }
      
      return { currentPlayData, nextPlayData };
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error fetching play data for game ${gameId}, play ${currentPlay}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that the play data contains all required fields
   * @param playData The play data to validate
   * @param context Context string for error messages
   */
  private static validatePlayData(playData: PlayData, context: string): void {
    if (!playData.inning || playData.top_bot === undefined ||
        playData.outs_pre === undefined || playData.batteam === undefined ||
        playData.pitteam === undefined) {
      throw new ResourceNotFoundError(`Missing required data in ${context}`);
    }
  }

  /**
   * Fetches the correct play for a specific batter
   * @param gameId The game ID
   * @param batter The batter ID
   * @returns The play data for the batter, or null if not found
   */
  public static async fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null> {
    try {
      const play = await db('plays')
        .where({ gid: gameId, batter })
        .first();
      
      return play || null;
    } catch (error) {
      throw new DatabaseError(`Error fetching play for batter ${batter} in game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}