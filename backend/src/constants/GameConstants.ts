/**
 * Constants for the baseball game application
 */

/**
 * Announcer styles for play-by-play commentary
 */
export const ANNOUNCER_STYLES = {
  CLASSIC: 'classic',
  MODERN: 'modern',
  ENTHUSIASTIC: 'enthusiastic',
  POETIC: 'poetic'
} as const;

/**
 * Default announcer style
 */
export const DEFAULT_ANNOUNCER_STYLE = ANNOUNCER_STYLES.CLASSIC;

/**
 * Expected event map for common baseball events
 * Maps Retrosheet event codes to human-readable descriptions
 */
export const EXPECTED_EVENT_MAP: Record<string, string> = {
  '8/F8': 'Flyout to center fielder',
  '3/G3': 'Groundout to first baseman',
  '7/F7D': 'Flyout to left fielder',
  '43/G4': 'Groundout to second baseman, throw to first baseman',
  '6/F6': 'Flyout to shortstop',
  '5/F5': 'Flyout to third baseman',
  '9/F9': 'Flyout to right fielder',
  '4/F4': 'Flyout to second baseman',
  '1/F1': 'Flyout to pitcher',
  '2/F2': 'Flyout to catcher',
  'K': 'Struck out',
  'W': 'Walk',
  'IW': 'Intentional walk',
  'HP': 'Hit by pitch',
  'S7': 'Single to left field',
  'S8': 'Single to center field',
  'S9': 'Single to right field',
  'D7': 'Double to left field',
  'D8': 'Double to center field',
  'D9': 'Double to right field',
  'T7': 'Triple to left field',
  'T8': 'Triple to center field',
  'T9': 'Triple to right field',
  'HR7': 'Home run to left field',
  'HR8': 'Home run to center field',
  'HR9': 'Home run to right field'
};

/**
 * Game types
 */
export const GAME_TYPES = {
  REPLAY: 'replay',
  SIMULATION: 'simulation'
} as const;

/**
 * Error status codes
 */
export const ERROR_STATUS_CODES = {
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500
} as const;

/**
 * Default values for baseball state
 */
export const DEFAULT_VALUES = {
  INNING: 1,
  OUTS: 0,
  TOP_INNING: true,
  RUNS: 0
} as const;