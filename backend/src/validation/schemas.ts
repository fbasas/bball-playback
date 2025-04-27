import { z } from 'zod';

/**
 * Base schemas for common types
 */

// Team schema
export const TeamSchema = z.object({
  id: z.string().min(1, "Team ID is required"),
  displayName: z.string().min(1, "Display name is required"),
  shortName: z.string().min(1, "Short name is required")
});

// Player schema
export const PlayerSchema = z.object({
  position: z.string().min(1, "Position is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  retrosheet_id: z.string().min(1, "Retrosheet ID is required")
});

// Team stats schema
export const TeamStatsSchema = z.object({
  innings: z.array(z.number()),
  runs: z.number().int().nonnegative(),
  hits: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative()
});

// Team state schema
export const TeamStateSchema = z.object({
  id: z.string().min(1, "Team ID is required"),
  displayName: z.string().min(1, "Display name is required"),
  shortName: z.string().min(1, "Short name is required"),
  currentPitcher: z.string().min(1, "Current pitcher ID is required"),
  lineup: z.array(PlayerSchema),
  stats: TeamStatsSchema,
  currentBatter: z.string().nullable()
});

// Game state schema
export const GameStateSchema = z.object({
  inning: z.number().int().positive(),
  isTopInning: z.boolean(),
  outs: z.number().int().min(0).max(3),
  log: z.array(z.string()),
  onFirst: z.string(),
  onSecond: z.string(),
  onThird: z.string()
});

// Baseball state schema
export const BaseballStateSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  game: GameStateSchema,
  home: TeamStateSchema,
  visitors: TeamStateSchema,
  currentPlay: z.number().int().nonnegative(),
  gameType: z.enum(['replay', 'simulation'])
});

/**
 * API Request/Response schemas
 */

// CreateGame endpoint schemas
export const CreateGameRequestSchema = z.object({
  homeTeamId: z.string().min(1, "Home team ID is required"),
  visitingTeamId: z.string().min(1, "Visiting team ID is required")
});

export const CreateGameResponseSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  gameState: BaseballStateSchema
});

// PlayData schema
export const PlayDataSchema = z.object({
  gid: z.string().min(1, "Game ID is required"),
  pn: z.number().int().nonnegative(),
  inning: z.number().int().positive(),
  top_bot: z.number().int().min(0).max(1),
  batteam: z.string().min(1, "Batting team ID is required"),
  pitteam: z.string().min(1, "Pitching team ID is required"),
  batter: z.string().min(1, "Batter ID is required"),
  pitcher: z.string().min(1, "Pitcher ID is required"),
  outs_pre: z.number().int().min(0).max(3),
  outs_post: z.number().int().min(0).max(3),
  br1_pre: z.string().optional(),
  br2_pre: z.string().optional(),
  br3_pre: z.string().optional(),
  f2: z.string().optional(),
  f3: z.string().optional(),
  f4: z.string().optional(),
  f5: z.string().optional(),
  f6: z.string().optional(),
  f7: z.string().optional(),
  f8: z.string().optional(),
  f9: z.string().optional(),
  event: z.string().optional(),
  runs: z.number().int().nonnegative().nullable().optional()
});

// PlayDataResult schema
export const PlayDataResultSchema = z.object({
  currentPlayData: PlayDataSchema,
  nextPlayData: PlayDataSchema
});

// LineupPlayer schema
export const LineupPlayerSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  teamId: z.string().min(1, "Team ID is required"),
  position: z.string().min(1, "Position is required"),
  battingOrder: z.number().int().min(1).max(9),
  isCurrentPitcher: z.boolean(),
  isCurrentBatter: z.boolean()
});

// LineupState schema
export const LineupStateSchema = z.object({
  id: z.number().int().positive(),
  gameId: z.string().min(1, "Game ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  playIndex: z.number().int().nonnegative(),
  timestamp: z.string().min(1, "Timestamp is required"),
  players: z.array(LineupPlayerSchema)
});

// LineupChange schema
export const LineupChangeSchema = z.object({
  id: z.number().int().positive(),
  gameId: z.string().min(1, "Game ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  playIndex: z.number().int().nonnegative(),
  timestamp: z.string().min(1, "Timestamp is required"),
  changes: z.string().min(1, "Changes are required")
});

// LineupHistoryResponse schema
export const LineupHistoryResponseSchema = z.object({
  changes: z.array(LineupChangeSchema)
});

// PlayerChange schema
export const PlayerChangeSchema = z.object({
  playerId: z.string().min(1, "Player ID is required"),
  playerName: z.string().min(1, "Player name is required"),
  teamId: z.string().min(1, "Team ID is required"),
  position: z.string().optional()
});

// Substitution schema
export const SubstitutionSchema = z.object({
  type: z.enum(['PITCHING_CHANGE', 'PINCH_HITTER', 'PINCH_RUNNER', 'FIELDING_CHANGE']),
  playerIn: PlayerChangeSchema,
  playerOut: PlayerChangeSchema,
  description: z.string().min(1, "Description is required")
});

// SubstitutionResponse schema
export const SubstitutionResponseSchema = z.object({
  hasPitchingChange: z.boolean(),
  hasPinchHitter: z.boolean(),
  hasPinchRunner: z.boolean(),
  substitutions: z.array(SubstitutionSchema)
});

// SimplifiedBaseballState schema
export const SimplifiedBaseballStateSchema = z.object({
  gameId: z.string().min(1, "Game ID is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  game: z.object({
    inning: z.number().int().positive(),
    isTopInning: z.boolean(),
    outs: z.number().int().min(0).max(3),
    log: z.array(z.string()),
    onFirst: z.string(),
    onSecond: z.string(),
    onThird: z.string()
  }),
  home: z.object({
    id: z.string().min(1, "Home team ID is required"),
    displayName: z.string().min(1, "Display name is required"),
    shortName: z.string().min(1, "Short name is required"),
    currentBatter: z.string().nullable(),
    currentPitcher: z.string().nullable(),
    nextBatter: z.string().nullable(),
    nextPitcher: z.string().nullable(),
    runs: z.number().int().nonnegative()
  }),
  visitors: z.object({
    id: z.string().min(1, "Visiting team ID is required"),
    displayName: z.string().min(1, "Display name is required"),
    shortName: z.string().min(1, "Short name is required"),
    currentBatter: z.string().nullable(),
    currentPitcher: z.string().nullable(),
    nextBatter: z.string().nullable(),
    nextPitcher: z.string().nullable(),
    runs: z.number().int().nonnegative()
  }),
  currentPlay: z.number().int().nonnegative(),
  playDescription: z.string().optional(),
  eventString: z.string().optional()
});