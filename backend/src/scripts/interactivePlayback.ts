/**
 * Interactive Command Line Script for Baseball Game Playback
 * 
 * This script allows users to interactively step through a baseball game,
 * showing the game situation before each play and optionally sending
 * play-by-play prompts to the LLM.
 * 
 * Usage:
 *   npm run interactive-playback
 *   npm run interactive-playback -- --gid=NYA202410300
 *   npm run interactive-playback -- --gid=NYA202410300 --auto --limit=10
 */

import axios from 'axios';
import inquirer from 'inquirer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { v4 as uuidv4 } from 'uuid';
import { SimplifiedBaseballState } from '../../../common/types/SimplifiedBaseballState';
import { LineupData } from '../services/game/getLineupData';
import { generatePlayByPlayPrompt } from '../services/prompts/playByPlay';

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Command line arguments interface
interface CommandLineArgs {
  gid?: string;        // Game ID
  limit?: number;      // Maximum number of plays to process
  auto?: boolean;      // Auto-advance flag
}


/**
 * Parse command line arguments
 */
function parseCommandLineArgs(): CommandLineArgs {
  return yargs(hideBin(process.argv))
    .option('gid', {
      type: 'string',
      description: 'Game ID (gid) from the plays table'
    })
    .option('limit', {
      type: 'number',
      description: 'Maximum number of plays to process'
    })
    .option('auto', {
      type: 'boolean',
      description: 'Auto-advance through plays without user input',
      default: false
    })
    .help()
    .parse() as CommandLineArgs;
}

/**
 * Prompt the user for a game ID
 */
async function promptForGameId(): Promise<string> {
  const { gameId } = await inquirer.prompt([
    {
      type: 'input',
      name: 'gameId',
      message: 'Enter a game ID (gid):',
      validate: (input) => input.trim() !== '' || 'Game ID is required'
    }
  ]);
  return gameId;
}

/**
 * Prompt the user for the next action
 */
async function promptForNextAction(): Promise<string> {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { name: 'Read next play', value: 'next' },
        { name: 'Read next play with LLM commentary', value: 'next-llm' },
        { name: 'View current lineups', value: 'lineups' }
      ]
    }
  ]);
  return action;
}

/**
 * Initialize a game and get the first play
 */
async function initializeGame(gameId: string): Promise<SimplifiedBaseballState> {
  try {
    console.log(`Initializing game ${gameId}...`);
    const sessionId = await createGameSession(gameId);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/game/next/${gameId}?currentPlay=0`, {
        headers: {
          'session-id': sessionId
        }
      });
      console.log('Game initialized successfully');
      return response.data;
    } catch (error: any) {
      console.error('Error getting first play:', error.message);
      if (error.response) {
        console.error('API Error - Status:', error.response.status);
        console.error('API Error - Data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('API Error - No response received');
      } else {
        console.error('API Error - Request setup:', error.message);
      }
      throw new Error(`Failed to get first play: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error initializing game:', error.message);
    throw new Error(`Failed to initialize game: ${error.message}`);
  }
}

/**
 * Create a game session
 */
async function createGameSession(gameId: string): Promise<string> {
  try {
    console.log('\nCreating game session...');
    // Use hardcoded team IDs for testing purposes
    // In a real implementation, we would determine these from the game data
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
    console.error('Error creating game session:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    // Generate a fallback session ID if the API call fails
    const fallbackSessionId = uuidv4();
    console.log(`⚠️ Using fallback session ID: ${fallbackSessionId}`);
    return fallbackSessionId;
  }
}

/**
 * Get the next play in the game
 */
async function getNextPlay(gameId: string, currentPlay: number, useLLM: boolean, sessionId: string): Promise<SimplifiedBaseballState> {
  try {
    const skipLLM = !useLLM;
    const response = await axios.get(`${API_BASE_URL}/game/next/${gameId}?currentPlay=${currentPlay}&skipLLM=${skipLLM}`, {
      headers: {
        'session-id': sessionId
      }
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      throw new Error('END_OF_GAME');
    }
    console.error('Error getting next play:', error.message);
    if (error.response) {
      console.error('API Error - Status:', error.response.status);
      console.error('API Error - Data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('API Error - No response received');
    } else {
      console.error('API Error - Request setup:', error.message);
    }
    throw new Error(`Failed to get next play: ${error.message}`);
  }
}

/**
 * Get the lineup data for a game
 */
async function getLineups(gameId: string, sessionId: string): Promise<LineupData> {
  try {
    // Try to get lineup data from the game initialization endpoint
    const response = await axios.get(`${API_BASE_URL}/game/init/${gameId}`, {
      headers: {
        'session-id': sessionId
      }
    });
    
    const gameState = response.data;
    
    return {
      homeTeam: {
        id: gameState.home.id,
        displayName: gameState.home.displayName,
        shortName: gameState.home.shortName,
        currentPitcher: gameState.home.currentPitcher,
        lineup: gameState.home.lineup || []
      },
      visitingTeam: {
        id: gameState.visitors.id,
        displayName: gameState.visitors.displayName,
        shortName: gameState.visitors.shortName,
        currentPitcher: gameState.visitors.currentPitcher,
        lineup: gameState.visitors.lineup || []
      }
    };
  } catch (error: any) {
    console.error('Error getting lineup data:', error.message);
    if (error.response) {
      console.error('API Error - Status:', error.response.status);
      console.error('API Error - Data:', JSON.stringify(error.response.data));
    } else if (error.request) {
      console.error('API Error - No response received');
    } else {
      console.error('API Error - Request setup:', error.message);
    }
    throw new Error(`Failed to get lineup data: ${error.message}`);
  }
}

/**
 * Display the current game situation
 */
// Remove score parameter, use state directly
function displayGameSituation(state: SimplifiedBaseballState, homeTeamName: string, visitingTeamName: string): void {
  console.log('\n=== Game Situation ===');
  console.log(`Inning: ${state.game.inning} ${state.game.isTopInning ? 'Top' : 'Bottom'}`);
  // Use runs directly from the state object provided by the backend
  console.log(`Score: ${homeTeamName} ${state.home.runs}, ${visitingTeamName} ${state.visitors.runs}`);
  console.log(`Outs: ${state.game.outs}`);
  
  const battingTeam = state.game.isTopInning ? state.visitors : state.home;
  const pitchingTeam = state.game.isTopInning ? state.home : state.visitors;
  
  const battingTeamName = state.game.isTopInning ? visitingTeamName : homeTeamName;
  const pitchingTeamName = state.game.isTopInning ? homeTeamName : visitingTeamName;

  console.log(`At bat: ${battingTeam.currentBatter || 'Unknown'} (${battingTeamName})`);
  console.log(`Pitching: ${pitchingTeam.currentPitcher || 'Unknown'} (${pitchingTeamName})`);
  
  // Display runners on base
  const runners = [];
  if (state.game.onFirst) runners.push(`1B: ${state.game.onFirst}`);
  if (state.game.onSecond) runners.push(`2B: ${state.game.onSecond}`);
  if (state.game.onThird) runners.push(`3B: ${state.game.onThird}`);
  console.log(`Runners: ${runners.length > 0 ? runners.join(', ') : 'None'}`);
}

/**
 * Display the lineups for both teams
 */
function displayLineups(lineupData: LineupData): void {
  console.log('\n=== Home Team Lineup ===');
  console.log(`${lineupData.homeTeam.displayName} (${lineupData.homeTeam.shortName})`);
  lineupData.homeTeam.lineup.forEach((player, index) => {
    console.log(`${index + 1}. ${player.position} - ${player.firstName} ${player.lastName}`);
  });
  console.log(`Pitcher: ${lineupData.homeTeam.currentPitcher}`);
  
  console.log('\n=== Visiting Team Lineup ===');
  console.log(`${lineupData.visitingTeam.displayName} (${lineupData.visitingTeam.shortName})`);
  lineupData.visitingTeam.lineup.forEach((player, index) => {
    console.log(`${index + 1}. ${player.position} - ${player.firstName} ${player.lastName}`);
  });
  console.log(`Pitcher: ${lineupData.visitingTeam.currentPitcher}`);
}

/**
 * Display the play result
 */
function displayPlay(state: SimplifiedBaseballState): void {
  console.log('\n=== Play Result ===');
  console.log(`Play description: ${state.playDescription || 'N/A'}`);
  console.log(`Event code: ${state.eventString || 'N/A'}`);
  
  if (state.game.log && state.game.log.length > 0) {
    console.log('\n=== Play-by-Play Commentary ===');
    state.game.log.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry}`);
    });
  }
}

/**
 * Main function
 */
/**
 * Check if the API server is running
 */
async function checkApiServer(): Promise<boolean> {
  try {
    console.log('Checking if API server is running...');
    await axios.get(`${API_BASE_URL}/health`);
    console.log('API server is running');
    return true;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('API server is not running. Please start the server with "npm run dev" in another terminal.');
      return false;
    }
    
    // If we get any other error, the server might be running but the health endpoint doesn't exist
    console.log('API server appears to be running, but health check failed');
    return true;
  }
}

async function main() {
  try {
    // Parse command line arguments
    const args = parseCommandLineArgs();
    
    // Get game ID
    let gameId = args.gid;
    if (!gameId) {
      gameId = await promptForGameId();
    }
    
    console.log(`\n=== Interactive Baseball Game Playback ===`);
    console.log(`Game ID: ${gameId}`);
    console.log(`Max Plays: ${args.limit || 'No limit'}`);
    console.log(`Auto-advance: ${args.auto ? 'Yes' : 'No'}`);
    
    // Check if API server is running
    const isServerRunning = await checkApiServer();
    if (!isServerRunning) {
      return;
    }
    
    try {
      // Initialize game
      let state = await initializeGame(gameId);
      let currentPlay = state.currentPlay;
      let sessionId = state.sessionId;
      
      try {
        // Get and display lineups
        const lineupData = await getLineups(gameId, sessionId);
        console.log('\n=== Starting Lineups ===');
        displayLineups(lineupData);
        
        // Score is now part of the 'state' object from the backend
        
        // Process plays
        let playCount = 0;
        const maxPlays = args.limit || Infinity;
        
        while (playCount < maxPlays) {
          // Get user action or auto-advance
          let useLLM = false;
          if (!args.auto) {
            // Store team names for display
            const homeTeamName = state.home.displayName || 'Home';
            const visitingTeamName = state.visitors.displayName || 'Visitors';
            
            // Display current game situation before getting user action
            displayGameSituation(state, homeTeamName, visitingTeamName);
            
            const action = await promptForNextAction();
            if (action === 'lineups') {
              try {
                const currentLineups = await getLineups(gameId, sessionId);
                displayLineups(currentLineups);
              } catch (error: any) {
                console.error(`\nError displaying lineups: ${error.message}`);
              }
              continue; // Show options again
            }
            useLLM = action === 'next-llm';
          } else {
            // In auto mode, display game situation before advancing
            const homeTeamName = state.home.displayName || 'Home';
            const visitingTeamName = state.visitors.displayName || 'Visitors';
            displayGameSituation(state, homeTeamName, visitingTeamName);
          }
          
          // Get next play
          try {
            // Get the next play from the backend
            state = await getNextPlay(gameId, currentPlay, useLLM, sessionId);
            currentPlay = state.currentPlay;
            
            // Score is updated by the backend, no local update needed
            
            // Display play result
            displayPlay(state);
            
            playCount++;
          } catch (error: any) {
            if (error.message === 'END_OF_GAME') {
              console.log('\n=== End of Game ===');
              // Use runs directly from the final state
              console.log(`Final Score: ${state.home.displayName} ${state.home.runs}, ${state.visitors.displayName} ${state.visitors.runs}`);
              break;
            } else {
              console.error(`\nError processing play: ${error.message}`);
              if (args.auto) {
                console.log('Auto-advance mode is enabled, stopping playback due to error.');
                break;
              }
              
              // In interactive mode, ask if the user wants to try again or exit
              const { retry } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'retry',
                  message: 'Would you like to try the next play again?',
                  default: true
                }
              ]);
              
              if (!retry) {
                console.log('Exiting playback...');
                break;
              }
            }
          }
        }
        
        console.log('\nScript completed successfully!');
      } catch (error: any) {
        console.error(`\nError getting lineup data: ${error.message}`);
      }
    } catch (error: any) {
      console.error(`\nError initializing game: ${error.message}`);
    }
  } catch (error: any) {
    console.error(`\nFatal error: ${error.message}`);
  }
}

// Run the script
main();