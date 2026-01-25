import { PlayData } from '../../../../../../common/types/PlayData';
import { PitchingChange, getFieldingTeamId } from './types';

/**
 * Detects if there was a pitching change between plays.
 *
 * A pitching change is detected when:
 * - The pitcher ID changes between plays
 * - It's NOT a half-inning change (where pitcher change is expected)
 *
 * This is a pure function - no side effects, no database access.
 *
 * @param currentPlay The current play data
 * @param nextPlay The next play data
 * @param isHalfInningChange Whether a half-inning change occurred
 * @returns PitchingChange if a change was detected, null otherwise
 */
export function detectPitchingChange(
  currentPlay: PlayData,
  nextPlay: PlayData,
  isHalfInningChange: boolean
): PitchingChange | null {
  // Skip if pitcher didn't change
  if (currentPlay.pitcher === nextPlay.pitcher) {
    return null;
  }

  // Skip if it's a half-inning change (expected pitcher swap between teams)
  if (isHalfInningChange) {
    return null;
  }

  // Pitching change detected
  return {
    newPitcherId: String(nextPlay.pitcher),
    oldPitcherId: String(currentPlay.pitcher),
    teamId: getFieldingTeamId(nextPlay),
  };
}
