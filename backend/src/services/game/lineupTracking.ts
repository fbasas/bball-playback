import { db } from '../../config/database';
import { Player } from '../../../../common/types/BaseballTypes';

/**
 * Interface for lineup state data
 */
export interface LineupStateData {
  gameId: string;
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
  // Use a transaction to ensure all related data is saved together
  return db.transaction(async (trx) => {
    try {
      // Insert the lineup state
      const [lineupStateId] = await trx('lineup_states').insert({
        game_id: stateData.gameId,
        play_index: stateData.playIndex,
        inning: stateData.inning,
        is_top_inning: stateData.isTopInning,
        outs: stateData.outs
      });
      
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
 * @returns The most recent lineup state with players and changes
 */
export async function getLatestLineupState(gameId: string) {
  try {
    // Get the most recent lineup state for the game
    const lineupState = await db('lineup_states')
      .where({ game_id: gameId })
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      return null;
    }
    
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
 * @param playIndex The play index
 * @returns The lineup state with players and changes
 */
export async function getLineupStateForPlay(gameId: string, playIndex: number) {
  try {
    // Get the lineup state for the play
    const lineupState = await db('lineup_states')
      .where({ game_id: gameId })
      .where('play_index', '<=', playIndex)
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      return null;
    }
    
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
 * @returns Array of all lineup changes for the game
 */
export async function getAllLineupChanges(gameId: string) {
  try {
    // Get all lineup states for the game
    const lineupStates = await db('lineup_states')
      .where({ game_id: gameId })
      .orderBy('play_index', 'asc');
    
    if (lineupStates.length === 0) {
      return [];
    }
    
    // Get all lineup changes for these states
    const lineupStateIds = lineupStates.map(state => state.id);
    const changes = await db('lineup_changes')
      .whereIn('lineup_state_id', lineupStateIds)
      .orderBy('id', 'asc');
    
    // Join with lineup states to get the context
    const result = [];
    for (const change of changes) {
      const state = lineupStates.find(s => s.id === change.lineup_state_id);
      result.push({
        id: change.id,
        gameId: state.game_id,
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
 * @param homeTeam Home team data
 * @param visitingTeam Visiting team data
 * @returns The ID of the newly created lineup state
 */
export async function saveInitialLineup(
  gameId: string,
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
    // Create lineup state data
    const stateData: LineupStateData = {
      gameId,
      playIndex: 0, // Initial lineup is at play index 0
      inning: 1,
      isTopInning: true,
      outs: 0
    };
    
    // Create player data for both teams
    const players: LineupPlayerData[] = [];
    
    // Add home team players
    homeTeam.lineup.forEach((player, index) => {
      players.push({
        teamId: homeTeam.id,
        playerId: `${player.firstName.substring(0, 1)}${player.lastName}`.toLowerCase(), // Simple player ID generation
        battingOrder: index + 1,
        position: player.position,
        isCurrentBatter: false,
        isCurrentPitcher: player.position === 'P' || `${player.firstName} ${player.lastName}` === homeTeam.currentPitcher
      });
    });
    
    // Add visiting team players
    visitingTeam.lineup.forEach((player, index) => {
      players.push({
        teamId: visitingTeam.id,
        playerId: `${player.firstName.substring(0, 1)}${player.lastName}`.toLowerCase(), // Simple player ID generation
        battingOrder: index + 1,
        position: player.position,
        isCurrentBatter: index === 0, // First batter in the lineup is the current batter
        isCurrentPitcher: player.position === 'P' || `${player.firstName} ${player.lastName}` === visitingTeam.currentPitcher
      });
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
 * @param currentPlay The current play data
 * @param nextPlay The next play data
 * @returns The ID of the newly created lineup state if changes were detected, null otherwise
 */
export async function detectAndSaveLineupChanges(
  gameId: string,
  currentPlay: any,
  nextPlay: any
) {
  try {
    // Get the latest lineup state
    const latestState = await getLatestLineupState(gameId);
    
    if (!latestState) {
      // If no lineup state exists, we need to initialize the lineup
      // This requires getting the starting lineup from teamstats
      const teamstats = await db('teamstats')
        .where({ gid: gameId })
        .select('team', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6', 'start_l7', 'start_l8', 'start_l9', 'start_f1');
      
      if (!teamstats || teamstats.length != 2) {
        throw new Error(`Team stats not found for game ID: ${gameId}`);
      }
      
      // Since we have two entries in teamstats, we need to determine which is home and which is away
      // We'll assume the first entry is for the home team and the second for the visiting team
      // This is a simplification - in a real system, you might want to verify this with additional data
      const homeTeamData = teamstats[0];
      const visitingTeamData = teamstats[1];
      
      // Get player names from allplayers table
      const playerIds = [
        homeTeamData.start_l1, homeTeamData.start_l2, homeTeamData.start_l3,
        homeTeamData.start_l4, homeTeamData.start_l5, homeTeamData.start_l6,
        homeTeamData.start_l7, homeTeamData.start_l8, homeTeamData.start_l9,
        homeTeamData.start_f1, // Home pitcher
        visitingTeamData.start_l1, visitingTeamData.start_l2, visitingTeamData.start_l3,
        visitingTeamData.start_l4, visitingTeamData.start_l5, visitingTeamData.start_l6,
        visitingTeamData.start_l7, visitingTeamData.start_l8, visitingTeamData.start_l9,
        visitingTeamData.start_f1 // Visiting pitcher
      ].filter(Boolean); // Remove any null/undefined values
      
      const players = await db('allplayers')
        .whereIn('id', playerIds)
        .select('id', 'first', 'last');
      
      // Create player lookup map
      const playerMap = new Map();
      players.forEach(player => {
        playerMap.set(player.id, {
          firstName: player.first || '',
          lastName: player.last || ''
        });
      });
      
      // Create home team lineup
      const homeLineup: Player[] = [];
      for (let i = 1; i <= 9; i++) {
        const playerId = homeTeamData[`start_l${i}`];
        if (playerId && playerMap.has(playerId)) {
          const player = playerMap.get(playerId);
          homeLineup.push({
            position: i === 1 ? 'P' : `${i}`, // Simplified position assignment
            firstName: player.firstName,
            lastName: player.lastName
          });
        }
      }
      
      // Create visiting team lineup
      const visitingLineup: Player[] = [];
      for (let i = 1; i <= 9; i++) {
        const playerId = visitingTeamData[`start_l${i}`];
        if (playerId && playerMap.has(playerId)) {
          const player = playerMap.get(playerId);
          visitingLineup.push({
            position: i === 1 ? 'P' : `${i}`, // Simplified position assignment
            firstName: player.firstName,
            lastName: player.lastName
          });
        }
      }
      
      // Get pitcher names
      const homePitcherId = homeTeamData.start_f1;
      const visitingPitcherId = visitingTeamData.start_f1;
      
      const homePitcher = homePitcherId && playerMap.has(homePitcherId) 
        ? `${playerMap.get(homePitcherId).firstName} ${playerMap.get(homePitcherId).lastName}`.trim()
        : '';
      
      const visitingPitcher = visitingPitcherId && playerMap.has(visitingPitcherId)
        ? `${playerMap.get(visitingPitcherId).firstName} ${playerMap.get(visitingPitcherId).lastName}`.trim()
        : '';
      
      // Log the play data to see what properties are available
      console.log('Current Play Data:', Object.keys(currentPlay));
      
      // Use the team values from the teamstats table instead of trying to get them from the play data
      // This ensures we're using the correct team IDs
      return await saveInitialLineup(
        gameId,
        {
          id: homeTeamData.team,
          lineup: homeLineup,
          currentPitcher: homePitcher
        },
        {
          id: visitingTeamData.team,
          lineup: visitingLineup,
          currentPitcher: visitingPitcher
        }
      );
    }
    
    // We have an existing lineup state, so now we need to detect changes
    const changes: LineupChangeData[] = [];
    
    // 1. Check for pitching changes
    if (currentPlay.pit_id !== nextPlay.pit_id) {
      // Pitcher changed, get the new pitcher's name
      const newPitcher = await db('allplayers')
        .where({ id: nextPlay.pit_id })
        .first();
      
      if (newPitcher) {
        const pitcherName = `${newPitcher.first || ''} ${newPitcher.last || ''}`.trim();
        const teamId = nextPlay.bat_home_id === '1' ? nextPlay.away_team_id : nextPlay.home_team_id;
        
        changes.push({
          changeType: 'PITCHING_CHANGE',
          playerInId: nextPlay.pit_id,
          playerOutId: currentPlay.pit_id,
          teamId,
          description: `Pitching change: ${pitcherName} replaces ${currentPlay.pit_id}`
        });
      }
    }
    
    // 2. Check for batter changes (lineup substitutions)
    // Get the expected next batter based on the current lineup
    const isTopInning = nextPlay.bat_home_id === '0'; // 0 = visitor (top), 1 = home (bottom)
    const battingTeamId = isTopInning ? nextPlay.away_team_id : nextPlay.home_team_id;
    
    // Get the current batting order for the team at bat
    const currentBattingOrder = latestState.players
      .filter(p => p.teamId === battingTeamId)
      .sort((a, b) => a.battingOrder - b.battingOrder);
    
    // Find the current batter in the lineup
    const currentBatterIndex = currentBattingOrder.findIndex(p => p.isCurrentBatter);
    
    // Calculate the expected next batter index (circular, wrapping back to 0 after 8)
    const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
    const expectedNextBatter = currentBattingOrder[expectedNextBatterIndex];
    
    // Check if the actual next batter is different from the expected next batter
    if (expectedNextBatter && nextPlay.bat_id !== expectedNextBatter.playerId) {
      // Get the new batter's name
      const newBatter = await db('allplayers')
        .where({ id: nextPlay.bat_id })
        .first();
      
      if (newBatter) {
        const batterName = `${newBatter.first || ''} ${newBatter.last || ''}`.trim();
        
        changes.push({
          changeType: 'SUBSTITUTION',
          playerInId: nextPlay.bat_id,
          playerOutId: expectedNextBatter.playerId,
          battingOrderFrom: expectedNextBatter.battingOrder,
          battingOrderTo: expectedNextBatter.battingOrder,
          teamId: battingTeamId,
          description: `Batting substitution: ${batterName} replaces ${expectedNextBatter.playerId} in the lineup`
        });
      }
    }
    
    // 3. Check for fielding changes (f1-f9 columns)
    // Compare fielding positions between current and next play
    for (let i = 1; i <= 9; i++) {
      const currentFielderId = currentPlay[`f${i}`];
      const nextFielderId = nextPlay[`f${i}`];
      
      if (currentFielderId && nextFielderId && currentFielderId !== nextFielderId) {
        // Fielding position changed
        const newFielder = await db('allplayers')
          .where({ id: nextFielderId })
          .first();
        
        if (newFielder) {
          const fielderName = `${newFielder.first || ''} ${newFielder.last || ''}`.trim();
          const teamId = i === 1 
            ? (nextPlay.bat_home_id === '1' ? nextPlay.away_team_id : nextPlay.home_team_id) // Pitcher's team
            : (nextPlay.bat_home_id === '1' ? nextPlay.home_team_id : nextPlay.away_team_id); // Fielding team
          
          changes.push({
            changeType: 'POSITION_CHANGE',
          battingOrderTo: expectedNextBatter.battingOrder,
            playerOutId: currentFielderId,
            positionFrom: `${i}`,
            positionTo: `${i}`,
            teamId,
            description: `Fielding change: ${fielderName} replaces ${currentFielderId} at position ${i}`
          });
        }
      }
    }
    
    // If there are changes, save a new lineup state
    if (changes.length > 0) {
      // Create a new lineup state based on the latest state but with the changes applied
      const newPlayers = [...latestState.players];
      
      // Apply the changes to the player list
      changes.forEach(change => {
        if (change.changeType === 'PITCHING_CHANGE') {
          // Update the pitcher
          const pitcherIndex = newPlayers.findIndex(p => 
            p.teamId === change.teamId && p.isCurrentPitcher);
          
          if (pitcherIndex >= 0) {
            newPlayers[pitcherIndex] = {
              ...newPlayers[pitcherIndex],
              playerId: change.playerInId || '',
              isCurrentPitcher: true
            };
          }
        } else if (change.changeType === 'SUBSTITUTION') {
          // Update the batter in the lineup
          const batterIndex = newPlayers.findIndex(p => 
            p.teamId === change.teamId && 
            p.battingOrder === change.battingOrderFrom);
          
          if (batterIndex >= 0) {
            newPlayers[batterIndex] = {
              ...newPlayers[batterIndex],
              playerId: change.playerInId || '',
              isCurrentBatter: true
            };
            
            // Clear current batter flag for other players on this team
            newPlayers.forEach((p, i) => {
              if (i !== batterIndex && p.teamId === change.teamId) {
                newPlayers[i] = {
                  ...p,
                  isCurrentBatter: false
                };
              }
            });
          }
        } else if (change.changeType === 'POSITION_CHANGE') {
          // Update the fielder
          const fielderIndex = newPlayers.findIndex(p => 
            p.teamId === change.teamId && 
            p.position === change.positionFrom);
          
          if (fielderIndex >= 0) {
            newPlayers[fielderIndex] = {
              ...newPlayers[fielderIndex],
              playerId: change.playerInId || ''
            };
          }
        }
      });
      
      // Create the state data
      const stateData: LineupStateData = {
        gameId,
        playIndex: nextPlay.pn,
        inning: nextPlay.inn_ct || 1,
        isTopInning: nextPlay.bat_home_id === '0',
        outs: nextPlay.outs_ct || 0
      };
      
      return await saveLineupState(stateData, newPlayers, changes);
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting and saving lineup changes:', error);
    throw error;
  }
}
