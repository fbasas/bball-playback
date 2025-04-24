import { db } from '../../../config/database';
import { DatabaseError } from '../../../types/errors/GameErrors';

/**
 * Interface for player information
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Service for handling player data operations
 */
export class PlayerService {
  // Cache for player information to reduce database queries
  private static playerCache: Map<string, PlayerInfo> = new Map();

  /**
   * Gets player information by ID
   * @param playerId The player ID
   * @returns The player information
   */
  public static async getPlayerById(playerId: string | null | undefined): Promise<PlayerInfo | null> {
    if (!playerId) return null;
    
    // Check cache first
    if (this.playerCache.has(playerId)) {
      return this.playerCache.get(playerId)!;
    }
    
    try {
      const player = await db('allplayers')
        .where({ id: playerId })
        .select('id', 'first', 'last')
        .first();
      
      if (!player) {
        // Cache null result to avoid repeated queries for non-existent players
        this.playerCache.set(playerId, {
          id: playerId,
          firstName: '',
          lastName: playerId, // Use ID as last name for unknown players
          fullName: playerId
        });
        return this.playerCache.get(playerId)!;
      }
      
      const playerInfo: PlayerInfo = {
        id: player.id,
        firstName: player.first || '',
        lastName: player.last || '',
        fullName: `${player.first || ''} ${player.last || ''}`.trim()
      };
      
      // Cache the result
      this.playerCache.set(playerId, playerInfo);
      
      return playerInfo;
    } catch (error) {
      throw new DatabaseError(`Error fetching player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets player information for multiple player IDs
   * @param playerIds Array of player IDs
   * @returns Map of player IDs to player information
   */
  public static async getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>> {
    if (!playerIds.length) return new Map();
    
    // Filter out IDs that are already in the cache
    const uncachedIds = playerIds.filter(id => !this.playerCache.has(id));
    
    if (uncachedIds.length > 0) {
      try {
        const players = await db('allplayers')
          .whereIn('id', uncachedIds)
          .select('id', 'first', 'last');
        
        // Add fetched players to cache
        players.forEach(player => {
          const playerInfo: PlayerInfo = {
            id: player.id,
            firstName: player.first || '',
            lastName: player.last || '',
            fullName: `${player.first || ''} ${player.last || ''}`.trim()
          };
          this.playerCache.set(player.id, playerInfo);
        });
        
        // Handle players that weren't found in the database
        const fetchedIds = new Set(players.map(p => p.id));
        uncachedIds.forEach(id => {
          if (!fetchedIds.has(id)) {
            this.playerCache.set(id, {
              id,
              firstName: '',
              lastName: id, // Use ID as last name for unknown players
              fullName: id
            });
          }
        });
      } catch (error) {
        throw new DatabaseError(`Error fetching players: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Create a map of the requested player IDs to their info
    const playerMap = new Map<string, PlayerInfo>();
    playerIds.forEach(id => {
      if (this.playerCache.has(id)) {
        playerMap.set(id, this.playerCache.get(id)!);
      }
    });
    
    return playerMap;
  }

  /**
   * Clears the player cache
   */
  public static clearCache(): void {
    this.playerCache.clear();
  }

  /**
   * Gets the full name of a player
   * @param playerId The player ID
   * @returns The player's full name or null if not found
   */
  public static async getPlayerName(playerId: string | null | undefined): Promise<string | null> {
    if (!playerId) return null;
    
    const playerInfo = await this.getPlayerById(playerId);
    return playerInfo ? playerInfo.fullName : null;
  }
}