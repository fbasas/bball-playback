/**
 * Example script demonstrating how to use the play-by-play prompt generator
 * 
 * Run with: npx ts-node src/scripts/examplePlayByPlay.ts
 */

import { generatePlayByPlayPrompt } from '../services/prompts/playByPlay';
import { SimplifiedBaseballState } from '../../../common/types/SimplifiedBaseballState';
import { generateCompletion } from '../services/openai';

// Create a mock baseball state similar to what would be returned from the next play endpoint
const mockState: SimplifiedBaseballState = {
  gameId: 'test-game-123',
  sessionId: 'test-session-456',
  game: {
    inning: 3,
    isTopInning: true,
    outs: 1,
    log: [],
    onFirst: 'John Smith',
    onSecond: '',
    onThird: 'Mike Johnson'
  },
  home: {
    id: 'BOS',
    displayName: 'Boston Red Sox',
    shortName: 'Red Sox',
    currentBatter: null,
    currentPitcher: 'Chris Sale',
    nextBatter: null,
    nextPitcher: null,
    runs: 2
  },
  visitors: {
    id: 'NYY',
    displayName: 'New York Yankees',
    shortName: 'Yankees',
    currentBatter: 'Aaron Judge',
    currentPitcher: null,
    nextBatter: null,
    nextPitcher: null,
    runs: 3
  },
  currentPlay: 42,
  playDescription: 'Double to right field',
  eventString: 'D9/L9L.3-H;1-3'
};

// Array of announcer styles to demonstrate
const announcerStyles = ['classic', 'modern', 'enthusiastic', 'poetic'] as const;

/**
 * Main function to run the example
 */
async function runExample() {
  console.log('Play-by-Play Prompt Generator Example\n');
  console.log('Game Situation:');
  console.log(`- Inning: ${mockState.game.inning}, ${mockState.game.isTopInning ? 'Top' : 'Bottom'} half`);
  console.log(`- Outs: ${mockState.game.outs}`);
  console.log(`- Runners: ${mockState.game.onFirst ? `Runner on first (${mockState.game.onFirst})` : ''}${mockState.game.onThird ? `, Runner on third (${mockState.game.onThird})` : ''}`);
  console.log(`- Score: ${mockState.home.displayName} 2, ${mockState.visitors.displayName} 1`);
  console.log(`- At bat: ${mockState.visitors.currentBatter} (${mockState.visitors.displayName})`);
  console.log(`- Pitching: ${mockState.home.currentPitcher} (${mockState.home.displayName})`);
  console.log(`- Play: ${mockState.playDescription}`);
  console.log(`- Event code: ${mockState.eventString}`);
  console.log('\n');

  // Generate prompts for each announcer style
  for (const style of announcerStyles) {
    console.log(`\n=== ${style.toUpperCase()} ANNOUNCER STYLE ===\n`);
    
    // Generate the prompt
    const prompt = await generatePlayByPlayPrompt(mockState, style);
    
    // Print the prompt (for demonstration purposes)
    console.log('Generated Prompt:');
    console.log('----------------');
    console.log(prompt);
    console.log('----------------\n');

    // Uncomment the following code to actually call the OpenAI API
    // This is commented out to avoid making actual API calls during the example
    /*
    try {
      console.log('Generating play-by-play commentary...');
      const playByPlay = await generateCompletion(prompt, { gameId: mockState.gameId, announcerStyle });
      console.log('\nGenerated Play-by-Play:');
      console.log('------------------------');
      console.log(playByPlay);
      console.log('------------------------\n');
    } catch (error) {
      console.error('Error generating play-by-play:', error);
    }
    */
  }
}

// Run the example
runExample()
  .then(() => console.log('Example completed successfully'))
  .catch(error => console.error('Error running example:', error));