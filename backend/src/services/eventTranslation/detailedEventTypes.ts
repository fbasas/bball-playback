/**
 * Detailed types and interfaces for the enhanced event translation system
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
  'S': 'Single',
  'D': 'Double',
  'T': 'Triple',
  'HR': 'Home run',
  'K': 'Struck out',
  'G': 'Groundout',
  'F': 'Flyout',
  'L': 'Lineout',
  'P': 'Popup',
  'W': 'Walk',
  'IW': 'Intentional walk',
  'HP': 'Hit by pitch',
  'E': 'Error by',
  'FC': 'Reached on a fielder\'s choice',
  'SB': 'Stole',
  'CS': 'Caught stealing',
  'PO': 'Picked off',
  'POCS': 'Picked off and caught stealing',
  'WP': 'Wild pitch',
  'PB': 'Passed ball',
  'BK': 'Balk',
  'DGR': 'Ground rule double',
  'NP': 'No play'
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
 * Fielder role in a play
 */
export type FielderRole = 'primary' | 'assist' | 'error' | 'putout';

/**
 * Fielder information
 */
export interface FielderInfo {
  position: number;
  role: FielderRole;
}

/**
 * Location information
 */
export interface LocationInfo {
  zone: string;  // Infield, outfield, etc.
  direction: string;  // Left, center, right, etc.
  depth: string;  // Deep, medium, shallow, etc.
  trajectory: string;  // Ground ball, fly ball, line drive, etc.
}

/**
 * Base running information
 */
export interface BaseRunningInfo {
  runner: string;  // Runner ID or position
  fromBase: string;  // 1, 2, 3, H
  toBase: string;  // 1, 2, 3, H
  isOut?: boolean;
  outNumber?: number;
  fielders?: number[];  // Fielders involved in the out
}

/**
 * Interface for a detailed baseball event
 */
export interface DetailedBaseballEvent {
  // Primary event
  primaryEventType: string;  // S, D, T, HR, K, etc.
  
  // Fielders involved
  fielders: FielderInfo[];
  
  // Location information
  location: LocationInfo;
  
  // Base advancements
  baseRunning: BaseRunningInfo[];
  
  // Additional information
  rbi?: number;
  isOut: boolean;
  outCount: number;
  isDoublePlay: boolean;
  isTriplePlay: boolean;
  isFieldersChoice: boolean;
  isError: boolean;
  
  // Raw event data
  rawEvent: string;
}

/**
 * Simple interface for a parsed event (for backward compatibility)
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