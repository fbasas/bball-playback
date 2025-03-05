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
  currentPitcher: (isTopInning: boolean) => string;
  lineup: Player[];
  stats: TeamStats;
  currentBatter: (isTopInning: boolean) => string | null;
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
  game: GameState;
  home: TeamState;
  visitors: TeamState;
}

// Helper function to get full name
export const getFullName = (firstName: string, lastName: string): string => 
  `${firstName} ${lastName}`; 