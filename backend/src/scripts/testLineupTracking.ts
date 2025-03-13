import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';
const GAME_ID = 'NYA202410300'; // Test game ID

/**
 * Test the lineup tracking functionality
 */
async function testLineupTracking() {
  try {
    console.log('Testing lineup tracking functionality...');
    console.log(`Using game ID: ${GAME_ID}`);
    
    // Step 1: Initialize the game
    console.log('\nStep 1: Initializing game...');
    const initResponse = await axios.get(`${API_BASE_URL}/game/init/${GAME_ID}`);
    console.log('Game initialized successfully.');
    
    // Step 2: Get the initial lineup state
    console.log('\nStep 2: Getting initial lineup state...');
    let latestLineupState;
    try {
      const latestLineupResponse = await axios.get(`${API_BASE_URL}/game/lineup/latest/${GAME_ID}`);
      latestLineupState = latestLineupResponse.data;
      console.log('Initial lineup state retrieved successfully:');
      console.log(`- Play index: ${latestLineupState.state.playIndex}`);
      console.log(`- Inning: ${latestLineupState.state.inning}`);
      console.log(`- Is top inning: ${latestLineupState.state.isTopInning}`);
      console.log(`- Number of players: ${latestLineupState.players.length}`);
      
      // Print the first few players
      console.log('\nSample players:');
      latestLineupState.players.slice(0, 5).forEach((player: any) => {
        console.log(`- ${player.teamId} #${player.battingOrder}: ${player.playerId} (${player.position})`);
      });
    } catch (error: any) {
      console.log('No initial lineup state found. This is expected if this is the first run.');
    }
    
    // Step 3: Make a few next play requests to trigger lineup changes
    console.log('\nStep 3: Making next play requests to trigger lineup changes...');
    let currentPlay = 0; // Start from the beginning
    const numPlaysToProcess = 20; // Process 20 plays
    
    for (let i = 0; i < numPlaysToProcess; i++) {
      console.log(`\nProcessing play ${i + 1}/${numPlaysToProcess}...`);
      // Add skipLLM=true query parameter to skip LLM calls during testing
      const nextPlayResponse = await axios.get(`${API_BASE_URL}/game/next/${GAME_ID}?currentPlay=${currentPlay}&skipLLM=true`);
      const nextPlayData = nextPlayResponse.data;
      
      console.log(`- Current play: ${currentPlay} -> Next play: ${nextPlayData.currentPlay}`);
      console.log(`- Inning: ${nextPlayData.game.inning} (${nextPlayData.game.isTopInning ? 'Top' : 'Bottom'})`);
      console.log(`- Outs: ${nextPlayData.game.outs}`);
      
      // Update current play for the next iteration
      currentPlay = nextPlayData.currentPlay;
    }
    
    // Step 4: Get the lineup history and verify that changes were tracked
    console.log('\nStep 4: Getting lineup history...');
    const historyResponse = await axios.get(`${API_BASE_URL}/game/lineup/history/${GAME_ID}`);
    const lineupHistory = historyResponse.data;
    
    console.log(`Lineup changes detected: ${lineupHistory.changes.length}`);
    
    if (lineupHistory.changes.length > 0) {
      console.log('\nSample lineup changes:');
      lineupHistory.changes.slice(0, 5).forEach((change: any, index: number) => {
        console.log(`\nChange #${index + 1}:`);
        console.log(`- Type: ${change.changeType}`);
        console.log(`- Play: ${change.playIndex}`);
        console.log(`- Inning: ${change.inning} (${change.isTopInning ? 'Top' : 'Bottom'})`);
        console.log(`- Team: ${change.teamId}`);
        console.log(`- Description: ${change.description}`);
      });
    } else {
      console.log('No lineup changes detected in this sample of plays.');
    }
    
    // Step 5: Get the latest lineup state
    console.log('\nStep 5: Getting latest lineup state after plays...');
    const finalLineupResponse = await axios.get(`${API_BASE_URL}/game/lineup/latest/${GAME_ID}`);
    const finalLineupState = finalLineupResponse.data;
    
    console.log('Final lineup state:');
    console.log(`- Play index: ${finalLineupState.state.playIndex}`);
    console.log(`- Inning: ${finalLineupState.state.inning}`);
    console.log(`- Is top inning: ${finalLineupState.state.isTopInning}`);
    console.log(`- Number of players: ${finalLineupState.players.length}`);
    
    // Print the first few players
    console.log('\nSample players in final lineup:');
    finalLineupState.players.slice(0, 5).forEach((player: any) => {
      console.log(`- ${player.teamId} #${player.battingOrder}: ${player.playerId} (${player.position})`);
    });
    
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
