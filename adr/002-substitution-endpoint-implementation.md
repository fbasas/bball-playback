# ADR 002: Implementation Plan for Substitution Endpoint

## Status

Proposed

## Context

Following the decision to separate substitution logic from play progression (see [ADR 001](./001-substitution-endpoint-design.md)), this document outlines the detailed implementation plan for creating the new substitution endpoint and simplifying the existing `nextPlay` endpoint.

## Implementation Plan

### 1. Create New Type Definitions

First, we'll create new type definitions in the common types folder:

```typescript
// common/types/SubstitutionTypes.ts

export interface PlayerChange {
  playerId: string;
  playerName: string;  // Full name for display
  teamId: string;
  position?: string;   // Baseball position (if relevant)
}

export interface Substitution {
  type: 'PITCHING_CHANGE' | 'PINCH_HITTER' | 'PINCH_RUNNER' | 'FIELDING_CHANGE';
  playerIn: PlayerChange;
  playerOut: PlayerChange;
  description: string;  // Human-readable description of the change
}

export interface SubstitutionResponse {
  // Summary flags for quick checking
  hasPitchingChange: boolean;
  hasPinchHitter: boolean;
  hasPinchRunner: boolean;
  
  // Detailed substitution information
  substitutions: Substitution[];
}
```

### 2. Create the SubstitutionDetector Class

Next, we'll implement a new class for detecting substitutions:

```typescript
// backend/src/services/game/SubstitutionDetector.ts

import { PlayData } from '../../../../common/types/PlayData';
import { SubstitutionResponse, Substitution } from '../../../../common/types/SubstitutionTypes';
import { db } from '../../config/database';

export class SubstitutionDetector {
  private gameId: string;
  private sessionId: string;
  private currentPlay: PlayData;
  private nextPlay: PlayData;
  private playerCache: Map<string, { first: string; last: string }> = new Map();
  private substitutions: Substitution[] = [];

  constructor(gameId: string, sessionId: string, currentPlay: PlayData, nextPlay: PlayData) {
    this.gameId = gameId;
    this.sessionId = sessionId;
    this.currentPlay = currentPlay;
    this.nextPlay = nextPlay;
  }

  private async getPlayerName(playerId: string): Promise<string> {
    if (!this.playerCache.has(playerId)) {
      const player = await db('allplayers')
        .where({ id: playerId })
        .first();
      if (player) {
        this.playerCache.set(playerId, { 
          first: player.first || '', 
          last: player.last || '' 
        });
      }
    }
    const player = this.playerCache.get(playerId);
    return player ? `${player.first} ${player.last}`.trim() : '';
  }

  private async detectPitchingChange(): Promise<void> {
    // Skip if no change or half-inning change
    if (this.currentPlay.pitcher === this.nextPlay.pitcher || 
        this.currentPlay.batteam !== this.nextPlay.batteam) {
      return;
    }

    const newPitcherName = await this.getPlayerName(this.nextPlay.pitcher);
    const oldPitcherName = await this.getPlayerName(this.currentPlay.pitcher);
    const teamId = this.nextPlay.pitteam;

    this.substitutions.push({
      type: 'PITCHING_CHANGE',
      playerIn: {
        playerId: this.nextPlay.pitcher,
        playerName: newPitcherName,
        teamId,
        position: 'P'
      },
      playerOut: {
        playerId: this.currentPlay.pitcher,
        playerName: oldPitcherName,
        teamId,
        position: 'P'
      },
      description: `Pitching change: ${newPitcherName} replaces ${oldPitcherName}`
    });
  }

  private async detectPinchHitter(): Promise<void> {
    // Skip if half-inning change
    if (this.currentPlay.batteam !== this.nextPlay.batteam) {
      return;
    }

    // Get the latest lineup state to determine expected batter
    const lineupState = await db('lineup_states')
      .where({ 
        game_id: this.gameId,
        session_id: this.sessionId
      })
      .where('play_index', '<=', this.currentPlay.pn)
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      return;
    }

    // Get the players for this lineup state
    const players = await db('lineup_players')
      .where({ lineup_state_id: lineupState.id });
    
    // Get batting team players sorted by batting order
    const battingTeamId = this.nextPlay.batteam;
    const battingTeamPlayers = players
      .filter(p => p.team_id === battingTeamId)
      .sort((a, b) => a.batting_order - b.batting_order);
    
    // Find current batter
    const currentBatterIndex = battingTeamPlayers.findIndex(p => p.is_current_batter);
    if (currentBatterIndex === -1) {
      return;
    }
    
    // Calculate expected next batter
    const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
    const expectedNextBatter = battingTeamPlayers[expectedNextBatterIndex];
    
    // If next batter is not as expected and not already in lineup, it's a pinch hitter
    if (expectedNextBatter && 
        this.nextPlay.batter !== expectedNextBatter.player_id && 
        !battingTeamPlayers.some(p => p.player_id === this.nextPlay.batter)) {
      
      const newBatterName = await this.getPlayerName(this.nextPlay.batter);
      const expectedBatterName = await this.getPlayerName(expectedNextBatter.player_id);
      
      this.substitutions.push({
        type: 'PINCH_HITTER',
        playerIn: {
          playerId: this.nextPlay.batter,
          playerName: newBatterName,
          teamId: battingTeamId,
          position: expectedNextBatter.position
        },
        playerOut: {
          playerId: expectedNextBatter.player_id,
          playerName: expectedBatterName,
          teamId: battingTeamId,
          position: expectedNextBatter.position
        },
        description: `Pinch hitter: ${newBatterName} bats for ${expectedBatterName}`
      });
    }
  }

  private async detectPinchRunner(): Promise<void> {
    // Check for runner changes that aren't explained by play outcomes
    const bases = ['runner1', 'runner2', 'runner3'] as const;
    
    for (const base of bases) {
      const currentRunner = this.currentPlay[base];
      const nextRunner = this.nextPlay[base];
      
      // If there's a runner on the base in both plays but it's a different player
      if (currentRunner && nextRunner && currentRunner !== nextRunner) {
        const newRunnerName = await this.getPlayerName(nextRunner);
        const oldRunnerName = await this.getPlayerName(currentRunner);
        const teamId = this.nextPlay.batteam;
        
        this.substitutions.push({
          type: 'PINCH_RUNNER',
          playerIn: {
            playerId: nextRunner,
            playerName: newRunnerName,
            teamId
          },
          playerOut: {
            playerId: currentRunner,
            playerName: oldRunnerName,
            teamId
          },
          description: `Pinch runner: ${newRunnerName} runs for ${oldRunnerName} at ${base === 'runner1' ? 'first' : base === 'runner2' ? 'second' : 'third'} base`
        });
      }
    }
  }

  public async detectSubstitutions(): Promise<SubstitutionResponse> {
    // Detect all types of substitutions
    await this.detectPitchingChange();
    await this.detectPinchHitter();
    await this.detectPinchRunner();

    // Create the response
    return {
      hasPitchingChange: this.substitutions.some(s => s.type === 'PITCHING_CHANGE'),
      hasPinchHitter: this.substitutions.some(s => s.type === 'PINCH_HITTER'),
      hasPinchRunner: this.substitutions.some(s => s.type === 'PINCH_RUNNER'),
      substitutions: this.substitutions
    };
  }

  // Static method to create a detector from just the current play
  public static async createFromCurrentPlay(
    gameId: string, 
    sessionId: string, 
    currentPlay: number
  ): Promise<SubstitutionDetector | null> {
    // Fetch current play data
    const currentPlayData = await db('plays')
      .where({ gid: gameId, pn: currentPlay })
      .first();
    
    if (!currentPlayData) {
      return null;
    }
    
    // Fetch next play data
    const nextPlayData = await db('plays')
      .where({ gid: gameId })
      .where('pn', '>', currentPlay)
      .orderBy('pn', 'asc')
      .first();
    
    if (!nextPlayData) {
      return null;
    }
    
    return new SubstitutionDetector(gameId, sessionId, currentPlayData, nextPlayData);
  }
}
```

### 3. Create the Substitution Endpoint Controller

```typescript
// backend/src/routes/game/checkSubstitutions.ts

import { Request, RequestHandler } from 'express';
import { SubstitutionResponse } from '../../../../common/types/SubstitutionTypes';
import { db } from '../../config/database';
import { SubstitutionDetector } from '../../services/game/SubstitutionDetector';

export const checkSubstitutions: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  const currentPlay = parseInt(req.query.currentPlay as string);

  try {
    // Validate input
    if (!gameId || !sessionId || isNaN(currentPlay)) {
      return res.status(400).json({ 
        error: 'Missing required parameters: gameId, sessionId, currentPlay' 
      });
    }

    // Create detector from current play (it will find the next play internally)
    const detector = await SubstitutionDetector.createFromCurrentPlay(gameId, sessionId, currentPlay);
    
    if (!detector) {
      return res.status(404).json({ 
        error: 'Play data not found for the specified game and play index, or no next play exists' 
      });
    }

    // Detect substitutions
    const substitutionResponse = await detector.detectSubstitutions();
    
    res.json(substitutionResponse);
  } catch (error) {
    console.error('Error checking substitutions:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: message });
  }
};
```

### 4. Update Routes Configuration

```typescript
// backend/src/routes/game/index.ts

import { Router } from 'express';
import { initGame } from './initGame';
import { getNextPlay } from './nextPlay';
import { getGameInfo } from './gameInfo';
import { checkSubstitutions } from './checkSubstitutions';

const router = Router();

router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);
router.get('/info/:gid', getGameInfo);
router.get('/checkSubstitutions/:gameId', checkSubstitutions);

export default router;
```

### 5. Create Simplified BaseballState Type

```typescript
// common/types/SimplifiedBaseballState.ts

export interface SimplifiedBaseballState {
  gameId: string;
  sessionId: string;
  game: {
    inning: number;
    isTopInning: boolean;
    outs: number;
    log: string[];
    onFirst: string;
    onSecond: string;
    onThird: string;
  };
  home: {
    id: string;
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
  };
  visitors: {
    id: string;
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
  };
  currentPlay: number;
}
```

### 6. Modify the nextPlay Endpoint

```typescript
// backend/src/routes/game/nextPlay.ts

// Import the SimplifiedBaseballState instead of BaseballState
import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';

// ... existing code ...

/**
 * Get the next play in a game sequence
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
 */
export const getNextPlay: RequestHandler = async (req, res) => {
  // ... existing code for fetching play data and generating completion ...
  
  // Create a simplified response
  const simplifiedState: SimplifiedBaseballState = {
    gameId: currentState.gameId,
    sessionId: currentState.sessionId,
    game: {
      inning: nextPlayData.inning,
      isTopInning: nextPlayData.top_bot === 0,
      outs: nextPlayData.outs_pre,
      log: logEntries,
      onFirst: nextPlayData.runner1 || '',
      onSecond: nextPlayData.runner2 || '',
      onThird: nextPlayData.runner3 || ''
    },
    home: {
      id: currentState.home.id,
      displayName: currentState.home.displayName,
      shortName: currentState.home.shortName,
      currentBatter: currentState.home.currentBatter,
      currentPitcher: currentState.home.currentPitcher
    },
    visitors: {
      id: currentState.visitors.id,
      displayName: currentState.visitors.displayName,
      shortName: currentState.visitors.shortName,
      currentBatter: currentState.visitors.currentBatter,
      currentPitcher: currentState.visitors.currentPitcher
    },
    currentPlay: nextPlayData.pn
  };
  
  // Still update the lineup state in the database for consistency
  try {
    console.log(`[NEXTPLAY] Processing lineup changes for game ${gameId}, from play ${currentPlay} to ${nextPlayData.pn}`);
    const lineupStateId = await detectAndSaveLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
    
    if (lineupStateId) {
      console.log(`[NEXTPLAY] Lineup changes detected and saved with state ID: ${lineupStateId}`);
    } else {
      console.log(`[NEXTPLAY] No lineup changes detected or saved`);
    }
  } catch (error: unknown) {
    console.error('Error tracking lineup changes:', error instanceof Error ? error.message : error);
  }
  
  res.json(simplifiedState);
  // ... error handling ...
};
```

### 7. Frontend Integration

The frontend will need to be updated to work with the new API structure:

```typescript
// Example frontend code for fetching both play data and substitutions
async function getNextPlayWithSubstitutions(gameId: string, currentPlay: number) {
  // Get substitution information first
  const subsResponse = await fetch(
    `/api/game/checkSubstitutions/${gameId}?currentPlay=${currentPlay}`
  );
  const substitutions = await subsResponse.json();
  
  // Get the next play data
  const nextPlayResponse = await fetch(`/api/game/next/${gameId}?currentPlay=${currentPlay}`);
  const nextPlayData = await nextPlayResponse.json();
  
  // Combine the data for UI presentation
  return {
    playData: nextPlayData,
    substitutions
  };
}
```

## Testing Plan

### 1. Unit Tests

- Test the `SubstitutionDetector` class with various scenarios:
  - Pitching changes
  - Pinch hitters
  - Pinch runners
  - Multiple substitutions
  - No substitutions
  - Half-inning changes

### 2. Integration Tests

- Test the `checkSubstitutions` endpoint with real game data
- Verify that the simplified `nextPlay` endpoint still provides all necessary information
- Test error handling for both endpoints

### 3. End-to-End Tests

- Test the frontend integration with both endpoints
- Verify that the UI correctly displays both play outcomes and substitutions

## Migration Strategy

1. Implement the new endpoint and types
2. Modify the `nextPlay` endpoint to return the simplified response
3. Update the frontend to use both endpoints
4. Deploy the changes
5. Monitor for any issues

## Timeline

1. **Week 1**: Create new types and implement the `SubstitutionDetector` class
2. **Week 2**: Implement the `checkSubstitutions` endpoint and modify the `nextPlay` endpoint
3. **Week 3**: Update the frontend and write tests
4. **Week 4**: Testing, bug fixes, and deployment

## Conclusion

This implementation plan provides a detailed roadmap for separating substitution logic from play progression. By following this plan, we'll create a more maintainable, focused API that better serves the needs of the Baseball Playback application.