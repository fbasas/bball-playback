import { PlayerInfo } from '../services/game/player/PlayerService';
import { LineupPlayerData } from '../services/game/lineupTracking';

/**
 * Interface for formatted lineup player data
 */
export interface FormattedLineupPlayer {
  position: string;
  firstName: string;
  lastName: string;
  retrosheet_id: string;
}

/**
 * Utility functions for lineup-related operations
 */
export class LineupUtils {
  /**
   * Processes lineup players and returns formatted lineup data
   * @param players Array of lineup player data
   * @param playerMap Map of player IDs to player information
   * @param teamId Team ID to filter players by
   * @returns Array of formatted lineup players
   */
  public static processLineupPlayers(
    players: LineupPlayerData[],
    playerMap: Map<string, PlayerInfo>,
    teamId: string
  ): FormattedLineupPlayer[] {
    return players
      .filter(p => p.teamId === teamId)
      .sort((a, b) => a.battingOrder - b.battingOrder)
      .map(p => {
        const player = playerMap.get(p.playerId);
        return {
          position: p.position,
          firstName: player?.firstName || '',
          lastName: player?.lastName || '',
          retrosheet_id: p.playerId
        };
      });
  }

  /**
   * Gets the current pitcher name for a team
   * @param teamPlayers Array of team players
   * @param playerMap Map of player IDs to player information
   * @param isTopInning Whether it's the top of the inning
   * @param pitcherId Pitcher ID from play data (fallback)
   * @returns The current pitcher's name
   */
  public static getCurrentPitcherName(
    teamPlayers: LineupPlayerData[],
    playerMap: Map<string, PlayerInfo>,
    isTopInning: boolean,
    pitcherId?: string | null
  ): string {
    const pitcher = teamPlayers.find(p => p.isCurrentPitcher);
    
    if (pitcher) {
      return playerMap.get(pitcher.playerId)?.fullName || '';
    }
    
    return pitcherId ? playerMap.get(pitcherId)?.fullName || '' : '';
  }

  /**
   * Gets the current batter name for a team
   * @param teamPlayers Array of team players
   * @param playerMap Map of player IDs to player information
   * @returns The current batter's name
   */
  public static getCurrentBatterName(
    teamPlayers: LineupPlayerData[],
    playerMap: Map<string, PlayerInfo>
  ): string {
    const batter = teamPlayers.find(p => p.isCurrentBatter);
    return batter ? playerMap.get(batter.playerId)?.fullName || '' : '';
  }

  /**
   * Filters players by team ID
   * @param players Array of lineup player data
   * @param teamId Team ID to filter by
   * @returns Array of filtered players
   */
  public static filterPlayersByTeam(
    players: LineupPlayerData[],
    teamId: string
  ): LineupPlayerData[] {
    return players.filter(p => p.teamId === teamId);
  }
}