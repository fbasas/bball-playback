import { SimplifiedBaseballState } from '../../../../../common/types/SimplifiedBaseballState';
import { PlayData } from '../../../../../common/types/PlayData';
import { db } from '../../../config/database';
import { PlayerService } from '../player/PlayerService';
import { detectAndSaveLineupChanges, getLineupStateForPlay } from '../lineupTracking';
import { LineupError } from '../../../types/errors/GameErrors';
import { BaseService } from '../../BaseService';
import { LineupUtils } from '../../../utils/LineupUtils';
import { PlayerUtils } from '../../../utils/PlayerUtils';

/**
 * Service for handling lineup operations
 *
 * This service manages baseball team lineups, including tracking player positions,
 * batting orders, and changes throughout the game. It provides methods for updating
 * lineup information, processing lineup changes between plays, and determining the
 * next batter in a team's lineup.
 *
 * The LineupService works closely with the LineupUtils and PlayerService to provide
 * a complete picture of team lineups at any point in the game.
 *
 * @example
 * ```typescript
 * // Update lineup information in a simplified state
 * await LineupService.updateLineupInfo(
 *   gameId,
 *   sessionId,
 *   nextPlayData,
 *   simplifiedState
 * );
 *
 * // Process lineup changes between plays
 * await LineupService.processLineupChanges(
 *   gameId,
 *   sessionId,
 *   currentPlayData,
 *   nextPlayData
 * );
 * ```
 */
export class LineupService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: LineupService;
  private playerService: PlayerService;

  /**
   * Creates a new instance of the LineupService
   * @param dependencies Optional dependencies to inject
   */
  constructor(dependencies: Record<string, any> = {}) {
    super(dependencies);
    this.playerService = dependencies.playerService || PlayerService.getInstance();
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): LineupService {
    if (!LineupService.instance) {
      LineupService.instance = new LineupService({
        playerService: PlayerService.getInstance()
      });
    }
    return LineupService.instance;
  }

  /**
   * Updates lineup information in the simplified state
   *
   * This method retrieves the lineup state for the current play and updates the
   * simplified baseball state with the latest player information, including current
   * batters and pitchers for both teams. It uses the LineupUtils to process the
   * lineup data and extract the relevant information.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param sessionId The session ID for tracking the current game session
   * @param nextPlayData The next play data containing updated game situation
   * @param simplifiedState The simplified baseball state to update with lineup information
   * @returns Promise that resolves when the update is complete
   *
   * @example
   * ```typescript
   * await LineupService.updateLineupInfo(
   *   "CIN201904150",
   *   "123e4567-e89b-12d3-a456-426614174000",
   *   nextPlayData,
   *   simplifiedState
   * );
   * ```
   */
  public async updateLineupInfo(
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
      const playerMap = await this.playerService.getPlayersByIds(playerIds);
      
      // Get home and visiting team players
      const homeTeamId = nextPlayData.top_bot === 0 ? nextPlayData.pitteam : nextPlayData.batteam;
      const visitingTeamId = nextPlayData.top_bot === 0 ? nextPlayData.batteam : nextPlayData.pitteam;
      
      const homeTeamPlayers = LineupUtils.filterPlayersByTeam(updatedLineupState.players, homeTeamId);
      const visitingTeamPlayers = LineupUtils.filterPlayersByTeam(updatedLineupState.players, visitingTeamId);
      
      // Get current batters and pitchers using LineupUtils
      const homeBatterName = LineupUtils.getCurrentBatterName(homeTeamPlayers, playerMap);
      const homePitcherName = LineupUtils.getCurrentPitcherName(
        homeTeamPlayers,
        playerMap,
        nextPlayData.top_bot === 0
      );
      
      const visitingBatterName = LineupUtils.getCurrentBatterName(visitingTeamPlayers, playerMap);
      const visitingPitcherName = LineupUtils.getCurrentPitcherName(
        visitingTeamPlayers,
        playerMap,
        nextPlayData.top_bot === 1
      );
      
      // Update the simplified state with the current batters and pitchers
      simplifiedState.home.currentBatter = homeBatterName || null;
      simplifiedState.home.currentPitcher = homePitcherName || null;
      simplifiedState.visitors.currentBatter = visitingBatterName || null;
      simplifiedState.visitors.currentPitcher = visitingPitcherName || null;
    } catch (error) {
      // Log the error but don't throw it to avoid breaking the main flow
      console.error(`Error updating lineup info for game ${gameId}, play ${nextPlayData.pn}:`, error);
    }
  }

  /**
   * Processes lineup changes between plays
   *
   * This method detects and saves lineup changes between the current play and the next play.
   * It identifies substitutions, position changes, and batting order changes by comparing
   * the lineup data between plays. The changes are saved to the database for historical tracking.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param sessionId The session ID for tracking the current game session
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns Promise that resolves when the processing is complete
   * @throws {LineupError} If there's an error processing lineup changes
   *
   * @example
   * ```typescript
   * await LineupService.processLineupChanges(
   *   "CIN201904150",
   *   "123e4567-e89b-12d3-a456-426614174000",
   *   currentPlayData,
   *   nextPlayData
   * );
   * ```
   */
  public async processLineupChanges(
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
   *
   * This method determines the next batter in a team's lineup based on the current batter.
   * It retrieves the team's lineup from the database, finds the current batter's position
   * in the batting order, and returns the name of the player in the next position.
   *
   * The batting order wraps around from 9 back to 1, following standard baseball rules.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param teamId The team ID (e.g., "CIN")
   * @param currentBatterId The current batter ID (e.g., "vottj001")
   * @returns The next batter's name or null if not found
   *
   * @example
   * ```typescript
   * const nextBatter = await LineupService.getNextBatter(
   *   "CIN201904150",
   *   "CIN",
   *   "vottj001"
   * );
   * // Returns "Eugenio Suarez" if he's next in the batting order
   * ```
   */
  public async getNextBatter(
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
      return await this.playerService.getPlayerName(nextBatter.player_id);
    } catch (error) {
      console.error(`Error getting next batter for team ${teamId} in game ${gameId}:`, error);
      return null;
    }
  }

  // Static methods for backward compatibility during transition
  public static async updateLineupInfo(
    gameId: string,
    sessionId: string,
    nextPlayData: PlayData,
    simplifiedState: SimplifiedBaseballState
  ): Promise<void> {
    return LineupService.getInstance().updateLineupInfo(gameId, sessionId, nextPlayData, simplifiedState);
  }

  public static async processLineupChanges(
    gameId: string,
    sessionId: string,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<void> {
    return LineupService.getInstance().processLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
  }

  public static async getNextBatter(
    gameId: string,
    teamId: string,
    currentBatterId: string | null
  ): Promise<string | null> {
    return LineupService.getInstance().getNextBatter(gameId, teamId, currentBatterId);
  }
}