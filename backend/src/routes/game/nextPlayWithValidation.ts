import { RequestHandler, Router } from 'express';
import { AnnouncerStyle } from '../../services/game/commentary/CommentaryService';
import { GamePlaybackService } from '../../services/game/playback';
import { DEFAULT_ANNOUNCER_STYLE } from '../../constants/GameConstants';
import { contextLogger } from '../../core/logging';
import {
    validateParams,
    validateQuery,
    validateHeaders,
    GameIdParamSchema,
    NextPlayQuerySchema,
    SessionIdHeaderSchema
} from '../../validation';

/**
 * Get the next play in a game sequence with AI-generated commentary
 *
 * This endpoint retrieves the next play in a baseball game sequence and generates
 * detailed play-by-play commentary using AI. It handles various aspects of game
 * progression including:
 * - Tracking inning, outs, and runners
 * - Updating scores and statistics
 * - Detecting and processing lineup changes
 * - Generating play descriptions and commentary
 * - Translating baseball event codes into human-readable descriptions
 *
 * The endpoint supports different announcer styles for commentary and can skip
 * the AI generation for testing purposes.
 *
 * @route GET /api/game/next/:gameId
 * @param {string} gameId - The ID of the game (path parameter)
 * @param {number} currentPlay - The index of the current play (query parameter)
 * @param {string} skipLLM - Set to 'true' to skip LLM calls for testing (optional query parameter)
 * @param {string} announcerStyle - Style of announcer for commentary: 'classic', 'modern', 'enthusiastic', 'poetic' (optional query parameter)
 * @param {string} session-id - The session identifier (header)
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
 *
 * @example
 * // Request
 * GET /api/game/next/CIN201904150?currentPlay=42&announcerStyle=enthusiastic
 * Headers:
 *   session-id: 123e4567-e89b-12d3-a456-426614174000
 *
 * // Response (simplified)
 * {
 *   "gameId": "CIN201904150",
 *   "sessionId": "123e4567-e89b-12d3-a456-426614174000",
 *   "game": {
 *     "inning": 5,
 *     "isTopInning": true,
 *     "outs": 2,
 *     "log": ["And here comes Kris Bryant to the plate with a runner on first...", "Bryant swings and hits a fly ball to center field..."],
 *     "onFirst": "Javier Baez",
 *     "onSecond": "",
 *     "onThird": ""
 *   },
 *   "home": {
 *     "id": "CIN",
 *     "displayName": "Cincinnati Reds",
 *     "shortName": "Reds",
 *     "currentBatter": null,
 *     "currentPitcher": "Luis Castillo",
 *     "nextBatter": "Joey Votto",
 *     "nextPitcher": null,
 *     "runs": 2
 *   },
 *   "visitors": {
 *     "id": "CHN",
 *     "displayName": "Chicago Cubs",
 *     "shortName": "Cubs",
 *     "currentBatter": "Kris Bryant",
 *     "currentPitcher": null,
 *     "nextBatter": "Anthony Rizzo",
 *     "nextPitcher": null,
 *     "runs": 3
 *   },
 *   "currentPlay": 43,
 *   "playDescription": "Fly out to center field",
 *   "eventString": "8/F"
 * }
 */
export const getNextPlay: RequestHandler = async (req, res, next) => {
    const routeLogger = contextLogger({
        route: 'getNextPlay',
        gameId: req.params.gameId,
        sessionId: req.headers['session-id'] as string
    });

    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';
    const announcerStyle = (req.query.announcerStyle as AnnouncerStyle) || DEFAULT_ANNOUNCER_STYLE;

    routeLogger.info('Processing next play request', {
        currentPlay,
        skipLLM,
        announcerStyle
    });

    try {
        const result = await GamePlaybackService.getNextPlay(
            gameId,
            sessionId,
            currentPlay,
            { skipLLM, announcerStyle }
        );

        routeLogger.info('Successfully processed next play', {
            currentPlay: result.currentPlay,
            inning: result.game.inning,
            isTopInning: result.game.isTopInning
        });

        res.json(result);
    } catch (error: unknown) {
        next(error);
    }
};

/**
 * Create the router for the nextPlay endpoint
 */
export const nextPlayRouter = Router();

// Apply validation middleware before the route handler
nextPlayRouter.get(
    '/:gameId',
    validateParams(GameIdParamSchema),
    validateQuery(NextPlayQuerySchema),
    validateHeaders(SessionIdHeaderSchema),
    getNextPlay
);