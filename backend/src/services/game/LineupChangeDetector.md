# LineupChangeDetector

The LineupChangeDetector class is responsible for detecting and managing lineup changes between baseball plays. It encapsulates all the logic for tracking player substitutions, position changes, and batting order updates.

## State

- `gameId: string` - The unique identifier for the game
- `sessionId: string` - The current session identifier
- `currentPlay: PlayData` - Data for the current play
- `nextPlay: PlayData` - Data for the next play
- `latestState: LineupState | null` - The most recent lineup state (null if no previous state exists)
- `isHalfInningChange: boolean` - Tracks if there's a change between top/bottom of inning
- `changes: LineupChangeData[]` - Collects all detected changes
- `playerCache: Map<string, {first: string, last: string}>` - Caches player names to reduce database queries

## Methods

### Constructor
```typescript
constructor(gameId: string, sessionId: string, currentPlay: PlayData, nextPlay: PlayData)
```
Initializes the detector with game, session, and play data. Automatically determines if there's a half-inning change by comparing batting teams.

### Private Methods

#### `logPlayTransition()`
Logs detailed information about the transition between plays, including:
- Inning number and half (top/bottom)
- Number of outs
- Current and next batter
- Current and next pitcher
- Half-inning change status

#### `async getPlayerName(playerId: string | number): Promise<string>`
- Retrieves a player's full name using their ID
- Uses caching to minimize database queries
- Handles both string and number IDs
- Returns formatted full name (first + last)

#### `createStateData(): LineupStateData`
Creates a LineupStateData object for the next play, including:
- Game and session IDs
- Play index
- Inning number and half
- Number of outs

#### `async handleInitialLineup(): Promise<number>`
- Handles first-time lineup creation
- Fetches team stats and player information
- Creates initial lineup for both teams
- Returns the new lineup state ID
- Throws error if team stats are not found

#### `async detectLineupChanges(): Promise<void>`
- Orchestrates the detection of all types of changes
- Calls individual detection methods:
  - detectPitchingChange()
  - detectBatterChange()
  - detectFieldingChanges()

#### `async detectPitchingChange(): Promise<void>`
- Detects pitcher substitutions
- Ignores changes during half-inning transitions
- Creates PITCHING_CHANGE records with:
  - Old and new pitcher IDs
  - Team ID
  - Description of the change

#### `async detectBatterChange(): Promise<void>`
- Detects batter substitutions
- Compares expected next batter with actual
- Creates SUBSTITUTION records with:
  - Old and new batter IDs
  - Batting order position
  - Team ID
  - Description of the change

#### `async detectFieldingChanges(): Promise<void>`
- Detects changes in fielding positions (f2-f9)
- Ignores changes during half-inning transitions
- Creates POSITION_CHANGE records with:
  - Old and new fielder IDs
  - Position number
  - Team ID
  - Description of the change

#### `applyChangesToPlayers(): LineupPlayerData[]`
- Updates player list based on detected changes
- Handles:
  - Pitcher updates (maintaining isCurrentPitcher flag)
  - Batter updates (maintaining isCurrentBatter flag)
  - Fielder position updates
- Returns new array of updated players

#### `async updateCurrentBatter(): Promise<LineupPlayerData[]>`
- Updates who is currently batting
- Handles transitions between innings
- Maintains batting order progression
- Updates isCurrentBatter flags
- Returns new array of updated players

### Public Methods

#### `async process(): Promise<number | null>`
Main entry point for change detection:
1. Logs the play transition
2. Gets latest lineup state
3. Handles initial lineup if needed
4. Detects any lineup changes
5. Applies changes and saves new state
6. Updates current batter if needed
7. Returns new lineup state ID or null if no changes

## Usage

```typescript
const detector = new LineupChangeDetector(gameId, sessionId, currentPlay, nextPlay);
const newStateId = await detector.process();
```

## Design Philosophy

The class follows these key principles:

1. **Separation of Concerns**
   - Data fetching and caching (getPlayerName, playerCache)
   - Change detection (detect* methods)
   - State management (applyChangesToPlayers, updateCurrentBatter)
   - Logging and monitoring (logPlayTransition)

2. **Data Efficiency**
   - Uses caching to minimize database queries
   - Batches database operations where possible
   - Reuses existing data structures

3. **Error Handling**
   - Validates input data
   - Handles missing or incomplete data gracefully
   - Provides detailed error messages

4. **Maintainability**
   - Clear method names that describe their purpose
   - Small, focused methods with single responsibilities
   - Comprehensive logging for debugging
   - Type safety throughout

This modular design makes the code easier to maintain and test, while keeping all lineup change logic encapsulated in a single class.
