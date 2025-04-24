# Implementation Plan: Transition to Detailed Play-by-Play Prompt

This document outlines the implementation steps required to transition from the current play-by-play prompt generation to the more detailed announcer-specific approach.

## Overview

The current implementation uses a basic prompt template in `nextPlay.ts` that provides minimal context to OpenAI. We want to transition to the more detailed prompt approach in `playByPlay.ts` that includes announcer profiles, more game context, and specific instructions for generating authentic commentary.

## Implementation Steps

### 1. Update the OpenAI Service (backend/src/services/openai.ts)

#### Changes Required:
- Modify the `generateCompletion` function to accept an announcer style parameter
- Update the system message to be dynamic based on the announcer style

#### Implementation:

```typescript
// Add to the top of the file
interface CompletionOptions {
  gameId?: string;
  announcerStyle?: 'classic' | 'modern' | 'enthusiastic' | 'poetic';
  retryCount?: number;
}

// Helper function to get the system message
function getSystemMessageForAnnouncer(announcerStyle: string = 'poetic'): string {
  const announcers = {
    'classic': 'Bob Costas',
    'modern': 'Joe Buck',
    'enthusiastic': 'Harry Caray',
    'poetic': 'Vin Scully'
  };
  
  const announcer = announcers[announcerStyle] || 'Vin Scully';
  return `You are a baseball announcer describing plays in the style of ${announcer}.`;
}

// Update the generateCompletion function signature
export async function generateCompletion(
  prompt: string, 
  options: CompletionOptions = {}
): Promise<string> {
  const { 
    gameId = "-1", 
    announcerStyle = 'poetic',
    retryCount = 0 
  } = options;
  
  // ... existing code ...
  
  // Update the chat completions call
  if (config.openai.model.startsWith('gpt-4') || config.openai.model.startsWith('gpt-3.5-turbo')) {
    response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: getSystemMessageForAnnouncer(announcerStyle)
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature,
    });
    
    // ... rest of the function remains the same ...
  }
}
```

### 2. Create a Detailed Play Completion Function (backend/src/routes/game/nextPlay.ts)

#### Changes Required:
- Create a new function `generateDetailedPlayCompletion` that uses the detailed prompt
- Update the `getNextPlay` handler to use this function

#### Implementation:

```typescript
// Add import for the detailed prompt generator
import { generatePlayByPlayPrompt } from '../../services/prompts/playByPlay';
import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';

// Add the new function
const generateDetailedPlayCompletion = async (
  currentState: BaseballState,
  nextPlay: PlayData,
  currentPlay: number,
  skipLLM: boolean,
  gameId: string,
  announcerStyle: string = 'classic' // Default announcer style
): Promise<string[]> => {
  // Create a simplified baseball state from the current state
  const simplifiedState: SimplifiedBaseballState = {
    gameId: currentState.gameId,
    sessionId: currentState.sessionId,
    game: {
      inning: currentState.game.inning,
      isTopInning: currentState.game.isTopInning,
      outs: currentState.game.outs,
      log: currentState.game.log || [],
      onFirst: currentState.game.onFirst || '',
      onSecond: currentState.game.onSecond || '',
      onThird: currentState.game.onThird || ''
    },
    home: {
      id: currentState.home.id,
      displayName: currentState.home.displayName,
      shortName: currentState.home.shortName,
      currentBatter: currentState.home.currentBatter,
      currentPitcher: currentState.home.currentPitcher,
      nextBatter: currentState.home.nextBatter,
      nextPitcher: currentState.home.nextPitcher,
      runs: currentState.home.runs || 0
    },
    visitors: {
      id: currentState.visitors.id,
      displayName: currentState.visitors.displayName,
      shortName: currentState.visitors.shortName,
      currentBatter: currentState.visitors.currentBatter,
      currentPitcher: currentState.visitors.currentPitcher,
      nextBatter: currentState.visitors.nextBatter,
      nextPitcher: currentState.visitors.nextPitcher,
      runs: currentState.visitors.runs || 0
    },
    currentPlay: currentPlay,
    playDescription: translateEvent(nextPlay.event || ''),
    eventString: nextPlay.event
  };
  
  // Generate the detailed prompt
  const prompt = generatePlayByPlayPrompt(simplifiedState, announcerStyle);
  
  const completionText = skipLLM
    ? "This is a dummy response for testing purposes. LLM calls are being skipped."
    : await generateCompletion(prompt, { gameId, announcerStyle });
  
  return completionText
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => line.trim());
};
```

### 3. Update the getNextPlay Handler (backend/src/routes/game/nextPlay.ts)

#### Changes Required:
- Add a parameter for announcer style
- Update the call to generate play completion

#### Implementation:

```typescript
export const getNextPlay: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  const currentPlay = parseInt(req.query.currentPlay as string);
  const skipLLM = req.query.skipLLM === 'true';
  const announcerStyle = req.query.announcerStyle as string || 'classic'; // Add this line
  
  // ... existing code ...
  
  // Replace this line:
  // const logEntries = await generatePlayCompletion(currentState, nextPlayData, currentPlay, skipLLM, gameId);
  
  // With this:
  const logEntries = await generateDetailedPlayCompletion(
    currentState, 
    nextPlayData, 
    currentPlay, 
    skipLLM, 
    gameId,
    announcerStyle
  );
  
  // ... rest of the function remains the same ...
};
```

### 4. Update API Documentation (backend/src/routes/API.md)

#### Changes Required:
- Add documentation for the new announcer style parameter

#### Implementation:

```markdown
## Game Routes

### GET /api/game/next/:gameId
Get the next play in a game sequence.

#### Parameters
- `gameId` (path): Game ID
- `currentPlay` (query): Current play index
- `skipLLM` (query, optional): Skip LLM generation (for testing). Default: false
- `announcerStyle` (query, optional): Announcer style to use for commentary. Options: 'classic', 'modern', 'enthusiastic', 'poetic'. Default: 'classic'

#### Response
Returns a SimplifiedBaseballState object with the next play information.
```

### 5. Update Frontend to Support Announcer Style Selection (frontend/src/components/BaseballGame.tsx)

#### Changes Required:
- Add state for announcer style
- Add UI for selecting announcer style
- Update API call to include announcer style

#### Implementation:

```typescript
// Add state for announcer style
const [announcerStyle, setAnnouncerStyle] = useState('classic');

// Add UI for selecting announcer style (in the render function)
<div className="announcer-style-selector">
  <label htmlFor="announcer-style">Announcer Style:</label>
  <select 
    id="announcer-style" 
    value={announcerStyle} 
    onChange={(e) => setAnnouncerStyle(e.target.value)}
  >
    <option value="classic">Classic (Bob Costas)</option>
    <option value="modern">Modern (Joe Buck)</option>
    <option value="enthusiastic">Enthusiastic (Harry Caray)</option>
    <option value="poetic">Poetic (Vin Scully)</option>
  </select>
</div>

// Update the API call to include announcer style
const fetchNextPlay = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(
      `${config.apiBaseUrl}/game/next/${gameId}?currentPlay=${currentPlay}&announcerStyle=${announcerStyle}`,
      {
        headers: {
          'session-id': sessionId
        }
      }
    );
    
    // ... rest of the function remains the same ...
  }
};
```

### 6. Add CSS for the Announcer Style Selector (frontend/src/components/BaseballGame.css)

#### Implementation:

```css
.announcer-style-selector {
  margin: 10px 0;
  display: flex;
  align-items: center;
}

.announcer-style-selector label {
  margin-right: 10px;
  font-weight: bold;
}

.announcer-style-selector select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
```

## Testing Plan

1. **Unit Tests**:
   - Create unit tests for the `generateDetailedPlayCompletion` function
   - Test with different announcer styles
   - Test with skipLLM=true to avoid actual API calls

2. **Integration Tests**:
   - Test the API endpoint with different announcer styles
   - Verify that the response includes properly formatted play-by-play text

3. **Manual Testing**:
   - Test the UI for selecting announcer styles
   - Verify that the play-by-play text changes appropriately with different styles
   - Check for any performance issues with the larger prompts

## Performance Considerations

1. **Token Usage**:
   - The detailed prompt is larger and will use more tokens
   - Monitor token usage and costs
   - Consider adding a configuration option to use the simpler prompt for cost-sensitive environments

2. **Response Time**:
   - The larger prompt may increase response time
   - Add metrics to track response time before and after the change
   - Consider adding a timeout for the OpenAI API call

3. **Database Storage**:
   - The larger prompts and responses will take up more space in the database
   - Monitor database size and performance

## Deployment Plan

1. **Development**:
   - Implement and test the changes in a development environment
   - Get feedback from team members

2. **Staging**:
   - Deploy to a staging environment
   - Test with real game data
   - Monitor performance and costs

3. **Production**:
   - Deploy to production
   - Monitor for any issues
   - Be prepared to roll back if necessary

## Rollback Plan

If issues are encountered:

1. Revert the changes to the `getNextPlay` handler to use the original `generatePlayCompletion` function
2. Remove the announcer style selector from the frontend
3. Update the API documentation to remove the announcer style parameter

## Future Enhancements

1. **Additional Announcer Styles**:
   - Add more announcer styles (e.g., regional announcers, historical announcers)
   - Allow for custom announcer profiles

2. **User Preferences**:
   - Save user preferences for announcer style
   - Allow users to create custom announcer profiles

3. **Dynamic Commentary**:
   - Adjust commentary style based on game situation (e.g., more excited for close games)
   - Add special commentary for significant events (e.g., no-hitters, walk-offs)