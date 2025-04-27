import { CachedRepository } from './CachedRepository';
import { caches } from '../../core/caching';
import { CacheManager } from '../../core/caching/CacheManager';
import { DatabaseError, ResourceNotFoundError } from '../../types/errors/GameErrors';
import { db } from '../../config/database';

/**
 * Interface for game entity
 */
export interface GameEntity {
  id: string;
  date: string;
  home_team: string;
  visiting_team: string;
  stadium: string;
  status: string;
  [key: string]: any;
}

/**
 * Interface for team entity
 */
export interface TeamEntity {
  team: string;
  city: string;
  nickname: string;
  [key: string]: any;
}

/**
 * Repository for game data
 */
export class GameRepository extends CachedRepository<GameEntity, string> {
  protected tableName = 'games';
  protected primaryKey = 'id';
  protected cacheKeyPrefix = 'game';
  protected entityCache = caches.games as CacheManager<string, GameEntity | null>;
  
  /**
   * Cache for team entities
   */
  private teamCache = new CacheManager<string, TeamEntity | null>({ ttl: 3600000 }); // 1 hour TTL
  protected collectionCache = new CacheManager<string, GameEntity[]>({ ttl: 3600000 }); // 1 hour TTL
  
  /**
   * Gets a game by ID
   * @param gameId The game ID
   * @returns The game entity or null if not found
   */
  async getGameById(gameId: string): Promise<GameEntity | null> {
    try {
      return await this.findById(gameId);
    } catch (error) {
      throw new DatabaseError(`Error fetching game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Gets a team by ID
   * @param teamId The team ID
   * @returns The team entity or null if not found
   */
  async getTeamById(teamId: string): Promise<TeamEntity | null> {
    const cacheKey = `team:${teamId}`;
    
    try {
      const cachedTeam = this.teamCache.get(cacheKey);
      if (cachedTeam) {
        return cachedTeam;
      }
      
      const team = await db('teams')
        .where({ team: teamId })
        .first();
      
      const result = team || null;
      if (result) {
        this.teamCache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      throw new DatabaseError(`Error fetching team ${teamId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Gets the display name for a team
   * @param teamId The team ID
   * @returns The team's display name (city + nickname)
   */
  async getTeamDisplayName(teamId: string): Promise<string> {
    try {
      const team = await this.getTeamById(teamId);
      
      if (team) {
        return `${team.city || ''} ${team.nickname || ''}`.trim();
      }
      
      // Fallback for common teams
      return teamId === 'NYA' ? 'New York Yankees' : 
             teamId === 'LAN' ? 'Los Angeles Dodgers' : 
             'Home Team';
    } catch (error) {
      console.error(`Error getting team display name for ${teamId}:`, error);
      return 'Home Team';
    }
  }
  
  /**
   * Gets the short name for a team
   * @param teamId The team ID
   * @returns The team's short name (nickname)
   */
  async getTeamShortName(teamId: string): Promise<string> {
    try {
      const team = await this.getTeamById(teamId);
      
      if (team) {
        return team.nickname || '';
      }
      
      // Fallback for common teams
      return teamId === 'NYA' ? 'Yankees' : 
             teamId === 'LAN' ? 'Dodgers' : 
             'Home';
    } catch (error) {
      console.error(`Error getting team short name for ${teamId}:`, error);
      return 'Home';
    }
  }
  
  /**
   * Gets the home and visiting team IDs for a game
   * @param gameId The game ID
   * @param topBot The top/bottom inning indicator (0 for top, 1 for bottom)
   * @param batTeam The batting team ID
   * @param pitTeam The pitching team ID
   * @returns An object with home and visiting team IDs
   */
  async getTeamIds(
    gameId: string,
    topBot: number,
    batTeam: string,
    pitTeam: string
  ): Promise<{ homeTeamId: string; visitingTeamId: string }> {
    try {
      // First try to get from the game entity
      const game = await this.getGameById(gameId);
      
      if (game && game.home_team && game.visiting_team) {
        return {
          homeTeamId: game.home_team,
          visitingTeamId: game.visiting_team
        };
      }
      
      // Fallback to using the top/bot, batTeam, and pitTeam
      const homeTeamId = topBot === 0 ? pitTeam : batTeam;
      const visitingTeamId = topBot === 0 ? batTeam : pitTeam;
      
      return { homeTeamId, visitingTeamId };
    } catch (error) {
      // Fallback to using the top/bot, batTeam, and pitTeam
      const homeTeamId = topBot === 0 ? pitTeam : batTeam;
      const visitingTeamId = topBot === 0 ? batTeam : pitTeam;
      
      return { homeTeamId, visitingTeamId };
    }
  }
}

// Export a singleton instance
export const gameRepository = new GameRepository();