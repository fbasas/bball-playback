import { LineupPlayerData } from '../../lineupTracking';
import { BatterChange } from './types';

/**
 * Determines the expected next batter based on the current batting order.
 *
 * @param battingOrder The current batting order (sorted by batting order position)
 * @returns The expected next batter and their index, or undefined if not determinable
 */
export function determineExpectedNextBatter(
  battingOrder: LineupPlayerData[]
): { expectedNextBatter: LineupPlayerData | undefined; expectedNextBatterIndex: number } {
  const currentBatterIndex = battingOrder.findIndex(p => p.isCurrentBatter);

  if (currentBatterIndex === -1) {
    return { expectedNextBatter: undefined, expectedNextBatterIndex: -1 };
  }

  const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
  const expectedNextBatter = battingOrder[expectedNextBatterIndex];

  return { expectedNextBatter, expectedNextBatterIndex };
}

/**
 * Checks if a player is already in the batting lineup.
 *
 * @param battingOrder The current batting order
 * @param playerId The player ID to check
 * @returns true if the player is already in the lineup
 */
export function isPlayerInLineup(
  battingOrder: LineupPlayerData[],
  playerId: string
): boolean {
  return battingOrder.some(p => p.playerId === playerId);
}

/**
 * Detects if there was a batter substitution between plays.
 *
 * A batter substitution is detected when:
 * - The next batter is different from the expected next batter
 * - The next batter is NOT already in the lineup (that would be just batting order rotation)
 *
 * This is a pure function - no side effects, no database access.
 *
 * @param currentBattingOrder The batting order for the team at bat (sorted by batting order)
 * @param nextBatter The batter ID from the next play
 * @param battingTeamId The team ID of the batting team
 * @returns BatterChange if a substitution was detected, null otherwise
 */
export function detectBatterChange(
  currentBattingOrder: LineupPlayerData[],
  nextBatter: string,
  battingTeamId: string
): BatterChange | null {
  // Determine expected next batter
  const { expectedNextBatter } = determineExpectedNextBatter(currentBattingOrder);

  // If we can't determine the expected next batter, skip detection
  if (!expectedNextBatter) {
    return null;
  }

  // If the actual next batter matches what we expect, no substitution occurred
  if (nextBatter === expectedNextBatter.playerId) {
    return null;
  }

  // Check if the next batter already exists in the lineup (not a substitution)
  if (isPlayerInLineup(currentBattingOrder, nextBatter)) {
    return null;
  }

  // Batter substitution detected
  return {
    newBatterId: nextBatter,
    oldBatterId: expectedNextBatter.playerId,
    battingOrder: expectedNextBatter.battingOrder,
    teamId: battingTeamId,
  };
}
