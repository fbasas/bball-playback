import { db } from '../../config/database';
import { Player } from '../../../../common/types/BaseballTypes';

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
    
    // Add home team players
    homeTeam.lineup.forEach((player, index) => {
      // Use the player's retrosheet_id
      if (!player.retrosheet_id) {
        throw new Error(`Retrosheet ID is required for home team player at position ${index + 1}`);
      }
      
      players.push({
        teamId: homeTeam.id,
        playerId: player.retrosheet_id,
        battingOrder: index + 1,
        position: player.position,
        isCurrentBatter: false,
        isCurrentPitcher: player.position === 'P' || `${player.firstName} ${player.lastName}` === homeTeam.currentPitcher
      });
    });
    
    // Add visiting team players
    visitingTeam.lineup.forEach((player, index) => {
      // Use the player's retrosheet_id
      if (!player.retrosheet_id) {
        throw new Error(`Retrosheet ID is required for visiting team player at position ${index + 1}`);
      }
      
      players.push({
        teamId: visitingTeam.id,
        playerId: player.retrosheet_id,
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
 * Interface for play data from the database
 */
export interface PlayData {
  gid: string;
  pn: number;
  inning: number;
  top_bot: number;
  batteam: string;
  pitteam: string;
  batter: string;
  pitcher: string;
  outs_pre: number;
  f2?: string;
  f3?: string;
  f4?: string;
  f5?: string;
  f6?: string;
  f7?: string;
  f8?: string;
  f9?: string;
  // Add other fields as needed
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
    console.log(`[LINEUP] Detecting lineup changes between plays ${currentPlay.pn} and ${nextPlay.pn}`);
    console.log(`[LINEUP] Current play: Inning ${currentPlay.inning} (${currentPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${currentPlay.outs_pre}`);
    console.log(`[LINEUP] Next play: Inning ${nextPlay.inning} (${nextPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${nextPlay.outs_pre}`);
    console.log(`[LINEUP] Current batter: ${currentPlay.batter}, Next batter: ${nextPlay.batter}`);
    console.log(`[LINEUP] Current pitcher: ${currentPlay.pitcher}, Next pitcher: ${nextPlay.pitcher}`);
    // Get the latest lineup state
    const latestState = await getLatestLineupState(gameId, sessionId);
    
    // Check if there's a half-inning change
    const isHalfInningChange = 
      currentPlay.batteam !== nextPlay.batteam;
      
    console.log(`[LINEUP] Half-inning change detected: ${isHalfInningChange}`);
    
    if (!latestState) {
      console.log(`[LINEUP] No previous lineup state found, initializing lineup`);
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
            lastName: player.lastName,
            retrosheet_id: playerId
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
            lastName: player.lastName,
            retrosheet_id: playerId
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
        sessionId,
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
    if (currentPlay.pitcher !== nextPlay.pitcher) {
      console.log(`[LINEUP] Pitcher change detected: ${currentPlay.pitcher} -> ${nextPlay.pitcher}`);
      // Only record as a pitching change if it's not just due to a half-inning change
      // (when teams switch between batting and fielding)
      if (!isHalfInningChange) {
        // Pitcher changed, get the new pitcher's name
        const newPitcher = await db('allplayers')
          .where({ id: nextPlay.pitcher })
          .first();
        
        if (newPitcher) {
          const pitcherName = `${newPitcher.first || ''} ${newPitcher.last || ''}`.trim();
          // If top_bot is 0 (top of inning), home team is pitching (pitteam)
          // If top_bot is 1 (bottom of inning), visiting team is pitching (batteam)
          const teamId = nextPlay.top_bot === 0 ? nextPlay.pitteam : nextPlay.batteam;
          
          changes.push({
            changeType: 'PITCHING_CHANGE',
            playerInId: String(nextPlay.pitcher),
            playerOutId: String(currentPlay.pitcher),
            teamId: String(teamId), // Ensure teamId is a string
            description: `Pitching change: ${pitcherName} replaces ${currentPlay.pitcher}`
          });
          
          console.log(`[LINEUP] Recorded pitching change: ${pitcherName} (${nextPlay.pitcher}) replaces ${currentPlay.pitcher}`);
        }
      }
    }
    
    // 2. Check for batter changes (lineup substitutions)
    // Get the expected next batter based on the current lineup
    const isTopInning = nextPlay.top_bot === 0; // 0 = visitor (top), 1 = home (bottom)
    const battingTeamId = nextPlay.batteam;
    
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
    if (expectedNextBatter && nextPlay.batter !== expectedNextBatter.playerId) {
      console.log(`[LINEUP] Batter substitution detected: Expected ${expectedNextBatter.playerId}, Actual ${nextPlay.batter}`);
      // Get the new batter's name
      const newBatter = await db('allplayers')
        .where({ id: nextPlay.batter })
        .first();
      
      if (newBatter) {
        const batterName = `${newBatter.first || ''} ${newBatter.last || ''}`.trim();

        const oldBatter = await db('allplayers')
          .where({ id: expectedNextBatter.playerId })
          .first();

        const oldBatterName = `${oldBatter.first || ''} ${oldBatter.last || ''}`.trim();
        
        changes.push({
          changeType: 'SUBSTITUTION',
          playerInId: String(nextPlay.batter),
          playerOutId: expectedNextBatter.playerId,
          battingOrderFrom: expectedNextBatter.battingOrder,
          battingOrderTo: expectedNextBatter.battingOrder,
          teamId: String(battingTeamId),
          description: `Batting substitution: ${batterName} replaces ${oldBatterName} in the lineup`
        });
        
        console.log(`[LINEUP] Recorded batting substitution: ${batterName} (${nextPlay.batter}) replaces ${expectedNextBatter.playerId} at batting order position ${expectedNextBatter.battingOrder}`);
      }
    }
    
    // 3. Check for fielding changes (f2-f9 columns)
    // Compare fielding positions between current and next play
    // Only check for fielding changes if it's not a half-inning change
    if (!isHalfInningChange) {
      // Start from 2 since f1 doesn't exist in the schema (pitcher is tracked separately)
      for (let i = 2; i <= 9; i++) {
        const fieldKey = `f${i}` as keyof PlayData;
        const currentFielderId = currentPlay[fieldKey];
        const nextFielderId = nextPlay[fieldKey];
        
        if (currentFielderId && nextFielderId && currentFielderId !== nextFielderId) {
          console.log(`[LINEUP] Fielding change detected at position ${i}: ${currentFielderId} -> ${nextFielderId}`);
          // Fielding position changed
          const newFielder = await db('allplayers')
            .where({ id: nextFielderId })
            .first();
          
          if (newFielder) {
            const fielderName = `${newFielder.first || ''} ${newFielder.last || ''}`.trim();
            // Determine team ID based on top/bottom of inning
            // If top_bot is 0 (top of inning), home team is fielding (pitteam)
            // If top_bot is 1 (bottom of inning), visiting team is fielding (batteam)
            const fieldingTeamId = nextPlay.top_bot === 0 ? nextPlay.pitteam : nextPlay.batteam;
            
            changes.push({
              changeType: 'POSITION_CHANGE',
              playerInId: String(nextFielderId), // Convert to string
              playerOutId: String(currentFielderId), // Convert to string
              positionFrom: `${i}`,
              positionTo: `${i}`,
              teamId: String(fieldingTeamId), // Convert to string
              description: `Fielding change: ${fielderName} replaces ${currentFielderId} at position ${i}`
            });
            
            console.log(`[LINEUP] Recorded fielding change: ${fielderName} (${nextFielderId}) replaces ${currentFielderId} at position ${i}`);
          }
        }
      }
    }
    
    // If there are changes, save a new lineup state
    if (changes.length > 0) {
      console.log(`[LINEUP] ${changes.length} lineup changes detected, saving new lineup state`);
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
        sessionId,
        playIndex: nextPlay.pn,
        inning: nextPlay.inning || 1,
        isTopInning: nextPlay.top_bot === 0,
        outs: nextPlay.outs_pre || 0
      };
      
      return await saveLineupState(stateData, newPlayers, changes);
    }
    
    // If no changes were detected but we have a valid state, we still need to update the current batter
    if (changes.length === 0 && latestState) {
      console.log(`[LINEUP] No lineup changes detected, updating current batter only`);
      const isTopInning = nextPlay.top_bot === 0;
      const battingTeamId = nextPlay.batteam;
      const fieldingTeamId = nextPlay.pitteam;
      
      // Check if there's a half-inning change
      const isHalfInningChange = currentPlay.batteam !== nextPlay.batteam;
      console.log(`[LINEUP] Half-inning change detected: ${isHalfInningChange}`);
      
      // Get the current batting order for the team at bat
      const currentBattingOrder = latestState.players
        .filter(p => p.teamId === battingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder);
      
      // Create a new lineup state with the updated current batter
      const newPlayers = [...latestState.players];
      
      if (isHalfInningChange) {
        // This is a half-inning change, so we need to handle both teams
        console.log(`[LINEUP] Handling half-inning change from ${currentPlay.batteam} to ${nextPlay.batteam}`);
        
        // Get the current batting order for the team that was batting
        const previousBattingTeam = currentPlay.batteam;
        const previousBattingOrder = latestState.players
          .filter(p => p.teamId === previousBattingTeam)
          .sort((a, b) => a.battingOrder - b.battingOrder);
        
        // Find their current batter and calculate next batter for next inning
        const currentBatterIndex = previousBattingOrder.findIndex(p => p.isCurrentBatter);
        const nextBatterIndex = (currentBatterIndex + 1) % 9;
        
        // Update both teams' current batters
        newPlayers.forEach((player, index) => {
          if (player.teamId === previousBattingTeam) {
            // For the team that just finished batting, mark their next batter
            newPlayers[index] = {
              ...player,
              isCurrentBatter: player.playerId === previousBattingOrder[nextBatterIndex]?.playerId
            };
          } else if (player.teamId === battingTeamId) {
            // For the team that's starting to bat, find their current batter
            const battingOrder = currentBattingOrder.find(p => p.playerId === player.playerId)?.battingOrder;
            // Set as current batter if it's the first in the order
            newPlayers[index] = {
              ...player,
              isCurrentBatter: battingOrder === 1
            };
          }
        });
        
        console.log(`[LINEUP] Updated current batters for half-inning change`);
        console.log(`[LINEUP] Previous batting team (${previousBattingTeam}) next batter: ${previousBattingOrder[nextBatterIndex]?.playerId}`);
        console.log(`[LINEUP] New batting team (${battingTeamId}) starting with first batter in order`);
      } else {
        // Not a half-inning change, just update the current batter for the batting team
        // Find the current batter in the lineup
        const currentBatterIndex = currentBattingOrder.findIndex(p => p.isCurrentBatter);
        
        // Calculate the next batter index (circular, wrapping back to 0 after 8)
        const nextBatterIndex = (currentBatterIndex + 1) % 9;
        
        // Only update if the current batter is found and there's a next batter
        if (currentBatterIndex !== -1 && currentBattingOrder[nextBatterIndex]) {
          console.log(`[LINEUP] Updating current batter from ${currentBattingOrder[currentBatterIndex].playerId} to ${currentBattingOrder[nextBatterIndex].playerId}`);
          
          // Update current batter flags for the batting team only
          newPlayers.forEach((player, index) => {
            if (player.teamId === battingTeamId) {
              // Set isCurrentBatter to true only for the next batter
              newPlayers[index] = {
                ...player,
                isCurrentBatter: player.playerId === currentBattingOrder[nextBatterIndex].playerId
              };
            }
          });
        }
      }
        
      // Create the state data
      const stateData: LineupStateData = {
        gameId,
        sessionId,
        playIndex: nextPlay.pn,
        inning: nextPlay.inning || 1,
        isTopInning: nextPlay.top_bot === 0,
        outs: nextPlay.outs_pre || 0
      };
      
      // Save the new state without any changes (just updating the current batter)
      return await saveLineupState(stateData, newPlayers, []);
    }
    
    console.log(`[LINEUP] No lineup state changes needed for this play`);
    return null;
  } catch (error) {
    console.error('Error detecting and saving lineup changes:', error);
    throw error;
  }
}
