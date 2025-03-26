import { db } from '../../config/database';
import { Player } from '../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../common/types/PlayData';
import { LineupChangeDetector } from './LineupChangeDetector';

/**
 * Interface for lineup state data
 */
export interface LineupStateData {
  gameId: string;
  sessionId: string;
  playIndex: number;
  inning: number;
  isTopInning: boolean;
  outs: number;
}

/**
 * Interface for lineup player data
 */
export interface LineupPlayerData {
  teamId: string;
  playerId: string;
  battingOrder: number;
  position: string;
  isCurrentBatter: boolean;
  isCurrentPitcher: boolean;
}

/**
 * Interface for lineup change data
 */
export interface LineupChangeData {
  changeType: 'SUBSTITUTION' | 'POSITION_CHANGE' | 'BATTING_ORDER_CHANGE' | 'PITCHING_CHANGE' | 'INITIAL_LINEUP' | 'OTHER';
  playerInId?: string;
  playerOutId?: string;
  positionFrom?: string;
  positionTo?: string;
  battingOrderFrom?: number;
  battingOrderTo?: number;
  teamId: string;
  description: string;
}

/**
 * Save a new lineup state with players and changes
 * @param stateData The lineup state data
 * @param players Array of player data for the lineup
 * @param changes Array of lineup changes
 * @returns The ID of the newly created lineup state
 */
export async function saveLineupState(
  stateData: LineupStateData,
  players: LineupPlayerData[],
  changes: LineupChangeData[] = []
): Promise<number> {
  console.log(`[LINEUP] Saving lineup state for game ${stateData.gameId}, play ${stateData.playIndex}, inning ${stateData.inning} (${stateData.isTopInning ? 'Top' : 'Bottom'}), outs ${stateData.outs}`);
  console.log(`[LINEUP] Players in lineup: ${players.length}, Changes: ${changes.length}`);
  
  // Use a transaction to ensure all related data is saved together
  return db.transaction(async (trx) => {
    try {
      // Insert the lineup state
      const [lineupStateId] = await trx('lineup_states').insert({
        game_id: stateData.gameId,
        session_id: stateData.sessionId,
        play_index: stateData.playIndex,
        inning: stateData.inning,
        is_top_inning: stateData.isTopInning,
        outs: stateData.outs
      });
      
      console.log(`[LINEUP] Created lineup state with ID: ${lineupStateId}`);
      
      // Insert the lineup players
      const playerInserts = players.map(player => ({
        lineup_state_id: lineupStateId,
        team_id: player.teamId,
        player_id: player.playerId,
        batting_order: player.battingOrder,
        position: player.position,
        is_current_batter: player.isCurrentBatter,
        is_current_pitcher: player.isCurrentPitcher
      }));
      
      await trx('lineup_players').insert(playerInserts);
      
      // Insert any lineup changes
      if (changes.length > 0) {
        const changeInserts = changes.map(change => ({
          lineup_state_id: lineupStateId,
          change_type: change.changeType,
          player_in_id: change.playerInId,
          player_out_id: change.playerOutId,
          position_from: change.positionFrom,
          position_to: change.positionTo,
          batting_order_from: change.battingOrderFrom,
          batting_order_to: change.battingOrderTo,
          team_id: change.teamId,
          description: change.description
        }));
        
        await trx('lineup_changes').insert(changeInserts);
        
        // Log each change for debugging
        changes.forEach(change => {
          console.log(`[LINEUP] Change detected: ${change.changeType} - ${change.description}`);
          if (change.playerInId) console.log(`[LINEUP] Player in: ${change.playerInId}`);
          if (change.playerOutId) console.log(`[LINEUP] Player out: ${change.playerOutId}`);
          if (change.positionFrom || change.positionTo) console.log(`[LINEUP] Position: ${change.positionFrom || 'N/A'} -> ${change.positionTo || 'N/A'}`);
          if (change.battingOrderFrom || change.battingOrderTo) console.log(`[LINEUP] Batting order: ${change.battingOrderFrom || 'N/A'} -> ${change.battingOrderTo || 'N/A'}`);
        });
      }
      
      return lineupStateId;
    } catch (error) {
      console.error('Error saving lineup state:', error);
      throw error;
    }
  });
}

/**
 * Get the most recent lineup state for a game
 * @param gameId The game ID
 * @param sessionId The session ID
 * @returns The most recent lineup state with players and changes
 */
export async function getLatestLineupState(gameId: string, sessionId: string) {
  try {
    console.log(`[LINEUP] Getting latest lineup state for game ${gameId}`);
    
    // Get the most recent lineup state for the game and session
    const lineupState = await db('lineup_states')
      .where({ 
        game_id: gameId,
        session_id: sessionId
      })
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      console.log(`[LINEUP] No lineup state found for game ${gameId}`);
      return null;
    }
    
    console.log(`[LINEUP] Found latest lineup state ID ${lineupState.id} for play ${lineupState.play_index}`);
    
    // Get the players for this lineup state
    const players = await db('lineup_players')
      .where({ lineup_state_id: lineupState.id });
    
    // Get the changes for this lineup state
    const changes = await db('lineup_changes')
      .where({ lineup_state_id: lineupState.id });
    
    return {
      state: {
        id: lineupState.id,
        gameId: lineupState.game_id,
        sessionId: lineupState.session_id,
        playIndex: lineupState.play_index,
        inning: lineupState.inning,
        isTopInning: lineupState.is_top_inning,
        outs: lineupState.outs,
        timestamp: lineupState.timestamp
      },
      players: players.map(player => ({
        teamId: player.team_id,
        playerId: player.player_id,
        battingOrder: player.batting_order,
        position: player.position,
        isCurrentBatter: player.is_current_batter,
        isCurrentPitcher: player.is_current_pitcher
      })),
      changes: changes.map(change => ({
        changeType: change.change_type,
        playerInId: change.player_in_id,
        playerOutId: change.player_out_id,
        positionFrom: change.position_from,
        positionTo: change.position_to,
        battingOrderFrom: change.batting_order_from,
        battingOrderTo: change.batting_order_to,
        teamId: change.team_id,
        description: change.description
      }))
    };
  } catch (error) {
    console.error('Error getting latest lineup state:', error);
    throw error;
  }
}

/**
 * Get the lineup state for a specific play in a game
 * @param gameId The game ID
 * @param sessionId The session ID
 * @param playIndex The play index
 * @returns The lineup state with players and changes
 */
export async function getLineupStateForPlay(gameId: string, sessionId: string, playIndex: number) {
  try {
    console.log(`[LINEUP] Getting lineup state for game ${gameId}, play ${playIndex}`);
    
    // Get the lineup state for the play
    const lineupState = await db('lineup_states')
      .where({ 
        game_id: gameId,
        session_id: sessionId
      })
      .where('play_index', '<=', playIndex)
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      console.log(`[LINEUP] No lineup state found for game ${gameId}, play ${playIndex}`);
      return null;
    }
    
    console.log(`[LINEUP] Found lineup state ID ${lineupState.id} for play ${playIndex} (actual play index: ${lineupState.play_index})`);
    
    // Get the players for this lineup state
    const players = await db('lineup_players')
      .where({ lineup_state_id: lineupState.id });
    
    // Get the changes for this lineup state
    const changes = await db('lineup_changes')
      .where({ lineup_state_id: lineupState.id });
    
    return {
      state: {
        id: lineupState.id,
        gameId: lineupState.game_id,
        sessionId: lineupState.session_id,
        playIndex: lineupState.play_index,
        inning: lineupState.inning,
        isTopInning: lineupState.is_top_inning,
        outs: lineupState.outs,
        timestamp: lineupState.timestamp
      },
      players: players.map(player => ({
        teamId: player.team_id,
        playerId: player.player_id,
        battingOrder: player.batting_order,
        position: player.position,
        isCurrentBatter: player.is_current_batter,
        isCurrentPitcher: player.is_current_pitcher
      })),
      changes: changes.map(change => ({
        changeType: change.change_type,
        playerInId: change.player_in_id,
        playerOutId: change.player_out_id,
        positionFrom: change.position_from,
        positionTo: change.position_to,
        battingOrderFrom: change.batting_order_from,
        battingOrderTo: change.batting_order_to,
        teamId: change.team_id,
        description: change.description
      }))
    };
  } catch (error) {
    console.error('Error getting lineup state for play:', error);
    throw error;
  }
}

/**
 * Get all lineup changes for a game
 * @param gameId The game ID
 * @param sessionId The session ID
 * @returns Array of all lineup changes for the game
 */
export async function getAllLineupChanges(gameId: string, sessionId: string) {
  try {
    console.log(`[LINEUP] Getting all lineup changes for game ${gameId}`);
    
    // Get all lineup states for the game and session
    const lineupStates = await db('lineup_states')
      .where({ 
        game_id: gameId,
        session_id: sessionId
      })
      .orderBy('play_index', 'asc');
    
    if (lineupStates.length === 0) {
      console.log(`[LINEUP] No lineup states found for game ${gameId}`);
      return [];
    }
    
    console.log(`[LINEUP] Found ${lineupStates.length} lineup states for game ${gameId}`);
    
    // Get all lineup changes for these states
    const lineupStateIds = lineupStates.map(state => state.id);
    const changes = await db('lineup_changes')
      .whereIn('lineup_state_id', lineupStateIds)
      .orderBy('id', 'asc');
      
    console.log(`[LINEUP] Found ${changes.length} lineup changes across all states for game ${gameId}`);
    
    // Join with lineup states to get the context
    const result = [];
    for (const change of changes) {
      const state = lineupStates.find(s => s.id === change.lineup_state_id);
      result.push({
        id: change.id,
        gameId: state.game_id,
        sessionId: state.session_id,
        playIndex: state.play_index,
        inning: state.inning,
        isTopInning: state.is_top_inning,
        outs: state.outs,
        timestamp: state.timestamp,
        changeType: change.change_type,
        playerInId: change.player_in_id,
        playerOutId: change.player_out_id,
        positionFrom: change.position_from,
        positionTo: change.position_to,
        battingOrderFrom: change.batting_order_from,
        battingOrderTo: change.batting_order_to,
        teamId: change.team_id,
        description: change.description
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error getting all lineup changes:', error);
    throw error;
  }
}

/**
 * Save the initial lineup for a game
 * @param gameId The game ID
 * @param sessionId The session ID
 * @param homeTeam Home team data
 * @param visitingTeam Visiting team data
 * @returns The ID of the newly created lineup state
 */
export async function saveInitialLineup(
  gameId: string,
  sessionId: string,
  homeTeam: {
    id: string;
    lineup: Player[];
    currentPitcher: string;
  },
  visitingTeam: {
    id: string;
    lineup: Player[];
    currentPitcher: string;
  }
) {
  try {
    console.log(`[LINEUP] Saving initial lineup for game ${gameId}`);
    console.log(`[LINEUP] Home team: ${homeTeam.id}, Players: ${homeTeam.lineup.length}, Current pitcher: ${homeTeam.currentPitcher}`);
    console.log(`[LINEUP] Visiting team: ${visitingTeam.id}, Players: ${visitingTeam.lineup.length}, Current pitcher: ${visitingTeam.currentPitcher}`);
    // Create lineup state data
    const stateData: LineupStateData = {
      gameId,
      sessionId,
      playIndex: 0, // Initial lineup is at play index 0
      inning: 1,
      isTopInning: true,
      outs: 0
    };
    
    // Create player data for both teams
    const players: LineupPlayerData[] = [];
    
    // Get the first play to determine the initial state
    const firstPlay = await db('plays')
      .where({ gid: gameId })
      .orderBy('pn', 'asc')
      .first();
    
    if (!firstPlay) {
      throw new Error(`No plays found for game ${gameId}`);
    }
    
    // Determine which team is batting and which is pitching in the first play
    const initialBattingTeamId = firstPlay.batteam;
    const initialPitchingTeamId = firstPlay.pitteam;
    
    console.log(`[LINEUP] Initial batting team: ${initialBattingTeamId}, Initial pitching team: ${initialPitchingTeamId}`);
    console.log(`[LINEUP] Initial batter: ${firstPlay.batter}, Initial pitcher: ${firstPlay.pitcher}`);
    
    // Add home team players
    homeTeam.lineup.forEach((player, index) => {
      // Use the player's retrosheet_id
      if (!player.retrosheet_id) {
        throw new Error(`Retrosheet ID is required for home team player at position ${index + 1}`);
      }
      
      const isCurrentBatter = homeTeam.id === initialBattingTeamId && player.retrosheet_id === firstPlay.batter;
      const isCurrentPitcher = homeTeam.id === initialPitchingTeamId && player.retrosheet_id === firstPlay.pitcher;
      
      players.push({
        teamId: homeTeam.id,
        playerId: player.retrosheet_id,
        battingOrder: index + 1,
        position: player.position,
        isCurrentBatter: isCurrentBatter,
        isCurrentPitcher: isCurrentPitcher
      });
      
      if (isCurrentBatter) {
        console.log(`[LINEUP] Set ${player.retrosheet_id} (${player.firstName} ${player.lastName}) as current batter for home team`);
      }
      
      if (isCurrentPitcher) {
        console.log(`[LINEUP] Set ${player.retrosheet_id} (${player.firstName} ${player.lastName}) as current pitcher for home team`);
      }
    });
    
    // Add visiting team players
    visitingTeam.lineup.forEach((player, index) => {
      // Use the player's retrosheet_id
      if (!player.retrosheet_id) {
        throw new Error(`Retrosheet ID is required for visiting team player at position ${index + 1}`);
      }
      
      const isCurrentBatter = visitingTeam.id === initialBattingTeamId && player.retrosheet_id === firstPlay.batter;
      const isCurrentPitcher = visitingTeam.id === initialPitchingTeamId && player.retrosheet_id === firstPlay.pitcher;
      
      players.push({
        teamId: visitingTeam.id,
        playerId: player.retrosheet_id,
        battingOrder: index + 1,
        position: player.position,
        isCurrentBatter: isCurrentBatter,
        isCurrentPitcher: isCurrentPitcher
      });
      
      if (isCurrentBatter) {
        console.log(`[LINEUP] Set ${player.retrosheet_id} (${player.firstName} ${player.lastName}) as current batter for visiting team`);
      }
      
      if (isCurrentPitcher) {
        console.log(`[LINEUP] Set ${player.retrosheet_id} (${player.firstName} ${player.lastName}) as current pitcher for visiting team`);
      }
    });
    
    // Create initial lineup change
    const changes: LineupChangeData[] = [
      {
        changeType: 'INITIAL_LINEUP',
        teamId: homeTeam.id,
        description: `Initial lineup for ${homeTeam.id}`
      },
      {
        changeType: 'INITIAL_LINEUP',
        teamId: visitingTeam.id,
        description: `Initial lineup for ${visitingTeam.id}`
      }
    ];
    
    // Save the lineup state
    return await saveLineupState(stateData, players, changes);
  } catch (error) {
    console.error('Error saving initial lineup:', error);
    throw error;
  }
}


/**
 * Detect and save lineup changes between plays using play-by-play data
 * @param gameId The game ID
 * @param sessionId The session ID
 * @param currentPlay The current play data
 * @param nextPlay The next play data
 * @returns The ID of the newly created lineup state if changes were detected, null otherwise
 */
export async function detectAndSaveLineupChanges(
  gameId: string,
  sessionId: string,
  currentPlay: PlayData,
  nextPlay: PlayData
) {
  try {
    const detector = new LineupChangeDetector(gameId, sessionId, currentPlay, nextPlay);
    return await detector.process();
  } catch (error) {
    console.error('Error detecting and saving lineup changes:', error);
    throw error;
  }
}
