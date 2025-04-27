import { z } from 'zod';

/**
 * Schema for validating query parameters in the nextPlay route
 */
export const NextPlayQuerySchema = z.object({
  currentPlay: z.string()
    .refine(val => !isNaN(parseInt(val)), {
      message: "currentPlay must be a valid number"
    })
    .transform(val => parseInt(val))
    .refine(val => val >= 0, {
      message: "currentPlay must be a non-negative integer"
    }),
  skipLLM: z.enum(['true', 'false']).optional()
    .transform(val => val === 'true'),
  announcerStyle: z.enum(['classic', 'modern', 'enthusiastic', 'poetic']).optional()
});

/**
 * Schema for validating session ID in headers
 */
export const SessionIdHeaderSchema = z.object({
  'session-id': z.string().uuid({
    message: "Invalid session ID format. Must be a valid UUID."
  })
});

/**
 * Schema for validating game ID in route parameters
 */
export const GameIdParamSchema = z.object({
  gameId: z.string().min(1, {
    message: "Game ID is required"
  })
});

/**
 * Schema for validating play index in route parameters
 */
export const PlayIndexParamSchema = z.object({
  playIndex: z.string()
    .refine(val => !isNaN(parseInt(val)), {
      message: "Play index must be a valid number"
    })
    .transform(val => parseInt(val))
    .refine(val => val >= 0, {
      message: "Play index must be a non-negative integer"
    })
});

/**
 * Schema for validating game ID in route parameters (gid format)
 */
export const GidParamSchema = z.object({
  gid: z.string().min(1, {
    message: "Game ID (gid) is required"
  })
});

/**
 * Schema for validating lineup history query parameters
 */
export const LineupHistoryQuerySchema = z.object({
  limit: z.string().optional()
    .refine(val => !val || !isNaN(parseInt(val)), {
      message: "limit must be a valid number"
    })
    .transform(val => val ? parseInt(val) : undefined)
    .refine(val => !val || val > 0, {
      message: "limit must be a positive integer"
    }),
  offset: z.string().optional()
    .refine(val => !val || !isNaN(parseInt(val)), {
      message: "offset must be a valid number"
    })
    .transform(val => val ? parseInt(val) : undefined)
    .refine(val => !val || val >= 0, {
      message: "offset must be a non-negative integer"
    })
});