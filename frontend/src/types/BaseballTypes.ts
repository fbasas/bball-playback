// Team definitions
export interface Team {
  id: string;
  displayName: string;
  shortName: string;
}

export interface Teams {
  home: Team;
  away: Team;
}

// Player definition
export interface Player {
  position: string;
  firstName: string;
  lastName: string;
  retrosheet_id: string; // Retrosheet database ID
}

// Team stats
export interface TeamStats {
  innings: number[];
  runs: number;
  hits: number;
  errors: number;
}

// Team state
export interface TeamState {
  id: string;
  displayName: string;
  shortName: string;  
  currentPitcher: string;
  lineup: Player[];
  stats: TeamStats;
  currentBatter: string | null;
}

// Game state
export interface GameState {
  inning: number;
  isTopInning: boolean;
  outs: number;
  log: string[];
  onFirst: string;
  onSecond: string;
  onThird: string;
}

// Complete baseball state
export interface BaseballState {
  gameId: string;
  sessionId: string; // Session ID to distinguish between multiple runs of the same game
  game: GameState;
  home: TeamState;
  visitors: TeamState;
  currentPlay: number; // Current play index
  gameType: 'replay' | 'simulation'; // Type of game (replay of historical game or simulation)
}

// Helper function to get full name
export const getFullName = (firstName: string, lastName: string): string => 
  `${firstName} ${lastName}`;

// Function to create an empty baseball state
export const createEmptyBaseballState = (): BaseballState => ({
  gameId: "-1",
  sessionId: "-1", // Default session ID
  game: {
    inning: 1,
    isTopInning: true,
    outs: 0,
    onFirst: "",
    onSecond: "",
    onThird: "",
    log: []
  },
  home: {
    id: "",
    displayName: "",
    shortName: "",
    currentPitcher: "",
    lineup: [],
    stats: {
      innings: [], // Empty array - innings haven't happened yet
      runs: 0,
      hits: 0,
      errors: 0
    },
    currentBatter: null
  },
  visitors: {
    id: "",
    displayName: "",
    shortName: "",
    currentPitcher: "",
    lineup: [],
    stats: {
      innings: [], // Empty array - innings haven't happened yet
      runs: 0,
      hits: 0,
      errors: 0
    },
    currentBatter: null
  },
  currentPlay: 0, // Default to 0 (no plays yet, so next play will be index 1)
  gameType: 'replay' // Default to replay mode
});