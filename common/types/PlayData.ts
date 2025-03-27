/**
 * Interface representing play data from the database
 */
export interface PlayData {
  gid: string;           // Game ID
  pn: number;            // Play number
  inning: number;        // Inning number
  top_bot: number;       // 0 for top of inning, 1 for bottom of inning
  batteam: string;       // Batting team ID
  pitteam: string;       // Pitching team ID
  batter: string;        // Current batter ID
  pitcher: string;       // Current pitcher ID
  outs_pre: number;      // Number of outs before the play
  outs_post: number;     // Number of outs after the play
  br1_pre?: string;      // Runner on first base before the play
  br2_pre?: string;      // Runner on second base before the play
  br3_pre?: string;      // Runner on third base before the play
  f2?: string;           // Fielder position 2 (catcher) player ID
  f3?: string;           // Fielder position 3 (first base) player ID
  f4?: string;           // Fielder position 4 (second base) player ID
  f5?: string;           // Fielder position 5 (third base) player ID
  f6?: string;           // Fielder position 6 (shortstop) player ID
  f7?: string;           // Fielder position 7 (left field) player ID
  f8?: string;           // Fielder position 8 (center field) player ID
  f9?: string;           // Fielder position 9 (right field) player ID
  event?: string;        // Retrosheet event code
}

/**
 * Interface for the result of fetching play data
 */
export interface PlayDataResult {
  currentPlayData: PlayData;
  nextPlayData: PlayData;
}
