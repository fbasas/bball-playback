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