import { CachedRepository } from './CachedRepository';
import { PlayerInfo } from '../../services/game/player/PlayerService';
import { caches } from '../../core/caching';
import { CacheManager } from '../../core/caching/CacheManager';
import { DatabaseError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';
import { performanceMonitor } from '../../core/performance';

/**
 * Interface for player entity
 */
export interface PlayerEntity {
  id: string;
  first: string;
  last: string;
  retrosheet_id?: string;
}

/**
 * Repository for player data
 */
export class PlayerRepository extends CachedRepository<PlayerEntity, string> {
  protected tableName = 'allplayers';
  protected primaryKey = 'id';
  protected cacheKeyPrefix = 'player';
  protected entityCache = caches.players as CacheManager<string, PlayerEntity | null>;
  protected collectionCache = new CacheManager<string, PlayerEntity[]>({ ttl: 3600000 }); // 1 hour TTL
  
  /**
   * Converts a PlayerEntity to PlayerInfo
   * @param entity The player entity
   * @returns The player info
   */
  private toPlayerInfo(entity: PlayerEntity): PlayerInfo {
    return {
      id: entity.id,
      firstName: entity.first || '',
      lastName: entity.last || '',
      fullName: `${entity.first || ''} ${entity.last || ''}`.trim()
    };
  }
  
  /**
   * Gets player information by ID
   * @param playerId The player ID
   * @returns The player information or null if not found
   */
  async getPlayerById(playerId: string): Promise<PlayerInfo | null> {
    if (!playerId) return null;
    
    try {
      const player = await this.findById(playerId);
      
      if (!player) {
        // Create a default player info for unknown players
        const defaultPlayer: PlayerInfo = {
          id: playerId,
          firstName: '',
          lastName: playerId, // Use ID as last name for unknown players
          fullName: playerId
        };
        
        return defaultPlayer;
      }
      
      return this.toPlayerInfo(player);
    } catch (error) {
      throw new DatabaseError(`Error fetching player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Gets player information for multiple player IDs
   * @param playerIds Array of player IDs
   * @returns Map of player IDs to player information
   */
  async getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>> {
    if (!playerIds.length) return new Map();
    
    try {
      const playerMap = new Map<string, PlayerInfo>();
      
      // Process players in batches to avoid excessive cache misses
      const batchSize = 20;
      for (let i = 0; i < playerIds.length; i += batchSize) {
        const batch = playerIds.slice(i, i + batchSize);
        
        // Find players that aren't in the cache
        const uncachedIds: string[] = [];
        for (const id of batch) {
          const cached = this.entityCache.get(id);
          if (cached !== undefined) {
            if (cached !== null) {
              playerMap.set(id, this.toPlayerInfo(cached));
            }
          } else {
            uncachedIds.push(id);
          }
        }
        
        if (uncachedIds.length > 0) {
          // Fetch uncached players from the database with performance monitoring
          const players = await performanceMonitor.measure(
            `${this.tableName}.getPlayersByIds.batch`,
            async () => {
              return db(this.tableName)
                .whereIn('id', uncachedIds)
                .select('id', 'first', 'last');
            },
            { playerCount: uncachedIds.length }
          );
          
          // Add fetched players to cache and result map
          for (const player of players) {
            this.entityCache.set(player.id, player);
            playerMap.set(player.id, this.toPlayerInfo(player));
          }
          
          // Handle players that weren't found in the database
          const fetchedIds = new Set(players.map(p => p.id));
          for (const id of uncachedIds) {
            if (!fetchedIds.has(id)) {
              // Create a default player info for unknown players
              const defaultPlayer: PlayerInfo = {
                id,
                firstName: '',
                lastName: id, // Use ID as last name for unknown players
                fullName: id
              };
              
              // Cache the default player
              this.entityCache.set(id, {
                id,
                first: '',
                last: id
              });
              
              playerMap.set(id, defaultPlayer);
            }
          }
        }
      }
      
      return playerMap;
    } catch (error) {
      throw new DatabaseError(`Error fetching players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Gets the full name of a player
   * @param playerId The player ID
   * @returns The player's full name or null if not found
   */
  async getPlayerName(playerId: string): Promise<string | null> {
    if (!playerId) return null;
    
    const playerInfo = await this.getPlayerById(playerId);
    return playerInfo ? playerInfo.fullName : null;
  }
}

// Export a singleton instance
export const playerRepository = new PlayerRepository();