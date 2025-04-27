import { BaseService } from '../../BaseService';
import { playerRepository } from '../../../database/repositories/PlayerRepository';

/**
 * Interface for player information
 *
 * Represents the essential information about a baseball player,
 * including their unique identifier and name components.
 *
 * @property id - The unique identifier for the player (typically a Retrosheet ID)
 * @property firstName - The player's first name
 * @property lastName - The player's last name
 * @property fullName - The player's full name (firstName + lastName)
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Service for handling player data operations
 *
 * This service provides methods for retrieving player information from the database.
 * It includes functionality for getting individual players by ID, retrieving multiple
 * players at once, and getting player names. The service uses caching to improve
 * performance for frequently accessed player data.
 *
 * The PlayerService is a critical component for the baseball playback system as it
 * provides the player information needed for lineup tracking, commentary generation,
 * and game state management.
 *
 * @example
 * ```typescript
 * // Get a player by ID
 * const player = await PlayerService.getPlayerById("vottj001");
 * console.log(`Player name: ${player.fullName}`);
 *
 * // Get multiple players by IDs
 * const playerIds = ["vottj001", "castl003", "puigy001"];
 * const playerMap = await PlayerService.getPlayersByIds(playerIds);
 * ```
 */
export class PlayerService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: PlayerService;

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): PlayerService {
    if (!PlayerService.instance) {
      PlayerService.instance = new PlayerService();
    }
    return PlayerService.instance;
  }

  /**
   * Gets player information by ID
   *
   * Retrieves detailed information about a player from the database using their unique ID.
   * This method is used throughout the application to get player details for display,
   * lineup tracking, and commentary generation.
   *
   * The method returns null if the playerId is null or undefined, making it safe to use
   * with optional player IDs.
   *
   * @param playerId The player ID (e.g., "vottj001") or null/undefined
   * @returns The player information object or null if not found or invalid ID
   *
   * @example
   * ```typescript
   * const player = await PlayerService.getPlayerById("vottj001");
   * if (player) {
   *   console.log(`Found player: ${player.firstName} ${player.lastName}`);
   * }
   * ```
   */
  public async getPlayerById(playerId: string | null | undefined): Promise<PlayerInfo | null> {
    if (!playerId) return null;
    return playerRepository.getPlayerById(playerId);
  }

  /**
   * Gets player information for multiple player IDs
   *
   * Retrieves information for multiple players in a single database query, which is more
   * efficient than making separate requests for each player. The results are returned as
   * a Map with player IDs as keys and player information objects as values.
   *
   * This method is particularly useful when processing lineups or plays that involve
   * multiple players.
   *
   * @param playerIds Array of player IDs to retrieve
   * @returns Map of player IDs to player information objects
   *
   * @example
   * ```typescript
   * const playerIds = ["vottj001", "castl003", "puigy001"];
   * const playerMap = await PlayerService.getPlayersByIds(playerIds);
   *
   * playerIds.forEach(id => {
   *   const player = playerMap.get(id);
   *   if (player) {
   *     console.log(`${player.fullName} plays for the Reds`);
   *   }
   * });
   * ```
   */
  public async getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>> {
    if (!playerIds.length) return new Map();
    return playerRepository.getPlayersByIds(playerIds);
  }

  /**
   * Clears the player cache
   *
   * Removes all cached player information, forcing subsequent requests to retrieve
   * fresh data from the database. This is useful when player data has been updated
   * or when troubleshooting cache-related issues.
   *
   * @example
   * ```typescript
   * // After updating player information in the database
   * PlayerService.clearCache();
   * ```
   */
  public clearCache(): void {
    playerRepository.clearCache();
  }

  /**
   * Gets the full name of a player
   *
   * Retrieves just the full name of a player without fetching all the player details.
   * This is a convenience method for cases where only the player's name is needed,
   * such as for display purposes or commentary generation.
   *
   * @param playerId The player ID (e.g., "vottj001") or null/undefined
   * @returns The player's full name or null if not found or invalid ID
   *
   * @example
   * ```typescript
   * const playerName = await PlayerService.getPlayerName("vottj001");
   * console.log(`Batter: ${playerName}`); // Outputs: "Batter: Joey Votto"
   * ```
   */
  public async getPlayerName(playerId: string | null | undefined): Promise<string | null> {
    if (!playerId) return null;
    return playerRepository.getPlayerName(playerId);
  }

  // Static methods for backward compatibility during transition
  public static async getPlayerById(playerId: string | null | undefined): Promise<PlayerInfo | null> {
    return PlayerService.getInstance().getPlayerById(playerId);
  }

  public static async getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>> {
    return PlayerService.getInstance().getPlayersByIds(playerIds);
  }

  public static clearCache(): void {
    PlayerService.getInstance().clearCache();
  }

  public static async getPlayerName(playerId: string | null | undefined): Promise<string | null> {
    return PlayerService.getInstance().getPlayerName(playerId);
  }
}