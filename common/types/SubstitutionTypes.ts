/**
 * Interface representing a player involved in a substitution
 */
export interface PlayerChange {
  playerId: string;
  playerName: string;  // Full name for display
  teamId: string;
  position?: string;   // Baseball position (if relevant)
}

/**
 * Interface representing a single substitution event
 */
export interface Substitution {
  type: 'PITCHING_CHANGE' | 'PINCH_HITTER' | 'PINCH_RUNNER' | 'FIELDING_CHANGE';
  playerIn: PlayerChange;
  playerOut: PlayerChange;
  description: string;  // Human-readable description of the change
}

/**
 * Interface for the response from the substitution endpoint
 */
export interface SubstitutionResponse {
  // Summary flags for quick checking
  hasPitchingChange: boolean;
  hasPinchHitter: boolean;
  hasPinchRunner: boolean;
  
  // Detailed substitution information
  substitutions: Substitution[];
}