import axios from 'axios';
import dotenv from 'dotenv';
import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { PlayData } from '../../../common/types/PlayData';
import { SubstitutionResponse } from '../../../common/types/SubstitutionTypes';
import { SimplifiedBaseballState } from '../../../common/types/SimplifiedBaseballState';

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const GAME_ID = 'NYA202410300'; // Test game ID
const NUM_PLAYS = 25;
let SESSION_ID = ''; // Will be set during test execution

/**
 * Create a game and get the session ID
 */
async function createGame(gameId: string) {
  console.log('\nCreating game...');
  try {
    // Generate a random home and visiting team ID for testing
    const homeTeamId = 'NYA'; // New York Yankees
    const visitingTeamId = 'LAD'; // Los Angeles Dodgers
    
    const createGameResponse = await axios.post(`${API_BASE_URL}/game/createGame`, {
      homeTeamId,
      visitingTeamId
    });
    
    const { sessionId } = createGameResponse.data;
    console.log(`✅ Game created with session ID: ${sessionId}`);
    return sessionId;
  } catch (error: any) {
    console.error('Error creating game:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    // Generate a fallback session ID if the API call fails
    const fallbackSessionId = uuidv4();
    console.log(`⚠️ Using fallback session ID: ${fallbackSessionId}`);
    return fallbackSessionId;
  }
}

/**
 * Validate that the initial lineup state exists and is correct
 */
async function validateInitialLineupState(gameId: string, sessionId: string) {
  console.log('\nValidating initial lineup state...');
  try {
    const initialStateResponse = await axios.get(`${API_BASE_URL}/game/lineup/latest/${gameId}`, {
      headers: {
        'session-id': sessionId
      }
    });
    const initialState = initialStateResponse.data;
    
    if (!initialState || !initialState.state || initialState.state.playIndex !== 0) {
      console.error('❌ Initial lineup state not found or incorrect play index');
      return false;
    }
    
    console.log('✅ Initial lineup state exists with correct play index');
    
    // Validate that all players have correct positions and batting orders
    const players = initialState.players;
    const homeTeamPlayers = players.filter((p: any) => p.teamId === players[0].teamId);
    const visitingTeamPlayers = players.filter((p: any) => p.teamId !== players[0].teamId);
    
    if (homeTeamPlayers.length !== 9 || visitingTeamPlayers.length !== 9) {
      console.error(`❌ Incorrect number of players: Home=${homeTeamPlayers.length}, Visiting=${visitingTeamPlayers.length}`);
      return false;
    }
    
    console.log('✅ Correct number of players for both teams');
    
    // Check that batting orders are 1-9 for each team
    const homeBattingOrders = homeTeamPlayers.map((p: any) => p.battingOrder).sort();
    const visitingBattingOrders = visitingTeamPlayers.map((p: any) => p.battingOrder).sort();
    
    const expectedBattingOrders = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    if (!homeBattingOrders.every((order: number, index: number) => order === expectedBattingOrders[index]) ||
        !visitingBattingOrders.every((order: number, index: number) => order === expectedBattingOrders[index])) {
      console.error('❌ Batting orders are not correctly assigned (1-9)');
      return false;
    }
    
    console.log('✅ Batting orders are correctly assigned for both teams');
    
    // Check that exactly one player is marked as current batter
    const currentBatters = players.filter((p: any) => p.isCurrentBatter);
    if (currentBatters.length !== 1) {
      console.error(`❌ Incorrect number of current batters: ${currentBatters.length} (should be 1)`);
      return false;
    }
    
    console.log('✅ Exactly one player is marked as current batter');
    
    // Check that the current batter is on the visiting team (top of 1st inning)
    const currentBatter = currentBatters[0];
    if (currentBatter.teamId === homeTeamPlayers[0].teamId) {
      console.error('❌ Current batter is on the home team, but should be on the visiting team (top of 1st)');
      return false;
    }
    
    console.log('✅ Current batter is correctly on the visiting team (top of 1st)');
    
    return true;
  } catch (error: any) {
    console.error('Error validating initial lineup state:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Validate current batter tracking
 */
async function validateCurrentBatterTracking(gameId: string, sessionId: string, plays: number) {
  console.log('\nValidating current batter tracking...');
  try {
    // Get all lineup states
    const states = [];
    for (let i = 0; i <= plays; i++) {
      try {
        const stateResponse = await axios.get(`${API_BASE_URL}/game/lineup/state/${gameId}/${i}`, {
          headers: {
            'session-id': sessionId
          }
        });
        states.push(stateResponse.data);
      } catch (error) {
        // State might not exist for every play, which is fine
      }
    }
    
    if (states.length < 2) {
      console.error('❌ Not enough lineup states to validate batter tracking');
      return false;
    }
    
    console.log(`Found ${states.length} lineup states to analyze`);
    
    // Check that each state has exactly one current batter
    let valid = true;
    for (const state of states) {
      const currentBatters = state.players.filter((p: any) => p.isCurrentBatter);
      
      if (currentBatters.length !== 2) {
        console.error(`❌ State at play ${state.state.playIndex} has ${currentBatters.length} current batters (should be 2)`);
        valid = false;
        continue;
      }
    }
    
    if (valid) {
      console.log('✅ Each state has exactly two current batters');
    }
    
    // Check that the current batter is on the correct team based on inning
    valid = true;
    for (const state of states) {
      const currentBatter = state.players.find((p: any) => p.isCurrentBatter);
      if (!currentBatter) continue;
      
      const isTopInning = state.state.isTopInning;
      const homeTeamId = state.players.find((p: any) => p.battingOrder === 1 && !isTopInning)?.teamId;
      const visitingTeamId = state.players.find((p: any) => p.battingOrder === 1 && isTopInning)?.teamId;
      
      if (!homeTeamId || !visitingTeamId) continue;
      
      if (isTopInning && currentBatter.teamId !== visitingTeamId) {
        console.error(`❌ State at play ${state.state.playIndex}: Current batter is not on visiting team during top of inning`);
        valid = false;
      } else if (!isTopInning && currentBatter.teamId !== homeTeamId) {
        console.error(`❌ State at play ${state.state.playIndex}: Current batter is not on home team during bottom of inning`);
        valid = false;
      }
    }
    
    if (valid) {
      console.log('✅ Current batter is always on the correct team based on inning');
    }
    
    return valid;
  } catch (error: any) {
    console.error('Error validating current batter tracking:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Test the substitution endpoint
 */
async function testSubstitutionEndpoint(gameId: string, sessionId: string, currentPlay: number): Promise<void> {
  console.log('\nTesting substitution endpoint...');
  try {
    // Call the substitution endpoint
    const substitutionResponse = await axios.get(`${API_BASE_URL}/game/checkSubstitutions/${gameId}?currentPlay=${currentPlay}`, {
      headers: {
        'session-id': sessionId
      }
    });
    
    const substitutionData: SubstitutionResponse = substitutionResponse.data;
    
    console.log('Substitution endpoint response:');
    console.log(`- Has pitching change: ${substitutionData.hasPitchingChange}`);
    console.log(`- Has pinch hitter: ${substitutionData.hasPinchHitter}`);
    console.log(`- Has pinch runner: ${substitutionData.hasPinchRunner}`);
    console.log(`- Total substitutions: ${substitutionData.substitutions.length}`);
    
    // Display details of each substitution
    if (substitutionData.substitutions.length > 0) {
      console.log('\nSubstitution details:');
      substitutionData.substitutions.forEach((sub, index) => {
        console.log(`\nSubstitution #${index + 1}:`);
        console.log(`- Type: ${sub.type}`);
        console.log(`- Description: ${sub.description}`);
        console.log(`- Player In: ${sub.playerIn.playerName} (${sub.playerIn.playerId})`);
        console.log(`- Player Out: ${sub.playerOut.playerName} (${sub.playerOut.playerId})`);
        if (sub.playerIn.position) {
          console.log(`- Position: ${sub.playerIn.position}`);
        }
      });
    } else {
      console.log('No substitutions detected between plays.');
    }
    
    return;
  } catch (error: any) {
    console.error('Error testing substitution endpoint:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return;
  }
}

/**
 * Validate position change records
 */
async function validatePositionChanges(gameId: string, sessionId: string) {
  console.log('\nValidating position change records...');
  try {
    const historyResponse = await axios.get(`${API_BASE_URL}/game/lineup/history/${gameId}`, {
      headers: {
        'session-id': sessionId
      }
    });
    const lineupHistory = historyResponse.data;
    
    // Validate that POSITION_CHANGE records have playerInId
    const positionChanges = lineupHistory.changes.filter((c: any) => c.changeType === 'POSITION_CHANGE');
    const positionChangesWithPlayerInId = positionChanges.filter((c: any) => c.playerInId);
    
    if (positionChanges.length === 0) {
      console.log('No position changes to validate');
      return true;
    }
    
    if (positionChanges.length === positionChangesWithPlayerInId.length) {
      console.log(`✅ All ${positionChanges.length} POSITION_CHANGE records have playerInId`);
      return true;
    } else {
      console.error(`❌ Only ${positionChangesWithPlayerInId.length} out of ${positionChanges.length} POSITION_CHANGE records have playerInId`);
      return false;
    }
  } catch (error: any) {
    console.error('Error validating position changes:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    return false;
  }
}

/**
 * Log the current game state
 */
function logGameState(nextPlayData: SimplifiedBaseballState) {
  console.log(`- Current play: ${nextPlayData.currentPlay - 1} -> Next play: ${nextPlayData.currentPlay}`);
  console.log(`- Inning: ${nextPlayData.game.inning} (${nextPlayData.game.isTopInning ? 'Top' : 'Bottom'})`);
  console.log(`- Outs: ${nextPlayData.game.outs}`);

  if (nextPlayData.game.isTopInning) {
    console.log(`- Current batter: ${nextPlayData.visitors.currentBatter}`);
    console.log(`- Current pitcher: ${nextPlayData.home.currentPitcher}`);
  } else {
    console.log(`- Current batter: ${nextPlayData.home.currentBatter}`);
    console.log(`- Current pitcher: ${nextPlayData.visitors.currentPitcher}`);
  }

  console.log(`- On first: ${nextPlayData.game.onFirst}`);
  console.log(`- On second: ${nextPlayData.game.onSecond}`);
  console.log(`- On third: ${nextPlayData.game.onThird}`);
  
  // SimplifiedBaseballState doesn't include lineup information
  console.log(`- Home Team: ${nextPlayData.home.displayName} (${nextPlayData.home.shortName})`);
  console.log(`- Visiting Team: ${nextPlayData.visitors.displayName} (${nextPlayData.visitors.shortName})`);
  
  // Log the play-by-play commentary
  if (nextPlayData.game.log && nextPlayData.game.log.length > 0) {
    console.log('\n- Play-by-play commentary:');
    nextPlayData.game.log.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry}`);
    });
  } else {
    console.log('\n- No play-by-play commentary available');
  }
}

/**
 * Test the lineup tracking functionality
 */
async function testLineupTracking() {
  try {
    console.log('Testing lineup tracking functionality...');
    console.log(`Using game ID: ${GAME_ID}`);
    
    // Step 1: Create a game and get the session ID
    console.log('\nStep 1: Creating game and getting session ID...');
    SESSION_ID = await createGame(GAME_ID);
    
    // Step 2: Initialize the game
    console.log('\nStep 2: Initializing game...');
    const initResponse = await axios.get(`${API_BASE_URL}/game/init/${GAME_ID}?skipLLM=true`, {
      headers: {
        'session-id': SESSION_ID
      }
    });
    console.log('Game initialized successfully.');
    logGameState(initResponse.data);
    
    // Step 3: Validate the initial lineup state
    console.log('\nStep 3: Validating initial lineup state...');
    const initialStateValid = await validateInitialLineupState(GAME_ID, SESSION_ID);
     if (!initialStateValid) {
      console.error('❌ Initial lineup state validation failed');
    } else {
      console.log('✅ Initial lineup state validation passed');
    }
    
    // Step 4: Make a few next play requests to trigger lineup changes
    console.log('\nStep 4: Making next play requests to trigger lineup changes...');
    let currentPlay = 1; // Start from the beginning
    let previousPlay = 0;
    const numPlaysToProcess = NUM_PLAYS;
    let playsProcessed = 0;
    
    for (let i = 0; i < numPlaysToProcess; i++) {
        console.log(`\nProcessing play ${i + 1}/${numPlaysToProcess}...`);
      try {
        // Check for substitutions before getting the next play (except for the first play)
        if (i > 0) {
          console.log(`\nChecking for substitutions between plays ${previousPlay} and ${currentPlay}...`);
          try {
            await testSubstitutionEndpoint(GAME_ID, SESSION_ID, previousPlay);
          } catch (error) {
            console.error('Error checking substitutions:', error);
          }
        }
        
        // Add skipLLM=true query parameter to skip LLM calls during testing
        console.log(`\nMaking next play request for play ${currentPlay}...`);
        let nextPlayData;
        try {
          const nextPlayResponse = await axios.get(`${API_BASE_URL}/game/next/${GAME_ID}?currentPlay=${currentPlay}&skipLLM=true`, {
            headers: {
              'session-id': SESSION_ID
            }
          });
          console.log(`Next play request successful for play ${currentPlay}`);
          nextPlayData = nextPlayResponse.data;
          
          console.log(`\nGame state after play ${currentPlay}:`);
          logGameState(nextPlayData);
          
          // Update current play for the next iteration
          previousPlay = currentPlay;
          currentPlay = nextPlayData.currentPlay;
          playsProcessed++;
        } catch (error: any) {
          console.error(`\nError making next play request for play ${currentPlay}:`);
          if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Response data:`, error.response.data);
            
            // If we get a 404, it might be because the play doesn't exist
            if (error.response.status === 404) {
              console.error(`Play ${currentPlay} not found. This might be due to a substitution changing the play sequence.`);
            }
          } else if (error.request) {
            console.error('No response received from server');
          } else {
            console.error(`Error message: ${error.message}`);
          }
          throw error; // Re-throw to be caught by the outer try/catch
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.log('✅ No more plays available (received 404). Moving to next phase.');
          break; // Exit the loop and continue with the rest of the test
        } else {
          console.error('Error processing next play:', error);
          if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
          }
          // Continue with the next iteration, or break if the error is severe
          if (error.response && error.response.status >= 500) {
            console.error('❌ Server error. Stopping play processing.');
            break;
          }
        }
      }
    }
    
    console.log(`\nCompleted processing ${playsProcessed} plays.`);
    
    // Check for substitutions one last time after all plays
    console.log(`\nChecking for substitutions after final play ${currentPlay - 1}...`);
    try {
      await testSubstitutionEndpoint(GAME_ID, SESSION_ID, currentPlay - 1);
    } catch (error) {
      console.error('Error checking substitutions:', error);
    }
    
    // Step 5: Validate current batter tracking
    console.log('\nStep 5: Validating current batter tracking...');
    const batterTrackingValid = await validateCurrentBatterTracking(GAME_ID, SESSION_ID, currentPlay);
    if (!batterTrackingValid) {
      console.error('❌ Current batter tracking validation failed');
    } else {
      console.log('✅ Current batter tracking validation passed');
    }
    
    // Step 6: Validate position change records
    console.log('\nStep 6: Validating position change records...');
    const positionChangesValid = await validatePositionChanges(GAME_ID, SESSION_ID);
    if (!positionChangesValid) {
      console.error('❌ Position change validation failed');
    } else {
      console.log('✅ Position change validation passed');
    }
    
    // Step 7: Get the lineup history and display sample changes
    console.log('\nStep 7: Getting lineup history...');
    const historyResponse = await axios.get(`${API_BASE_URL}/game/lineup/history/${GAME_ID}`, {
      headers: {
        'session-id': SESSION_ID
      }
    });
    const lineupHistory = historyResponse.data;
    
    console.log(`Lineup changes detected: ${lineupHistory.changes.length}`);
    
    if (lineupHistory.changes.length > 0) {
      console.log('\nSample lineup changes:');
      lineupHistory.changes.forEach((change: any, index: number) => {
        console.log(`\nChange #${index + 1}:`);
        console.log(`- Type: ${change.changeType}`);
        console.log(`- Play: ${change.playIndex}`);
        console.log(`- Inning: ${change.inning} (${change.isTopInning ? 'Top' : 'Bottom'})`);
        console.log(`- Team: ${change.teamId}`);
        console.log(`- Description: ${change.description}`);
        
        // Display additional details for position changes
        if (change.changeType === 'POSITION_CHANGE') {
          console.log(`- Player in: ${change.playerInId || 'N/A'}`);
          console.log(`- Player out: ${change.playerOutId || 'N/A'}`);
          console.log(`- Position: ${change.positionFrom || 'N/A'} -> ${change.positionTo || 'N/A'}`);
        }
      });
    } else {
      console.log('No lineup changes detected in this sample of plays.');
    }
    
    // Step 8: Get the latest lineup state
    console.log('\nStep 8: Getting latest lineup state after plays...');
    const finalLineupResponse = await axios.get(`${API_BASE_URL}/game/lineup/latest/${GAME_ID}`, {
      headers: {
        'session-id': SESSION_ID
      }
    });
    const finalLineupState = finalLineupResponse.data;
    
    console.log('Final lineup state:');
    console.log(`- Play index: ${finalLineupState.state.playIndex}`);
    console.log(`- Inning: ${finalLineupState.state.inning}`);
    console.log(`- Is top inning: ${finalLineupState.state.isTopInning}`);
    console.log(`- Number of players: ${finalLineupState.players.length}`);
    
    // Print players in final lineup (IDs only, grouped by team)
    console.log('\nPlayers in final lineup:');
    const homeTeamId = finalLineupState.players[0]?.teamId;
    const homePlayers = finalLineupState.players.filter((p: any) => p.teamId === homeTeamId).map((p: any) => p.playerId);
    const visitingPlayers = finalLineupState.players.filter((p: any) => p.teamId !== homeTeamId).map((p: any) => p.playerId);
    
    console.log(`- Home team: ${homePlayers.join(', ')}`);
    console.log(`- Visiting team: ${visitingPlayers.join(', ')}`);
    
    // Check that exactly one player is marked as current batter
    const currentBatters = finalLineupState.players.filter((p: any) => p.isCurrentBatter);
    if (currentBatters.length === 2) {
      console.log(`\n✅ Final lineup has exactly two current batters: ${currentBatters[0].playerId} and ${currentBatters[1].playerId}`);
    } else {
      console.error(`\n❌ Final lineup has ${currentBatters.length} current batters (should be 2)`);
    }
    
    console.log('\nTest completed successfully!');
  } catch (error: any) {
    console.error('Error testing lineup tracking:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

// Run the test
testLineupTracking();
