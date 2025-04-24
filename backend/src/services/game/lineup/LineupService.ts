import { SimplifiedBaseballState } from '../../../../../common/types/SimplifiedBaseballState';
import { PlayData } from '../../../../../common/types/PlayData';
import { db } from '../../../config/database';
import { PlayerService } from '../player/PlayerService';
import { detectAndSaveLineupChanges, getLineupStateForPlay } from '../lineupTracking';
import { LineupError } from '../../../types/errors/GameErrors';

/**
 * Service for handling lineup operations
 */
export class LineupService {
  /**
   * Updates lineup information in the simplified state
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param nextPlayData The next play data
   * @param simplifiedState The simplified baseball state to update
   */
  public static async updateLineupInfo(
    gameId: string,
    sessionId: string,
    nextPlayData: PlayData,
    simplifiedState: SimplifiedBaseballState
  ): Promise<void> {
    try {
      // Get the updated lineup state
      const updatedLineupState = await getLineupStateForPlay(gameId, sessionId, nextPlayData.pn);
      
      if (!updatedLineupState) {
        return;
      }
      
      // Get player names
      const playerIds = updatedLineupState.players.map(p => p.playerId);
      const playerMap = await PlayerService.getPlayersByIds(playerIds);
      
      // Get home and visiting team players
      const homeTeamId = nextPlayData.top_bot === 0 ? nextPlayData.pitteam : nextPlayData.batteam;
      const visitingTeamId = nextPlayData.top_bot === 0 ? nextPlayData.batteam : nextPlayData.pitteam;
      
      const homeTeamPlayers = updatedLineupState.players.filter(p => p.teamId === homeTeamId);
      const visitingTeamPlayers = updatedLineupState.players.filter(p => p.teamId === visitingTeamId);
      
      // Get current batters and pitchers
      const homeBatter = homeTeamPlayers.find(p => p.isCurrentBatter);
      const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
      const visitingBatter = visitingTeamPlayers.find(p => p.isCurrentBatter);
      const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
      
      // Update the simplified state with the current batters and pitchers
      if (homeBatter) {
        const player = playerMap.get(homeBatter.playerId);
        simplifiedState.home.currentBatter = player ? player.fullName : null;
      }
      
      if (homePitcher) {
        const player = playerMap.get(homePitcher.playerId);
        simplifiedState.home.currentPitcher = player ? player.fullName : null;
      }
      
      if (visitingBatter) {
        const player = playerMap.get(visitingBatter.playerId);
        simplifiedState.visitors.currentBatter = player ? player.fullName : null;
      }
      
      if (visitingPitcher) {
        const player = playerMap.get(visitingPitcher.playerId);
        simplifiedState.visitors.currentPitcher = player ? player.fullName : null;
      }
    } catch (error) {
      // Log the error but don't throw it to avoid breaking the main flow
      console.error(`Error updating lineup info for game ${gameId}, play ${nextPlayData.pn}:`, error);
    }
  }

  /**
   * Processes lineup changes between plays
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   */
  public static async processLineupChanges(
    gameId: string,
    sessionId: string,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<void> {
    try {
      await detectAndSaveLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
    } catch (error) {
      throw new LineupError(`Error processing lineup changes for game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the next batter for a team
   * @param gameId The game ID
   * @param teamId The team ID
   * @param currentBatterId The current batter ID
   * @returns The next batter's name or null if not found
   */
  public static async getNextBatter(
    gameId: string,
    teamId: string,
    currentBatterId: string | null
  ): Promise<string | null> {
    try {
      if (!currentBatterId) return null;
      
      // Get the team's lineup
      const lineupPlayers = await db('lineup_players')
        .join('lineup_states', 'lineup_players.lineup_state_id', 'lineup_states.id')
        .where({
          'lineup_states.game_id': gameId,
          'lineup_players.team_id': teamId
        })
        .orderBy('lineup_states.play_index', 'desc')
        .select('lineup_players.player_id', 'lineup_players.batting_order');
      
      if (!lineupPlayers || lineupPlayers.length === 0) return null;
      
      // Find the current batter's position in the lineup
      const currentBatterPosition = lineupPlayers.find((p: { player_id: string, batting_order: number }) =>
        p.player_id === currentBatterId)?.batting_order;
      if (!currentBatterPosition) return null;
      
      // Find the next batter (next batting order position, wrapping around to 1 if needed)
      const nextBatterPosition = currentBatterPosition % 9 + 1;
      const nextBatter = lineupPlayers.find((p: { player_id: string, batting_order: number }) =>
        p.batting_order === nextBatterPosition);
      if (!nextBatter) return null;
      
      // Get the player's name
      return await PlayerService.getPlayerName(nextBatter.player_id);
    } catch (error) {
      console.error(`Error getting next batter for team ${teamId} in game ${gameId}:`, error);
      return null;
    }
  }
}