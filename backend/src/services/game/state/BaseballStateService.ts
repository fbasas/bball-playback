import { BaseballState, createEmptyBaseballState } from '../../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../../common/types/PlayData';
import { PlayerService } from '../player/PlayerService';
import { getLineupStateForPlay } from '../lineupTracking';
import { db } from '../../../config/database';

/**
 * Service for handling baseball state operations
 */
export class BaseballStateService {
  /**
   * Creates an initial baseball state from play data
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @returns A BaseballState object
   */
  public static async createInitialBaseballState(
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentPlayData: PlayData
  ): Promise<BaseballState> {
    // Determine home and visiting team IDs
    const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;
    const visitingTeamId = currentPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam;
    
    // Get team information from the database
    const homeTeam = await db('teams').where({ team: homeTeamId }).first();
    const visitingTeam = await db('teams').where({ team: visitingTeamId }).first();
    
    // Create display names from city and nickname
    const homeDisplayName = homeTeam ? `${homeTeam.city || ''} ${homeTeam.nickname || ''}`.trim() : 'Home Team';
    const homeShortName = homeTeam ? homeTeam.nickname || 'Home' : 'Home';
    const visitingDisplayName = visitingTeam ? `${visitingTeam.city || ''} ${visitingTeam.nickname || ''}`.trim() : 'Visiting Team';
    const visitingShortName = visitingTeam ? visitingTeam.nickname || 'Visitors' : 'Visitors';
    
    return {
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
        shortName: homeShortName
      },
      visitors: {
        ...createEmptyBaseballState().visitors,
        id: visitingTeamId,
        displayName: visitingDisplayName,
        shortName: visitingShortName
      }
    };
  }

  /**
   * Processes lineup state and updates the baseball state with player information
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param currentPlay The current play index
   * @param currentState The current baseball state
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns An updated BaseballState object
   */
  public static async processLineupState(
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
    const playerMap = await PlayerService.getPlayersByIds(playerIds);
    
    const homeTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.home.id);
    const visitingTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.visitors.id);
    
    const homeLineup = homeTeamPlayers
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
    
    const visitingLineup = visitingTeamPlayers
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
    
    const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
    const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
    const homeBatter = homeTeamPlayers.find(p => p.isCurrentBatter);
    const visitingBatter = visitingTeamPlayers.find(p => p.isCurrentBatter);
    
    // Fetch pitcher data if not found in lineup
    if (!homePitcher && currentPlayData.top_bot === 0 && currentPlayData.pitcher) {
      if (!playerMap.has(currentPlayData.pitcher)) {
        await PlayerService.getPlayerById(currentPlayData.pitcher);
      }
    }
    
    if (!visitingPitcher && currentPlayData.top_bot === 1 && currentPlayData.pitcher) {
      if (!playerMap.has(currentPlayData.pitcher)) {
        await PlayerService.getPlayerById(currentPlayData.pitcher);
      }
    }
    
    // Get updated player map after potential additions
    const updatedPlayerMap = await PlayerService.getPlayersByIds([
      ...(homePitcher ? [homePitcher.playerId] : []),
      ...(visitingPitcher ? [visitingPitcher.playerId] : []),
      ...(homeBatter ? [homeBatter.playerId] : []),
      ...(visitingBatter ? [visitingBatter.playerId] : []),
      ...(currentPlayData.pitcher ? [currentPlayData.pitcher] : []),
      ...(nextPlayData.br1_pre ? [nextPlayData.br1_pre] : []),
      ...(nextPlayData.br2_pre ? [nextPlayData.br2_pre] : []),
      ...(nextPlayData.br3_pre ? [nextPlayData.br3_pre] : [])
    ]);
    
    // Calculate the current pitcher and batter values
    const homePitcherName = homePitcher
      ? updatedPlayerMap.get(homePitcher.playerId)?.fullName || ''
      : (currentPlayData.top_bot === 0 ? updatedPlayerMap.get(currentPlayData.pitcher)?.fullName || '' : '');
    
    const visitingPitcherName = visitingPitcher
      ? updatedPlayerMap.get(visitingPitcher.playerId)?.fullName || ''
      : (currentPlayData.top_bot === 1 ? updatedPlayerMap.get(currentPlayData.pitcher)?.fullName || '' : '');
    
    const homeBatterName = homeBatter
      ? updatedPlayerMap.get(homeBatter.playerId)?.fullName || ''
      : '';
    
    const visitingBatterName = visitingBatter
      ? updatedPlayerMap.get(visitingBatter.playerId)?.fullName || ''
      : '';

    // Get runner names
    const runner1Name = nextPlayData.br1_pre ? updatedPlayerMap.get(nextPlayData.br1_pre)?.fullName || '' : '';
    const runner2Name = nextPlayData.br2_pre ? updatedPlayerMap.get(nextPlayData.br2_pre)?.fullName || '' : '';
    const runner3Name = nextPlayData.br3_pre ? updatedPlayerMap.get(nextPlayData.br3_pre)?.fullName || '' : '';

    return {
      ...currentState,
      game: { // Update game state with runner names
          ...currentState.game,
          onFirst: runner1Name,
          onSecond: runner2Name,
          onThird: runner3Name
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
  }
}