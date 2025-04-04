/**
 * Interface representing a simplified baseball state
 * This is a more focused version of the BaseballState that only includes
 * information needed for play progression, without substitution details
 */
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
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number; // Add runs field
  };
  visitors: {
    id: string;
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number; // Add runs field
  };
  currentPlay: number;
  playDescription?: string;  // One-line description of the play
  eventString?: string;  // The raw event string from the play data
}