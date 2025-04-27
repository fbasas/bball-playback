import { BaseballState, createEmptyBaseballState } from '../../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../../common/types/PlayData';
import { PlayerService } from '../player/PlayerService';
import { getLineupStateForPlay } from '../lineupTracking';
import { gameRepository } from '../../../database/repositories/GameRepository';
import { validateExternalData } from '../../../utils/TypeCheckUtils';
import { BaseballStateSchema } from '../../../validation';
import { logger, contextLogger } from '../../../core/logging';
import { BaseService } from '../../BaseService';
import { LineupUtils, FormattedLineupPlayer } from '../../../utils/LineupUtils';
import { PlayerUtils } from '../../../utils/PlayerUtils';

/**
 * Service for handling baseball state operations
 *
 * This service is responsible for creating and managing the state of a baseball game,
 * including tracking the current inning, outs, runners on base, and team information.
 * It also processes lineup changes and updates the state accordingly.
 *
 * @example
 * ```typescript
 * // Create an initial baseball state
 * const state = await BaseballStateService.createInitialBaseballState(
 *   gameId,
 *   sessionId,
 *   currentPlay,
 *   currentPlayData
 * );
 *
 * // Process lineup state
 * const updatedState = await BaseballStateService.processLineupState(
 *   gameId,
 *   sessionId,
 *   currentPlay,
 *   state,
 *   currentPlayData,
 *   nextPlayData
 * );
 * ```
 */
export class BaseballStateService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: BaseballStateService;
  private playerService: PlayerService;

  /**
   * Creates a new instance of the BaseballStateService
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
  public static getInstance(): BaseballStateService {
    if (!BaseballStateService.instance) {
      BaseballStateService.instance = new BaseballStateService({
        playerService: PlayerService.getInstance()
      });
    }
    return BaseballStateService.instance;
  }

  /**
   * Creates an initial baseball state from play data
   *
   * This method initializes a new BaseballState object with the basic game information,
   * including team names, inning, outs, and other game state properties. It uses the
   * current play data to determine the home and visiting teams and their initial state.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param sessionId The session ID for tracking the current game session
   * @param currentPlay The current play index (typically 0 for initialization)
   * @param currentPlayData The current play data containing game information
   * @returns A fully initialized BaseballState object
   * @throws {ValidationError} If the created state fails validation
   * @throws {DatabaseError} If there's an error retrieving team information
   *
   * @example
   * ```typescript
   * const initialState = await BaseballStateService.createInitialBaseballState(
   *   "CIN201904150",
   *   "123e4567-e89b-12d3-a456-426614174000",
   *   0,
   *   firstPlayData
   * );
   * ```
   */
  public async createInitialBaseballState(
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentPlayData: PlayData
  ): Promise<BaseballState> {
    // Determine home and visiting team IDs
    const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;
    const visitingTeamId = currentPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam;
    
    // Get team information from the repository
    const homeDisplayName = await gameRepository.getTeamDisplayName(homeTeamId);
    const homeShortName = await gameRepository.getTeamShortName(homeTeamId);
    const visitingDisplayName = await gameRepository.getTeamDisplayName(visitingTeamId);
    const visitingShortName = await gameRepository.getTeamShortName(visitingTeamId);
    
    // Try to get pitcher information from the current play data
    let homePitcherName = "Unknown Pitcher";
    let visitingPitcherName = "Unknown Pitcher";
    
    try {
      // If we have pitcher ID in the play data, try to get the name
      if (currentPlayData.pitcher) {
        const pitcherInfo = await this.playerService.getPlayerById(currentPlayData.pitcher);
        if (pitcherInfo) {
          const pitcherName = pitcherInfo.fullName || `${pitcherInfo.firstName} ${pitcherInfo.lastName}`.trim();
          
          // Assign to the correct team based on top/bottom of inning
          if (currentPlayData.top_bot === 0) {
            // Top of inning - home team is pitching
            homePitcherName = pitcherName;
          } else {
            // Bottom of inning - visiting team is pitching
            visitingPitcherName = pitcherName;
          }
        }
      }
    } catch (error) {
      // Log the error but continue with default pitcher names
      logger.warn(`Error getting pitcher information for game ${gameId}:`, error);
    }
    
    // Create the initial state
    const initialState = {
      ...createEmptyBaseballState(),
      gameId,
      sessionId,
      currentPlay,
      gameType: 'replay',
      game: {
        ...createEmptyBaseballState().game,
        inning: currentPlayData.inning,
        isTopInning: currentPlayData.top_bot === 0,
        outs: currentPlayData.outs_pre
      },
      home: {
        ...createEmptyBaseballState().home,
        id: homeTeamId,
        displayName: homeDisplayName,
        shortName: homeShortName,
        currentPitcher: homePitcherName  // Set default pitcher name
      },
      visitors: {
        ...createEmptyBaseballState().visitors,
        id: visitingTeamId,
        displayName: visitingDisplayName,
        shortName: visitingShortName,
        currentPitcher: visitingPitcherName  // Set default pitcher name
      }
    };
    
    // Validate the baseball state before returning it
    return validateExternalData(
      BaseballStateSchema,
      initialState,
      `initial baseball state for game ${gameId}`
    );
  }

  /**
   * Processes lineup state and updates the baseball state with player information
   *
   * This method retrieves the lineup state for the current play and updates the
   * baseball state with the latest player information, including:
   * - Current batters and pitchers for both teams
   * - Complete lineups with positions and batting orders
   * - Runners on base
   *
   * It handles the complexity of tracking player positions and roles throughout the game.
   *
   * @param gameId The game ID (e.g., "CIN201904150")
   * @param sessionId The session ID for tracking the current game session
   * @param currentPlay The current play index
   * @param currentState The current baseball state to be updated
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data with updated game situation
   * @returns An updated BaseballState object with the latest player information
   * @throws {ValidationError} If the updated state fails validation
   * @throws {LineupError} If there's an error processing lineup information
   *
   * @example
   * ```typescript
   * const updatedState = await BaseballStateService.processLineupState(
   *   "CIN201904150",
   *   "123e4567-e89b-12d3-a456-426614174000",
   *   42,
   *   currentState,
   *   currentPlayData,
   *   nextPlayData
   * );
   * ```
   */
  public async processLineupState(
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentState: BaseballState,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<BaseballState> {
    const lineupState = await getLineupStateForPlay(gameId, sessionId, currentPlay);
    
    if (!lineupState) {
      return currentState;
    }

    const playerIds = lineupState.players.map(p => p.playerId);
    const playerMap = await this.playerService.getPlayersByIds(playerIds);
    
    // Use LineupUtils to filter and process lineup players
    const homeTeamPlayers = LineupUtils.filterPlayersByTeam(lineupState.players, currentState.home.id);
    const visitingTeamPlayers = LineupUtils.filterPlayersByTeam(lineupState.players, currentState.visitors.id);
    
    // Use LineupUtils to process lineup players
    const homeLineup = LineupUtils.processLineupPlayers(
      lineupState.players,
      playerMap,
      currentState.home.id
    );
    
    const visitingLineup = LineupUtils.processLineupPlayers(
      lineupState.players,
      playerMap,
      currentState.visitors.id
    );
    
    const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
    const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
    const homeBatter = homeTeamPlayers.find(p => p.isCurrentBatter);
    const visitingBatter = visitingTeamPlayers.find(p => p.isCurrentBatter);
    
    // Fetch pitcher data if not found in lineup
    if (!homePitcher && currentPlayData.top_bot === 0 && currentPlayData.pitcher) {
      if (!playerMap.has(currentPlayData.pitcher)) {
        await this.playerService.getPlayerById(currentPlayData.pitcher);
      }
    }
    
    if (!visitingPitcher && currentPlayData.top_bot === 1 && currentPlayData.pitcher) {
      if (!playerMap.has(currentPlayData.pitcher)) {
        await this.playerService.getPlayerById(currentPlayData.pitcher);
      }
    }
    
    // Get updated player map after potential additions
    const updatedPlayerMap = await this.playerService.getPlayersByIds([
      ...(homePitcher ? [homePitcher.playerId] : []),
      ...(visitingPitcher ? [visitingPitcher.playerId] : []),
      ...(homeBatter ? [homeBatter.playerId] : []),
      ...(visitingBatter ? [visitingBatter.playerId] : []),
      ...(currentPlayData.pitcher ? [currentPlayData.pitcher] : []),
      ...(nextPlayData.br1_pre ? [nextPlayData.br1_pre] : []),
      ...(nextPlayData.br2_pre ? [nextPlayData.br2_pre] : []),
      ...(nextPlayData.br3_pre ? [nextPlayData.br3_pre] : [])
    ]);
    
    // Use LineupUtils to get current pitcher and batter names
    const homePitcherName = LineupUtils.getCurrentPitcherName(
      homeTeamPlayers,
      updatedPlayerMap,
      currentPlayData.top_bot === 0,
      currentPlayData.pitcher
    );
    
    const visitingPitcherName = LineupUtils.getCurrentPitcherName(
      visitingTeamPlayers,
      updatedPlayerMap,
      currentPlayData.top_bot === 1,
      currentPlayData.pitcher
    );
    
    const homeBatterName = LineupUtils.getCurrentBatterName(homeTeamPlayers, updatedPlayerMap);
    const visitingBatterName = LineupUtils.getCurrentBatterName(visitingTeamPlayers, updatedPlayerMap);

    // Use PlayerUtils to get runner names
    const runnerNames = PlayerUtils.getRunnerNames(
      updatedPlayerMap,
      nextPlayData.br1_pre,
      nextPlayData.br2_pre,
      nextPlayData.br3_pre
    );

    // Create the updated state
    const updatedState = {
      ...currentState,
      game: { // Update game state with runner names
          ...currentState.game,
          onFirst: runnerNames.onFirst,
          onSecond: runnerNames.onSecond,
          onThird: runnerNames.onThird
      },
      home: {
        ...currentState.home,
        lineup: homeLineup,
        currentPitcher: homePitcherName,
        currentBatter: homeBatterName
      },
      visitors: {
        ...currentState.visitors,
        lineup: visitingLineup,
        currentPitcher: visitingPitcherName,
        currentBatter: visitingBatterName
      }
    };
    
    // Validate the baseball state before returning it
    return validateExternalData(
      BaseballStateSchema,
      updatedState,
      `baseball state for game ${gameId}, play ${currentPlay}`
    );
  }

  // Static methods for backward compatibility during transition
  public static async createInitialBaseballState(
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentPlayData: PlayData
  ): Promise<BaseballState> {
    return BaseballStateService.getInstance().createInitialBaseballState(
      gameId, sessionId, currentPlay, currentPlayData
    );
  }

  public static async processLineupState(
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentState: BaseballState,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<BaseballState> {
    return BaseballStateService.getInstance().processLineupState(
      gameId, sessionId, currentPlay, currentState, currentPlayData, nextPlayData
    );
  }
}