# ADR 001: Separating Substitution Logic from Play Progression

## Status

Proposed

## Context

The current Baseball Playback application combines play progression and substitution detection in a single `nextPlay` endpoint. This endpoint returns a comprehensive `BaseballState` object that includes game information, team states, lineups, and detected substitutions.

The current approach has several drawbacks:
1. The `nextPlay` endpoint has multiple responsibilities
2. The response payload is large and contains information that may not always be needed
3. Clients need to parse a complex object to understand both play outcomes and lineup changes
4. Changes to substitution logic can affect play progression logic

## Decision

We will separate the substitution detection logic from the play progression logic by:

1. Creating a new endpoint specifically for checking substitutions between plays
2. Simplifying the `nextPlay` endpoint to focus on play outcomes rather than substitutions
3. Defining clear, purpose-built data structures for each endpoint

## New Endpoint Design

The new endpoint will be:
```
GET /api/game/checkSubstitutions/:gameId?currentPlay=X
```

It will return a focused response with substitution information:

```typescript
interface SubstitutionResponse {
  hasPitchingChange: boolean;
  hasPinchHitter: boolean;
  hasPinchRunner: boolean;
  substitutions: {
    type: 'PITCHING_CHANGE' | 'PINCH_HITTER' | 'PINCH_RUNNER' | 'FIELDING_CHANGE';
    playerIn: {
      playerId: string;
      playerName: string;
      teamId: string;
      position?: string;
    };
    playerOut: {
      playerId: string;
      playerName: string;
      teamId: string;
      position?: string;
    };
    description: string;
  }[];
}
```

## Simplified nextPlay Endpoint

The `nextPlay` endpoint will be simplified to focus on play outcomes:

```typescript
interface SimplifiedBaseballState {
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

## Consequences

### Positive

1. **Separation of Concerns**:
   - Each endpoint has a clear, focused responsibility
   - Changes to one aspect won't affect the other

2. **Improved API Design**:
   - Purpose-built data structures for each endpoint
   - Clients can choose which data they need

3. **Better Maintainability**:
   - Easier to test each component independently
   - More focused code with clearer responsibilities

4. **Reduced Payload Size**:
   - Smaller response payloads when only play data is needed
   - More efficient data transfer

### Negative

1. **Multiple API Calls**:
   - Clients that need both play data and substitution information will need to make two API calls
   - Potential for increased latency in these cases

2. **Backward Compatibility**:
   - Existing clients will need to be updated to work with the new API structure
   - May require a transition period or versioning strategy

## Alternatives Considered

1. **Keep the current approach but optimize the response structure**:
   - This would reduce payload size but wouldn't address the separation of concerns
   - Would still mix play progression and substitution logic

2. **Create a combined endpoint that accepts a parameter to include/exclude substitution data**:
   - This would allow for flexible responses but would still mix concerns in the backend
   - Would add complexity to the endpoint implementation

## Implementation Notes

The implementation will:
1. Create a new `SubstitutionDetector` class that leverages similar logic to the existing `LineupChangeDetector`
2. Modify the `nextPlay` endpoint to return a simplified response
3. Ensure the lineup state is still properly maintained in the database