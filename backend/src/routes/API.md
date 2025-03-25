# API Documentation

This document provides information about the available API endpoints, their request parameters, and response data types.

## Game Endpoints

### Create Game

Creates a new game with the specified home and visiting teams.

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

Initializes a game with the first play data.

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

Generates lineup announcements for a game.

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

Gets the next play in a game sequence.

- **URL**: `/game/next/:gameId`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
- **Query Parameters**:
  - `currentPlay`: Index of the current play
  - `skipLLM` (optional): Set to 'true' to skip LLM calls for testing
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `BaseballState` object with the next play information

### Get Game Info

Gets information about a game, including all plays.

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

## Lineup Tracking Endpoints

### Get Lineup History

Gets all lineup changes for a game.

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

Gets the lineup state for a specific play in a game.

- **URL**: `/game/lineup/state/:gameId/:playIndex`
- **Method**: `GET`
- **URL Parameters**:
  - `gameId`: ID of the game
  - `playIndex`: Index of the play
- **Headers**:
  - `session-id`: Session identifier
- **Response Data**: `LineupState` object for the specified play

### Get Latest Lineup State

Gets the latest lineup state for a game.

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
  gameId: string;
  sessionId: string;
  game: GameState;
  home: TeamState;
  visitors: TeamState;
  currentPlay: number;
  gameType: 'replay' | 'simulation';
}
```

### LineupChange

Represents a change in the lineup during a game.

```typescript
interface LineupChange {
  id: number;
  gameId: string;
  sessionId: string;
  playIndex: number;
  timestamp: string;
  changes: string; // JSON string of changes
}
```

### LineupState

Represents the state of the lineup at a specific point in the game.

```typescript
interface LineupState {
  id: number;
  gameId: string;
  sessionId: string;
  playIndex: number;
  timestamp: string;
  players: LineupPlayer[];
}
```

### LineupPlayer

Represents a player in the lineup.

```typescript
interface LineupPlayer {
  playerId: string;
  teamId: string;
  position: string;
  battingOrder: number;
  isCurrentPitcher: boolean;
  isCurrentBatter: boolean;
}
```

### PlayData

Represents data for a single play in a game.

```typescript
interface PlayData {
  gid: string;
  pn: number;
  inning: number;
  top_bot: number;
  batteam: string;
  pitteam: string;
  batter: string;
  pitcher: string;
  outs_pre: number;
  runner1?: string;
  runner2?: string;
  runner3?: string;
  // Additional fielder positions (f2-f9) omitted for brevity
}
```
