/**
 * Service interfaces for dependency injection
 *
 * These interfaces define contracts for all major services, enabling:
 * - Clean mocking in tests
 * - Dependency injection
 * - Loose coupling between components
 */

import { PlayData, PlayDataResult } from '../../../../common/types/PlayData';
import { BaseballState } from '../../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';

// Re-export types that are commonly used with these interfaces
export { PlayData, PlayDataResult } from '../../../../common/types/PlayData';
export { BaseballState } from '../../../../common/types/BaseballTypes';
export { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';

/**
 * Player information returned by player services
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

/**
 * Score calculation result
 */
export interface ScoreResult {
  homeScoreBeforePlay: number;
  visitorScoreBeforePlay: number;
  homeScoreAfterPlay: number;
  visitorScoreAfterPlay: number;
}

/**
 * Announcer style options for commentary generation
 */
export type AnnouncerStyle = 'classic' | 'modern' | 'enthusiastic' | 'poetic';

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Interface for PlayerService
 *
 * Provides methods for retrieving player information from the database.
 */
export interface IPlayerService {
  /**
   * Gets player information by ID
   * @param playerId The player ID or null/undefined
   * @returns The player information or null if not found
   */
  getPlayerById(playerId: string | null | undefined): Promise<PlayerInfo | null>;

  /**
   * Gets player information for multiple player IDs
   * @param playerIds Array of player IDs to retrieve
   * @returns Map of player IDs to player information
   */
  getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>>;

  /**
   * Gets the full name of a player
   * @param playerId The player ID or null/undefined
   * @returns The player's full name or null if not found
   */
  getPlayerName(playerId: string | null | undefined): Promise<string | null>;

  /**
   * Clears the player cache
   */
  clearCache(): void;
}

/**
 * Team identification result
 */
export interface TeamIds {
  homeTeamId: string;
  visitorTeamId: string;
}

/**
 * Interface for ScoreService
 *
 * Handles score calculations for games. Contains all business logic.
 * Data access is delegated to IScoreRepository.
 */
export interface IScoreService {
  /**
   * Determines which team is home and which is visitor from play data
   * Pure function - no database access
   * @param playData The play data to analyze
   * @returns Object with homeTeamId and visitorTeamId
   */
  determineTeams(playData: PlayData): TeamIds;

  /**
   * Computes the score result from raw run totals
   * Pure function - no database access
   * @param homeRunsBefore Total home runs before the play
   * @param visitorRunsBefore Total visitor runs before the play
   * @param nextPlayData The next play data (to determine runs scored)
   * @param homeTeamId The home team ID (to determine who scored)
   * @returns Score result with before and after scores
   */
  computeScoreResult(
    homeRunsBefore: number,
    visitorRunsBefore: number,
    nextPlayData: PlayData,
    homeTeamId: string
  ): ScoreResult;

  /**
   * Calculates the cumulative score for home and visiting teams
   * Orchestrates data fetching and business logic
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   * @returns Score result with scores before and after the play
   */
  calculateScore(
    gameId: string,
    currentPlay: number,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<ScoreResult>;
}

/**
 * Interface for PlayDataService
 *
 * Handles retrieval and validation of play data from the database.
 */
export interface IPlayDataService {
  /**
   * Fetches the first play for a game
   * @param gameId The game ID
   * @returns The first play data
   */
  fetchFirstPlay(gameId: string): Promise<PlayData>;

  /**
   * Fetches play data for a game based on the current play index
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @returns Current and next play data
   */
  fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult>;

  /**
   * Fetches the play for a specific batter
   * @param gameId The game ID
   * @param batter The batter ID
   * @returns The play data for the batter, or null if not found
   */
  fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null>;
}

/**
 * Interface for CommentaryService
 *
 * Generates play-by-play commentary using AI.
 */
export interface ICommentaryService {
  /**
   * Generates play completion text
   * @param currentState The current baseball state
   * @param nextPlay The next play data
   * @param currentPlay The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @returns Array of commentary lines
   */
  generatePlayCompletion(
    currentState: BaseballState,
    nextPlay: PlayData,
    currentPlay: number,
    skipLLM: boolean,
    gameId: string
  ): Promise<string[]>;

  /**
   * Generates detailed play-by-play commentary
   * @param currentState The current baseball state
   * @param currentPlay The current play data
   * @param currentPlayIndex The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @param announcerStyle Optional announcer style
   * @returns Array of commentary lines
   */
  generateDetailedPlayCompletion(
    currentState: BaseballState,
    currentPlay: PlayData,
    currentPlayIndex: number,
    skipLLM: boolean,
    gameId: string,
    announcerStyle?: AnnouncerStyle
  ): Promise<string[]>;

  /**
   * Sets the AI adapter to use for generating completions
   * @param adapterName The name of the adapter to use
   */
  setAIAdapter(adapterName: string): void;
}

/**
 * Interface for LineupService
 *
 * Manages baseball team lineups, including tracking player positions,
 * batting orders, and changes throughout the game.
 */
export interface ILineupService {
  /**
   * Updates lineup information in the simplified state
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param nextPlayData The next play data
   * @param simplifiedState The simplified baseball state to update
   */
  updateLineupInfo(
    gameId: string,
    sessionId: string,
    nextPlayData: PlayData,
    simplifiedState: SimplifiedBaseballState
  ): Promise<void>;

  /**
   * Processes lineup changes between plays
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param currentPlayData The current play data
   * @param nextPlayData The next play data
   */
  processLineupChanges(
    gameId: string,
    sessionId: string,
    currentPlayData: PlayData,
    nextPlayData: PlayData
  ): Promise<void>;

  /**
   * Gets the next batter for a team
   * @param gameId The game ID
   * @param teamId The team ID
   * @param currentBatterId The current batter ID
   * @returns The next batter's name or null if not found
   */
  getNextBatter(
    gameId: string,
    teamId: string,
    currentBatterId: string | null
  ): Promise<string | null>;
}

/**
 * Interface for LineupChangeDetector
 *
 * Detects lineup changes between plays.
 */
export interface ILineupChangeDetector {
  /**
   * Processes lineup changes and returns the new lineup state ID
   * @returns The new lineup state ID or null if no changes
   */
  process(): Promise<number | null>;
}

// =============================================================================
// Repository Interfaces
// =============================================================================

/**
 * Interface for PlayerRepository
 *
 * Data access layer for player information.
 */
export interface IPlayerRepository {
  /**
   * Gets player information by ID
   * @param playerId The player ID
   * @returns The player information or null if not found
   */
  getPlayerById(playerId: string): Promise<PlayerInfo | null>;

  /**
   * Gets player information for multiple player IDs
   * @param playerIds Array of player IDs to retrieve
   * @returns Map of player IDs to player information
   */
  getPlayersByIds(playerIds: string[]): Promise<Map<string, PlayerInfo>>;

  /**
   * Gets the full name of a player
   * @param playerId The player ID
   * @returns The player's full name or null if not found
   */
  getPlayerName(playerId: string): Promise<string | null>;

  /**
   * Clears the player cache
   */
  clearCache(): void;
}

/**
 * Interface for ScoreRepository
 *
 * Thin data access layer for score data. No business logic - just SQL queries.
 * Business logic (team determination, score calculations) belongs in ScoreService.
 */
export interface IScoreRepository {
  /**
   * Gets the total runs scored by a team up to (and including) a specific play
   * @param gameId The game ID
   * @param teamId The team ID (batting team)
   * @param upToPlay The play number to sum runs up to (inclusive)
   * @returns Total runs scored by the team
   */
  getRunsForTeam(gameId: string, teamId: string, upToPlay: number): Promise<number>;

  /**
   * Gets the total runs scored by a team up to (but NOT including) a specific play
   * @param gameId The game ID
   * @param teamId The team ID (batting team)
   * @param beforePlay The play number to sum runs before (exclusive)
   * @returns Total runs scored by the team before this play
   */
  getRunsForTeamBefore(gameId: string, teamId: string, beforePlay: number): Promise<number>;

  /**
   * Preloads cumulative scores for all plays in a game into the cache.
   * Call before iterating through a game to avoid per-play SUM queries.
   * @param gameId The game ID
   * @returns Object with team IDs found and play count
   */
  preloadCumulativeScores(gameId: string): Promise<{ teams: string[]; playCount: number }>;
}

/**
 * Interface for PlayRepository
 *
 * Data access layer for play data.
 */
export interface IPlayRepository {
  /**
   * Fetches the first play for a game
   * @param gameId The game ID
   * @returns The first play data
   */
  fetchFirstPlay(gameId: string): Promise<PlayData>;

  /**
   * Fetches play data for a game
   * @param gameId The game ID
   * @param currentPlay The current play index
   * @returns Current and next play data
   */
  fetchPlayData(gameId: string, currentPlay: number): Promise<PlayDataResult>;

  /**
   * Fetches the play for a specific batter
   * @param gameId The game ID
   * @param batter The batter ID
   * @returns The play data or null
   */
  fetchPlayForBatter(gameId: string, batter: string): Promise<PlayData | null>;

  /**
   * Fetches all plays for a game
   * @param gameId The game ID
   * @returns Array of all play data
   */
  fetchAllPlaysForGame(gameId: string): Promise<PlayData[]>;

  /**
   * Fetches plays up to a specific play index
   * @param gameId The game ID
   * @param upToPlay The play index to fetch up to
   * @returns Array of play data
   */
  fetchPlaysUpTo(gameId: string, upToPlay: number): Promise<PlayData[]>;
}

/**
 * Starting lineup data for a team
 */
export interface StartingLineup {
  battingOrder: string[]; // Player IDs in batting order (1-9)
  pitcher: string | null; // Starting pitcher ID
}

/**
 * Team stats data from the database
 */
export interface TeamStatsData {
  team: string;
  start_l1: string;
  start_l2: string;
  start_l3: string;
  start_l4: string;
  start_l5: string;
  start_l6: string;
  start_l7: string;
  start_l8: string;
  start_l9: string;
  start_f1: string; // Starting pitcher
}

/**
 * Interface for TeamStatsRepository
 *
 * Data access layer for team statistics, including starting lineups.
 */
export interface ITeamStatsRepository {
  /**
   * Gets team stats for a game
   * @param gameId The game ID
   * @returns Array of team stats (home and visitor)
   */
  getTeamStatsForGame(gameId: string): Promise<TeamStatsData[]>;

  /**
   * Gets the starting lineup for a team
   * @param gameId The game ID
   * @param teamId The team ID
   * @returns The starting lineup
   */
  getStartingLineup(gameId: string, teamId: string): Promise<StartingLineup>;

  /**
   * Gets the starting pitcher for a team
   * @param gameId The game ID
   * @param teamId The team ID
   * @returns The starting pitcher ID or null
   */
  getStartingPitcher(gameId: string, teamId: string): Promise<string | null>;
}

// =============================================================================
// Lineup Tracking Interfaces (from lineupTracking.ts)
// =============================================================================

/**
 * Lineup state data
 */
export interface LineupStateData {
  gameId: string;
  sessionId: string;
  playIndex: number;
  inning: number;
  isTopInning: boolean;
  outs: number;
}

/**
 * Lineup player data
 */
export interface LineupPlayerData {
  teamId: string;
  playerId: string;
  battingOrder: number;
  position: string;
  isCurrentBatter: boolean;
  isCurrentPitcher: boolean;
}

/**
 * Lineup change data
 */
export interface LineupChangeData {
  changeType: 'SUBSTITUTION' | 'POSITION_CHANGE' | 'BATTING_ORDER_CHANGE' | 'PITCHING_CHANGE' | 'INITIAL_LINEUP' | 'OTHER';
  playerInId?: string;
  playerOutId?: string;
  positionFrom?: string;
  positionTo?: string;
  battingOrderFrom?: number;
  battingOrderTo?: number;
  teamId: string;
  description: string;
}

/**
 * Interface for LineupTrackingService
 *
 * Handles lineup state persistence and retrieval.
 */
export interface ILineupTrackingService {
  /**
   * Gets the latest lineup state for a game session
   * @param gameId The game ID
   * @param sessionId The session ID
   * @returns The latest lineup state or null
   */
  getLatestLineupState(gameId: string, sessionId: string): Promise<{
    id: number;
    playIndex: number;
    players: LineupPlayerData[];
  } | null>;

  /**
   * Saves a new lineup state
   * @param stateData The lineup state data
   * @param players The players in the lineup
   * @param changes The lineup changes
   * @returns The new lineup state ID
   */
  saveLineupState(
    stateData: LineupStateData,
    players: LineupPlayerData[],
    changes: LineupChangeData[]
  ): Promise<number>;

  /**
   * Saves the initial lineup for a game
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param homeLineup Home team lineup
   * @param visitorLineup Visitor team lineup
   * @param playIndex The play index
   * @returns The new lineup state ID
   */
  saveInitialLineup(
    gameId: string,
    sessionId: string,
    homeLineup: LineupPlayerData[],
    visitorLineup: LineupPlayerData[],
    playIndex: number
  ): Promise<number>;
}

// =============================================================================
// GamePlaybackService Interface
// =============================================================================

/**
 * Options for getNextPlay
 */
export interface NextPlayOptions {
  skipLLM?: boolean;
  announcerStyle?: AnnouncerStyle;
}

/**
 * Game state for playback (for future session management)
 */
export interface GamePlaybackState {
  gameId: string;
  sessionId: string;
  currentPlayIndex: number;
  baseballState: SimplifiedBaseballState;
}

/**
 * Interface for GamePlaybackService
 *
 * Orchestrates the entire game playback flow, extracting logic from route handlers.
 * Returns SimplifiedBaseballState directly to match existing API contract.
 */
export interface IGamePlaybackService {
  /**
   * Initializes a new game session (currentPlay === 0)
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param options Playback options (skipLLM, announcerStyle)
   * @returns The initial simplified baseball state
   */
  initializeGame(
    gameId: string,
    sessionId: string,
    options?: NextPlayOptions
  ): Promise<SimplifiedBaseballState>;

  /**
   * Gets the next play in the game sequence
   * Handles both initialization (currentPlay === 0) and regular play advancement
   * @param gameId The game ID
   * @param sessionId The session ID
   * @param currentPlayIndex The current play index
   * @param options Playback options (skipLLM, announcerStyle)
   * @returns The simplified baseball state for the next play
   */
  getNextPlay(
    gameId: string,
    sessionId: string,
    currentPlayIndex: number,
    options?: NextPlayOptions
  ): Promise<SimplifiedBaseballState>;

  /**
   * Gets the current game state (for future session management)
   * @param gameId The game ID
   * @param sessionId The session ID
   * @returns The current game state
   */
  getCurrentGameState(gameId: string, sessionId: string): Promise<GamePlaybackState>;
}
