import { PlayData } from '../../../../../../common/types/PlayData';
import { FieldingChange, getFieldingTeamId } from './types';

/**
 * Fielding positions to check (2-9).
 * Position 1 (pitcher) is handled separately by PitchingChangeDetector.
 */
const FIELDING_POSITIONS = [2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Gets the fielder ID at a specific position from play data.
 *
 * @param play The play data
 * @param position The fielding position (2-9)
 * @returns The fielder ID or undefined
 */
function getFielderAtPosition(play: PlayData, position: number): string | undefined {
  const fieldKey = `f${position}` as keyof PlayData;
  const fielderId = play[fieldKey];
  return fielderId ? String(fielderId) : undefined;
}

/**
 * Detects if there was a fielding change at a specific position.
 *
 * @param currentPlay The current play data
 * @param nextPlay The next play data
 * @param position The fielding position to check
 * @returns FieldingChange if a change was detected at this position, null otherwise
 */
function detectFieldingChangeAtPosition(
  currentPlay: PlayData,
  nextPlay: PlayData,
  position: number
): FieldingChange | null {
  const currentFielderId = getFielderAtPosition(currentPlay, position);
  const nextFielderId = getFielderAtPosition(nextPlay, position);

  // Skip if either fielder ID is missing or if they're the same
  if (!currentFielderId || !nextFielderId || currentFielderId === nextFielderId) {
    return null;
  }

  return {
    newFielderId: nextFielderId,
    oldFielderId: currentFielderId,
    position,
    teamId: getFieldingTeamId(nextPlay),
  };
}

/**
 * Detects all fielding changes between plays.
 *
 * Fielding changes are detected when a fielder at a specific position (2-9) changes
 * and it's NOT a half-inning change (where all fielders swap is expected).
 *
 * This is a pure function - no side effects, no database access.
 *
 * @param currentPlay The current play data
 * @param nextPlay The next play data
 * @param isHalfInningChange Whether a half-inning change occurred
 * @returns Array of FieldingChange for each position that changed (may be empty)
 */
export function detectFieldingChanges(
  currentPlay: PlayData,
  nextPlay: PlayData,
  isHalfInningChange: boolean
): FieldingChange[] {
  // Skip fielding change detection during half-inning changes
  if (isHalfInningChange) {
    return [];
  }

  const changes: FieldingChange[] = [];

  for (const position of FIELDING_POSITIONS) {
    const change = detectFieldingChangeAtPosition(currentPlay, nextPlay, position);
    if (change) {
      changes.push(change);
    }
  }

  return changes;
}
