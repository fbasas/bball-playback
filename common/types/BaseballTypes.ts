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
  game: GameState;
  home: TeamState;
  visitors: TeamState;
}

// Helper function to get full name
export const getFullName = (firstName: string, lastName: string): string => 
  `${firstName} ${lastName}`;

// Function to create an empty baseball state
export const createEmptyBaseballState = (): BaseballState => ({
  gameId: "-1",
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
  }
});
