import { BaseballState } from '../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../common/types/SimplifiedBaseballState';
import { PlayData } from '../../../common/types/PlayData';
import { GAME_TYPES } from '../constants/GameConstants';

/**
 * Utility functions for game operations
 */

/**
 * Determines if a team is the home team based on play data
 * @param playData The play data
 * @param teamId The team ID to check
 * @returns True if the team is the home team, false otherwise
 */
export function isHomeTeam(playData: PlayData, teamId: string): boolean {
  return playData.top_bot === 0 ? playData.pitteam === teamId : playData.batteam === teamId;
}

/**
 * Creates a simplified baseball state from a full baseball state
 * @param baseballState The full baseball state
 * @param nextPlayData The next play data
 * @param playDescription The play description
 * @returns A SimplifiedBaseballState object
 */
export function createSimplifiedState(
  baseballState: BaseballState,
  nextPlayData: PlayData,
  playDescription?: string
): SimplifiedBaseballState {
  return {
    gameId: baseballState.gameId,
    sessionId: baseballState.sessionId,
    game: {
      inning: nextPlayData.inning,
      isTopInning: nextPlayData.top_bot === 0,
      outs: nextPlayData.outs_pre,
      log: baseballState.game.log || [],
      onFirst: baseballState.game.onFirst || '',
      onSecond: baseballState.game.onSecond || '',
      onThird: baseballState.game.onThird || ''
    },
    home: {
      id: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.id : baseballState.visitors.id,
      displayName: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.displayName : baseballState.visitors.displayName,
      shortName: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.shortName : baseballState.visitors.shortName,
      currentBatter: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.currentBatter : baseballState.visitors.currentBatter,
      currentPitcher: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.currentPitcher : baseballState.visitors.currentPitcher,
      nextBatter: null,
      nextPitcher: null,
      runs: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.home.stats.runs : baseballState.visitors.stats.runs
    },
    visitors: {
      id: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.id : baseballState.home.id,
      displayName: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.displayName : baseballState.home.displayName,
      shortName: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.shortName : baseballState.home.shortName,
      currentBatter: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.currentBatter : baseballState.home.currentBatter,
      currentPitcher: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.currentPitcher : baseballState.home.currentPitcher,
      nextBatter: null,
      nextPitcher: null,
      runs: isHomeTeam(nextPlayData, baseballState.home.id) ? baseballState.visitors.stats.runs : baseballState.home.stats.runs
    },
    currentPlay: nextPlayData.pn,
    playDescription,
    eventString: nextPlayData.event
  };
}

/**
 * Updates the next batter and pitcher information in a simplified state
 * @param state The simplified state to update
 * @param nextPlayData The next play data
 */
export function updateNextBatterAndPitcher(
  state: SimplifiedBaseballState,
  nextPlayData: PlayData
): void {
  const isTopInning = nextPlayData.top_bot === 0;
  
  // Set next batter and pitcher based on inning
  if (isTopInning) {
    state.visitors.nextBatter = nextPlayData.batter || null;
    state.home.nextPitcher = nextPlayData.pitcher || null;
  } else {
    state.home.nextBatter = nextPlayData.batter || null;
    state.visitors.nextPitcher = nextPlayData.pitcher || null;
  }
}

/**
 * Validates required request input parameters
 * @param gameId The game ID
 * @param sessionId The session ID
 * @param currentPlay The current play index
 */
export function validateRequestInput(gameId: string, sessionId: string, currentPlay: number): void {
  if (!gameId) {
    throw new Error('Game ID is required');
  }
  if (!sessionId) {
    throw new Error('Session ID header is required');
  }
  if (isNaN(currentPlay)) {
    throw new Error('Current play index is required and must be a number');
  }
}

/**
 * Gets the error status code based on the error message
 * @param error The error object
 * @returns The appropriate HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return 404;
    }
    if (error.message.includes('required')) {
      return 400;
    }
  }
  return 500;
}