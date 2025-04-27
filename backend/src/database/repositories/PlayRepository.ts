import { CachedRepository } from './CachedRepository';
import { PlayData, PlayDataResult } from '../../../../common/types/PlayData';
import { caches } from '../../core/caching';
import { CacheManager } from '../../core/caching/CacheManager';
import { ResourceNotFoundError, DatabaseError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';
import { performanceMonitor } from '../../core/performance';

/**
 * Repository for play data
 */
export class PlayRepository extends CachedRepository<PlayData, string> {
  protected tableName = 'plays';
  protected primaryKey = 'pn';
  protected cacheKeyPrefix = 'play';
  protected entityCache = caches.plays as CacheManager<string, PlayData>;
  protected collectionCache = new CacheManager<string, PlayData[]>({ ttl: 300000 }); // 5 minutes TTL
  
  /**
   * Fetches the first play for a game
   * @param gameId The game ID
   * @returns The first play data
   */
  async fetchFirstPlay(gameId: string): Promise<PlayData> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:first`;
    
    try {
      return await this.entityCache.getOrCompute(cacheKey, async () => {
        // Use the optimized query with the new index
        const firstPlay = await performanceMonitor.measure(
          `${this.tableName}.fetchFirstPlay`,
          async () => {
            return db(this.tableName)
              .select('*', 'runs')
              .where({ gid: gameId })
              .orderBy('pn', 'asc')
              .first();
          },
          { gameId }
        );
          
        if (!firstPlay) {
          throw new ResourceNotFoundError(`No plays found for the specified game ID: ${gameId}`);
        }
        
        return firstPlay as PlayData;
      });
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
  async fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult> {
    const currentPlayCacheKey = `${this.cacheKeyPrefix}:${gameId}:${currentPlay}`;
    const nextPlayCacheKey = `${this.cacheKeyPrefix}:${gameId}:next:${currentPlay}`;
    
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
      
      // Get the current play data from cache or database
      const currentPlayData = await this.entityCache.getOrCompute(currentPlayCacheKey, async () => {
        // Use the optimized query with the new index
        const play = await performanceMonitor.measure(
          `${this.tableName}.fetchCurrentPlay`,
          async () => {
            return db(this.tableName)
              .where({ gid: gameId, pn: currentPlay })
              .first();
          },
          { gameId, currentPlay }
        );
        
        if (!play) {
          throw new ResourceNotFoundError(`Current play not found for the specified game ID: ${gameId}`);
        }
        
        return play as PlayData;
      });
      
      // Get the next play data from cache or database
      const nextPlayData = await this.entityCache.getOrCompute(nextPlayCacheKey, async () => {
        // Use the optimized query with the new index
        const play = await performanceMonitor.measure(
          `${this.tableName}.fetchNextPlay`,
          async () => {
            return db(this.tableName)
              .where({ gid: gameId })
              .where('pn', '>', currentPlay)
              .orderBy('pn', 'asc')
              .first();
          },
          { gameId, currentPlay }
        );
        
        if (!play) {
          throw new ResourceNotFoundError(`No more plays found for the specified game ID: ${gameId}`);
        }
        
        return play as PlayData;
      });
      
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
  private validatePlayData(playData: PlayData, context: string): void {
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
  async fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:batter:${batter}`;
    
    try {
      // Use the optimized query with the new index
      const result = await performanceMonitor.measure(
        `${this.tableName}.fetchPlayForBatter`,
        async () => {
          return db(this.tableName)
            .where({ gid: gameId, batter })
            .first();
        },
        { gameId, batter }
      );
      
      if (result) {
        this.entityCache.set(cacheKey, result as PlayData);
      }
      
      return result || null;
    } catch (error) {
      throw new DatabaseError(`Error fetching play for batter ${batter} in game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Fetches all plays for a game
   * @param gameId The game ID
   * @returns An array of play data
   */
  async fetchAllPlaysForGame(gameId: string): Promise<PlayData[]> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:all`;
    
    try {
      return this.collectionCache.getOrCompute(cacheKey, async () => {
        // Use the optimized query with the new index
        const plays = await performanceMonitor.measure(
          `${this.tableName}.fetchAllPlaysForGame`,
          async () => {
            return db(this.tableName)
              .where({ gid: gameId })
              .orderBy('pn', 'asc')
              .select('*');
          },
          { gameId }
        );
        
        if (!plays || plays.length === 0) {
          throw new ResourceNotFoundError(`No plays found for the specified game ID: ${gameId}`);
        }
        
        return plays;
      });
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError(`Error fetching all plays for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Fetches plays up to a specific play index
   * @param gameId The game ID
   * @param upToPlay The maximum play index (exclusive)
   * @returns An array of play data
   */
  async fetchPlaysUpTo(gameId: string, upToPlay: number): Promise<PlayData[]> {
    const cacheKey = `${this.cacheKeyPrefix}:${gameId}:upTo:${upToPlay}`;
    
    try {
      return this.collectionCache.getOrCompute(cacheKey, async () => {
        // Use the optimized query with the new index
        const plays = await performanceMonitor.measure(
          `${this.tableName}.fetchPlaysUpTo`,
          async () => {
            return db(this.tableName)
              .where({ gid: gameId })
              .where('pn', '<', upToPlay)
              .orderBy('pn', 'asc')
              .select('*');
          },
          { gameId, upToPlay }
        );
        
        return plays;
      });
    } catch (error) {
      throw new DatabaseError(`Error fetching plays up to ${upToPlay} for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export a singleton instance
export const playRepository = new PlayRepository();