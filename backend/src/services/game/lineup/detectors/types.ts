import { PlayData } from '../../../../../../common/types/PlayData';
import { LineupPlayerData } from '../../lineupTracking';

/**
 * Result of detecting a pitching change
 */
export interface PitchingChange {
  newPitcherId: string;
  oldPitcherId: string;
  teamId: string;
}

/**
 * Result of detecting a batter substitution
 */
export interface BatterChange {
  newBatterId: string;
  oldBatterId: string;
  battingOrder: number;
  teamId: string;
}

/**
 * Result of detecting a fielding change
 */
export interface FieldingChange {
  newFielderId: string;
  oldFielderId: string;
  position: number;
  teamId: string;
}

/**
 * Input data for batter change detection
 */
export interface BatterChangeInput {
  currentBattingOrder: LineupPlayerData[];
  nextBatter: string;
  battingTeamId: string;
}

/**
 * Helper to get fielding team ID from play data
 */
export function getFieldingTeamId(play: PlayData): string {
  return play.top_bot === 0 ? String(play.pitteam) : String(play.batteam);
}
