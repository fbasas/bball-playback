import { ILineupTrackingService, LineupStateData, LineupPlayerData, LineupChangeData } from '../../interfaces';
import {
  getLatestLineupState as getLatestLineupStateDb,
  saveLineupState as saveLineupStateDb,
  saveInitialLineup as saveInitialLineupDb,
} from '../lineupTracking';
import { Player } from '../../../../../common/types/BaseballTypes';

/**
 * Service for lineup state persistence and retrieval.
 * Wraps the database functions to implement the ILineupTrackingService interface.
 */
export class LineupTrackingService implements ILineupTrackingService {
  /**
   * Gets the latest lineup state for a game session
   */
  async getLatestLineupState(
    gameId: string,
    sessionId: string
  ): Promise<{ id: number; playIndex: number; players: LineupPlayerData[] } | null> {
    const result = await getLatestLineupStateDb(gameId, sessionId);

    if (!result) {
      return null;
    }

    return {
      id: result.state.id,
      playIndex: result.state.playIndex,
      players: result.players,
    };
  }

  /**
   * Saves a new lineup state
   */
  async saveLineupState(
    stateData: LineupStateData,
    players: LineupPlayerData[],
    changes: LineupChangeData[]
  ): Promise<number> {
    return saveLineupStateDb(stateData, players, changes);
  }

  /**
   * Saves the initial lineup for a game.
   * Converts LineupPlayerData arrays to the format expected by saveInitialLineupDb.
   */
  async saveInitialLineup(
    gameId: string,
    sessionId: string,
    homeLineup: LineupPlayerData[],
    visitorLineup: LineupPlayerData[],
    playIndex: number
  ): Promise<number> {
    // The underlying function expects a different format with Player objects
    // We need to construct the team data objects
    const homeTeamId = homeLineup[0]?.teamId || '';
    const visitorTeamId = visitorLineup[0]?.teamId || '';

    // Find pitchers
    const homePitcher = homeLineup.find(p => p.isCurrentPitcher);
    const visitorPitcher = visitorLineup.find(p => p.isCurrentPitcher);

    // Convert LineupPlayerData to Player format expected by saveInitialLineupDb
    const toPlayers = (lineup: LineupPlayerData[]): Player[] => {
      return lineup.map(p => ({
        position: p.position,
        firstName: '', // Not available in LineupPlayerData
        lastName: '',
        retrosheet_id: p.playerId,
      }));
    };

    return saveInitialLineupDb(
      gameId,
      sessionId,
      {
        id: homeTeamId,
        lineup: toPlayers(homeLineup),
        currentPitcher: homePitcher?.playerId || '',
      },
      {
        id: visitorTeamId,
        lineup: toPlayers(visitorLineup),
        currentPitcher: visitorPitcher?.playerId || '',
      }
    );
  }
}

// Export singleton instance
export const lineupTrackingService = new LineupTrackingService();
