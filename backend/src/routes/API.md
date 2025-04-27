# Baseball Playback API Documentation

This document provides comprehensive information about the available API endpoints, their request parameters, response data types, and usage examples for the Baseball Playback application.

## Table of Contents

1. [Game Endpoints](#game-endpoints)
   - [Create Game](#create-game)
   - [Initialize Game](#initialize-game)
   - [Announce Lineups](#announce-lineups)
   - [Get Next Play](#get-next-play)
   - [Get Game Info](#get-game-info)
   - [Check Substitutions](#check-substitutions)
2. [Lineup Tracking Endpoints](#lineup-tracking-endpoints)
   - [Get Lineup History](#get-lineup-history)
   - [Get Lineup State for Play](#get-lineup-state-for-play)
   - [Get Latest Lineup State](#get-latest-lineup-state)
3. [Data Types](#data-types)
   - [BaseballState](#baseballstate)
   - [LineupChange](#lineupchange)
   - [LineupState](#lineupstate)
   - [LineupPlayer](#lineupplayer)
   - [PlayData](#playdata)
   - [SubstitutionResponse](#substitutionresponse)

## Game Endpoints

### Create Game

Creates a new game with the specified home and visiting teams and initializes the game state.

- **URL**: `/game/createGame`
- **Method**: `POST`
- **Request Body**:
  ```typescript
  {
    homeTeamId: string;
    visitingTeamId: string;
  }
  ```
- **Response Data**:
  ```typescript
  {
    gameId: string;
    sessionId: string;
    gameState: BaseballState;
  }
  ```

### Initialize Game

Initializes a game with the first play data and returns the initial game state.

- **URL**: `/game/init/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game to initialize
- **Query Parameters**:
  - `skipLLM` (optional): Set to 'true' to skip LLM calls for testing
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `BaseballState` object with initial game state

### Announce Lineups

Generates AI-powered lineup announcements for a game with detailed player introductions.

- **URL**: `/game/announceLineups/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Query Parameters**:
  - `skipLLM` (optional): Set to 'true' to skip LLM calls for testing
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `BaseballState` object with lineup announcements

### Get Next Play

Gets the next play in a game sequence with AI-generated play-by-play commentary.

- **URL**: `/game/next/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Query Parameters**:
  - `currentPlay`: Index of the current play
  - `skipLLM` (optional): Set to 'true' to skip LLM calls for testing
  - `announcerStyle` (optional): Announcer style to use for commentary. Options: 'classic', 'modern', 'enthusiastic', 'poetic'. Default: 'classic'
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `BaseballState` object with the next play information

### Get Game Info

Gets detailed information about a game, including all plays and events.

- **URL**: `/game/info/:gid`
- **Method**: `GET`
- **URL Parameters**:
  - `gid`: ID of the game
- **Response Data**:
  ```typescript
  {
    plays: PlayData[];
  }
  ```

### Check Substitutions

Checks for substitutions between the current play and the next play.

- **URL**: `/game/checkSubstitutions/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Query Parameters**:
  - `currentPlay`: Index of the current play
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**:
  ```typescript
  {
    hasPitchingChange: boolean;
    hasPinchHitter: boolean;
    hasPinchRunner: boolean;
    substitutions: Substitution[];
  }
  ```

**Example Request:**
```
GET /api/game/checkSubstitutions/CIN201904150?currentPlay=42
Headers:
  session-id: 123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
{
  "hasPitchingChange": true,
  "hasPinchHitter": false,
  "hasPinchRunner": false,
  "substitutions": [
    {
      "type": "PITCHING_CHANGE",
      "playerIn": {
        "playerId": "smitj001",
        "playerName": "Joe Smith",
        "teamId": "CIN",
        "position": "P"
      },
      "playerOut": {
        "playerId": "joneb001",
        "playerName": "Bob Jones",
        "teamId": "CIN",
        "position": "P"
      },
      "description": "Joe Smith replaces Bob Jones as pitcher"
    }
  ]
}
```

## Lineup Tracking Endpoints

### Get Lineup History

Gets all lineup changes for a game, including substitutions, position changes, and batting order changes.

- **URL**: `/game/lineup/history/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**:
  ```typescript
  {
    changes: LineupChange[];
  }
  ```

### Get Lineup State for Play

Gets the complete lineup state for a specific play in a game, including all players, positions, and batting orders.

- **URL**: `/game/lineup/state/:gameId/:playIndex`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
  - `playIndex`: Index of the play
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `LineupState` object for the specified play

### Get Latest Lineup State

Gets the most recent lineup state for a game, reflecting all substitutions and changes.

- **URL**: `/game/lineup/latest/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: The most recent `LineupState` object for the game

## Data Types

### BaseballState

The main state object for a baseball game.

```typescript
interface BaseballState {
  gameId: string;      // Unique identifier for the game
  sessionId: string;   // Unique session identifier
  game: GameState;     // Current game state information
  home: TeamState;     // Home team state
  visitors: TeamState; // Visiting team state
  currentPlay: number; // Current play index being displayed
  gameType: 'replay' | 'simulation'; // Type of game
}

interface GameState {
  inning: number;      // Current inning number
  isTopInning: boolean; // Whether it's the top of the inning
  outs: number;        // Number of outs (0-3)
  log: string[];       // Game log entries
  onFirst: string;     // Player name on first base (if any)
  onSecond: string;    // Player name on second base (if any)
  onThird: string;     // Player name on third base (if any)
}

interface TeamState {
  id: string;          // Team ID
  displayName: string; // Display name of the team
  shortName: string;   // Short name of the team
  currentPitcher: string; // Name of the current pitcher
  lineup: Player[];    // Team lineup
  stats: TeamStats;    // Team statistics
  currentBatter: string | null; // Name of the current batter
}

interface TeamStats {
  innings: number[];   // Runs scored in each inning
  runs: number;        // Total runs
  hits: number;        // Total hits
  errors: number;      // Total errors
}

interface Player {
  position: string;    // Player's position
  firstName: string;   // Player's first name
  lastName: string;    // Player's last name
  retrosheet_id: string; // Retrosheet database ID
}
```

**Example:**
```json
{
  "gameId": "CIN201904150",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "game": {
    "inning": 1,
    "isTopInning": true,
    "outs": 0,
    "log": ["Game between the Chicago Cubs and the Cincinnati Reds is about to begin."],
    "onFirst": "",
    "onSecond": "",
    "onThird": ""
  },
  "home": {
    "id": "CIN",
    "displayName": "Cincinnati Reds",
    "shortName": "Reds",
    "currentPitcher": "Luis Castillo",
    "lineup": [
      {
        "position": "SS",
        "firstName": "Jose",
        "lastName": "Peraza",
        "retrosheet_id": "peraj001"
      },
      // Additional players...
    ],
    "stats": {
      "innings": [0],
      "runs": 0,
      "hits": 0,
      "errors": 0
    },
    "currentBatter": null
  },
  "visitors": {
    "id": "CHN",
    "displayName": "Chicago Cubs",
    "shortName": "Cubs",
    "currentPitcher": "Kyle Hendricks",
    "lineup": [
      {
        "position": "CF",
        "firstName": "Albert",
        "lastName": "Almora",
        "retrosheet_id": "almoa001"
      },
      // Additional players...
    ],
    "stats": {
      "innings": [0],
      "runs": 0,
      "hits": 0,
      "errors": 0
    },
    "currentBatter": "Albert Almora"
  },
  "currentPlay": 1,
  "gameType": "replay"
}
```

### LineupChange

Represents a change in the lineup during a game.

```typescript
interface LineupChange {
  id: number;          // Unique identifier for the change
  gameId: string;      // Game ID
  sessionId: string;   // Session ID
  playIndex: number;   // Play index when the change occurred
  timestamp: string;   // When the change occurred (ISO format)
  changes: string;     // JSON string of changes
}
```

**Example:**
```json
{
  "id": 42,
  "gameId": "CIN201904150",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "playIndex": 42,
  "timestamp": "2025-04-15T14:32:15.000Z",
  "changes": "{\"type\":\"PITCHING_CHANGE\",\"playerIn\":\"smitj001\",\"playerOut\":\"joneb001\"}"
}
```

### LineupState

Represents the state of the lineup at a specific point in the game.

```typescript
interface LineupState {
  id: number;          // Unique identifier for the lineup state
  gameId: string;      // Game ID
  sessionId: string;   // Session ID
  playIndex: number;   // Play index for this state
  timestamp: string;   // When the state was recorded (ISO format)
  players: LineupPlayer[]; // Players in the lineup
}
```

**Example:**
```json
{
  "id": 15,
  "gameId": "CIN201904150",
  "sessionId": "123e4567-e89b-12d3-a456-426614174000",
  "playIndex": 42,
  "timestamp": "2025-04-15T14:32:15.000Z",
  "players": [
    {
      "playerId": "almoa001",
      "teamId": "CHN",
      "position": "CF",
      "battingOrder": 1,
      "isCurrentPitcher": false,
      "isCurrentBatter": true
    },
    // Additional players...
  ]
}
```

### LineupPlayer

Represents a player in the lineup.

```typescript
interface LineupPlayer {
  playerId: string;    // Player ID
  teamId: string;      // Team ID
  position: string;    // Position (e.g., "P", "1B", "SS")
  battingOrder: number; // Position in batting order (1-9)
  isCurrentPitcher: boolean; // Whether this player is the current pitcher
  isCurrentBatter: boolean; // Whether this player is the current batter
}
```

**Example:**
```json
{
  "playerId": "almoa001",
  "teamId": "CHN",
  "position": "CF",
  "battingOrder": 1,
  "isCurrentPitcher": false,
  "isCurrentBatter": true
}
```

### PlayData

Represents data for a single play in a game.

```typescript
interface PlayData {
  gid: string;         // Game ID
  pn: number;          // Play number
  inning: number;      // Inning number
  top_bot: number;     // 0 for top of inning, 1 for bottom of inning
  batteam: string;     // Batting team ID
  pitteam: string;     // Pitching team ID
  batter: string;      // Current batter ID
  pitcher: string;     // Current pitcher ID
  outs_pre: number;    // Number of outs before the play
  outs_post: number;   // Number of outs after the play
  br1_pre?: string;    // Runner on first base before the play (if any)
  br2_pre?: string;    // Runner on second base before the play (if any)
  br3_pre?: string;    // Runner on third base before the play (if any)
  f2?: string;         // Catcher ID
  f3?: string;         // First baseman ID
  f4?: string;         // Second baseman ID
  f5?: string;         // Third baseman ID
  f6?: string;         // Shortstop ID
  f7?: string;         // Left fielder ID
  f8?: string;         // Center fielder ID
  f9?: string;         // Right fielder ID
  event?: string;      // Event code for the play
  runs?: number;       // Runs scored on the play
}
```

**Example:**
```json
{
  "gid": "CIN201904150",
  "pn": 42,
  "inning": 5,
  "top_bot": 0,
  "batteam": "CHN",
  "pitteam": "CIN",
  "batter": "bryak001",
  "pitcher": "castl003",
  "outs_pre": 1,
  "outs_post": 2,
  "br1_pre": "baezj001",
  "br2_pre": null,
  "br3_pre": null,
  "f2": "barnc001",
  "f3": "vottj001",
  "f4": "dietd001",
  "f5": "suare001",
  "f6": "peraj001",
  "f7": "winkj002",
  "f8": "scheb001",
  "f9": "puigy001",
  "event": "8/F"
}
```

### SubstitutionResponse

Represents information about substitutions between plays.

```typescript
interface SubstitutionResponse {
  hasPitchingChange: boolean; // Whether there was a pitching change
  hasPinchHitter: boolean;    // Whether there was a pinch hitter
  hasPinchRunner: boolean;    // Whether there was a pinch runner
  substitutions: Substitution[]; // List of substitutions
}

interface Substitution {
  type: 'PITCHING_CHANGE' | 'PINCH_HITTER' | 'PINCH_RUNNER' | 'FIELDING_CHANGE';
  playerIn: PlayerChange;     // Player coming into the game
  playerOut: PlayerChange;    // Player leaving the game
  description: string;        // Human-readable description of the change
}

interface PlayerChange {
  playerId: string;           // Player ID
  playerName: string;         // Full name for display
  teamId: string;             // Team ID
  position?: string;          // Baseball position (if relevant)
}
```

**Example:**
```json
{
  "hasPitchingChange": true,
  "hasPinchHitter": false,
  "hasPinchRunner": false,
  "substitutions": [
    {
      "type": "PITCHING_CHANGE",
      "playerIn": {
        "playerId": "smitj001",
        "playerName": "Joe Smith",
        "teamId": "CIN",
        "position": "P"
      },
      "playerOut": {
        "playerId": "joneb001",
        "playerName": "Bob Jones",
        "teamId": "CIN",
        "position": "P"
      },
      "description": "Joe Smith replaces Bob Jones as pitcher"
    }
  ]
}
```
