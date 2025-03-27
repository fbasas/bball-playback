/**
 * Types and constants for Retrosheet event translation
 * Based on the format described at https://www.retrosheet.org/eventfile.htm
 */

/**
 * Field positions in baseball
 */
export enum FieldPosition {
  Pitcher = 1,
  Catcher = 2,
  FirstBase = 3,
  SecondBase = 4,
  ThirdBase = 5,
  Shortstop = 6,
  LeftField = 7,
  CenterField = 8,
  RightField = 9,
  Unknown = 0
}

/**
 * Map of field position numbers to readable names
 */
export const FIELD_POSITION_NAMES: Record<number, string> = {
  1: 'pitcher',
  2: 'catcher',
  3: 'first baseman',
  4: 'second baseman',
  5: 'third baseman',
  6: 'shortstop',
  7: 'left fielder',
  8: 'center fielder',
  9: 'right fielder',
  0: 'unknown fielder'
};

/**
 * Basic event types in Retrosheet format
 */
export enum BasicEventType {
  // Hit events
  Single = 'S',
  Double = 'D',
  Triple = 'T',
  HomeRun = 'HR',
  
  // Out events
  Strikeout = 'K',
  GroundOut = 'G',
  FlyOut = 'F',
  LineDrive = 'L',
  PopUp = 'P',
  
  // Other events
  Walk = 'W',
  IntentionalWalk = 'IW',
  HitByPitch = 'HP',
  Error = 'E',
  FieldersChoice = 'FC',
  
  // Base running events
  StolenBase = 'SB',
  CaughtStealing = 'CS',
  PickOff = 'PO',
  PickOffCaughtStealing = 'POCS',
  
  // Miscellaneous events
  WildPitch = 'WP',
  PassedBall = 'PB',
  Balk = 'BK',
  GroundRuleDouble = 'DGR',
  NoPlay = 'NP',
  
  // Unknown event
  Unknown = 'UNKNOWN'
}

/**
 * Descriptions for basic event types
 */
export const EVENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  'S': 'singled',
  'D': 'doubled',
  'T': 'tripled',
  'HR': 'homered',
  'K': 'struck out',
  'G': 'grounded out',
  'F': 'flied out',
  'L': 'lined out',
  'P': 'popped out',
  'W': 'walked',
  'IW': 'was intentionally walked',
  'HP': 'was hit by a pitch',
  'E': 'reached on an error by',
  'FC': 'reached on a fielder\'s choice',
  'SB': 'stole',
  'CS': 'caught stealing',
  'PO': 'picked off',
  'POCS': 'picked off and caught stealing',
  'WP': 'wild pitch',
  'PB': 'passed ball',
  'BK': 'balk',
  'DGR': 'ground rule double',
  'NP': 'no play'
};

/**
 * Base advancement codes
 */
export enum BaseAdvancement {
  First = '1',
  Second = '2',
  Third = '3',
  Home = 'H'
}

/**
 * Interface for a parsed event
 */
export interface ParsedEvent {
  eventType: string;
  fielders: number[];
  modifiers: string[];
  locations: string[];
  advances: string[];
  isOut: boolean;
  rbi?: number;
  errorType?: string;
  rawEvent: string;
}