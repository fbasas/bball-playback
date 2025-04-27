import { PlayerService, PlayerInfo } from '../services/game/player/PlayerService';

/**
 * Utility functions for player-related operations
 */
export class PlayerUtils {
  private static playerService = PlayerService.getInstance();

  /**
   * Gets a player's full name from their ID
   * @param playerId The player ID
   * @returns The player's full name or empty string if not found
   */
  public static async getPlayerName(playerId: string | null | undefined): Promise<string> {
    if (!playerId) return '';
    const playerName = await this.playerService.getPlayerName(playerId);
    return playerName || '';
  }

  /**
   * Gets player information for multiple player IDs
   * @param playerIds Array of player IDs
   * @returns Map of player IDs to player information
   */
  public static async getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>> {
    if (!playerIds.length) return new Map();
    return this.playerService.getPlayersByIds(playerIds);
  }

  /**
   * Gets player names for multiple player IDs
   * @param playerIds Array of player IDs
   * @returns Map of player IDs to player names
   */
  public static async getPlayerNames(playerIds: string[]): Promise<Map<string, string>> {
    if (!playerIds.length) return new Map();
    
    const playerMap = await PlayerService.getPlayersByIds(playerIds);
    const nameMap = new Map<string, string>();
    
    playerIds.forEach(id => {
      const player = playerMap.get(id);
      nameMap.set(id, player ? player.fullName : '');
    });
    
    return nameMap;
  }

  /**
   * Gets runner names from play data
   * @param playerMap Map of player IDs to player information
   * @param br1 Runner on first base ID
   * @param br2 Runner on second base ID
   * @param br3 Runner on third base ID
   * @returns Object with runner names
   */
  public static getRunnerNames(
    playerMap: Map<string, PlayerInfo>,
    br1?: string | null,
    br2?: string | null,
    br3?: string | null
  ): { onFirst: string, onSecond: string, onThird: string } {
    return {
      onFirst: br1 ? playerMap.get(br1)?.fullName || '' : '',
      onSecond: br2 ? playerMap.get(br2)?.fullName || '' : '',
      onThird: br3 ? playerMap.get(br3)?.fullName || '' : ''
    };
  }
}