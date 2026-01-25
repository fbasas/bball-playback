import { RequestHandler, Router } from 'express';
import { PlayData } from '../../../../common/types/PlayData';
import { db } from '../../config/database';
import { translateEvent } from '../../services/eventTranslation';
import {
    fetchFirstPlay,
    generateInitializationCompletion,
    initializeLineupTracking,
    constructInitialGameState
} from '../../services/game/gameInitialization';
import { PlayDataService } from '../../services/game/playData/PlayDataService';
import { ScoreService } from '../../services/game/score/ScoreService';
import { PlayerService } from '../../services/game/player/PlayerService';
import { CommentaryService, AnnouncerStyle } from '../../services/game/commentary/CommentaryService';
import { BaseballStateService } from '../../services/game/state/BaseballStateService';
import { LineupService } from '../../services/game/lineup/LineupService';
import {
    createSimplifiedState,
    updateNextBatterAndPitcher,
    isHomeTeam
} from '../../utils/GameUtils';
import {
    EXPECTED_EVENT_MAP,
    DEFAULT_ANNOUNCER_STYLE
} from '../../constants/GameConstants';
import {
    NotFoundError,
    DatabaseError,
    EventTranslationError
} from '../../core/errors';
import { logger, contextLogger } from '../../core/logging';
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
    // Create a context-specific logger for this route
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
        // Handle initialization (currentPlay === 0)
        if (currentPlay === 0) {
            // Fetch the first play
            const firstPlay = await fetchFirstPlay(gameId);
            
            // Generate initialization text
            const logEntries = await generateInitializationCompletion(gameId, sessionId, skipLLM);
            
            // Initialize lineup tracking
            await initializeLineupTracking(gameId, sessionId);
            
            // Construct initial game state
            const gameState = await constructInitialGameState(gameId, sessionId, firstPlay, logEntries);
            
            // Convert to SimplifiedBaseballState
            const simplifiedState = createSimplifiedState(gameState, firstPlay);
            
            // Debug log the game state
            routeLogger.debug('GameState team info (initialization)', {
                home: {
                    displayName: gameState.home.displayName,
                    shortName: gameState.home.shortName
                },
                visitors: {
                    displayName: gameState.visitors.displayName,
                    shortName: gameState.visitors.shortName
                }
            });
            
            // Initialize runs
            simplifiedState.home.runs = 0;
            simplifiedState.visitors.runs = 0;
            
            // Debug log the simplified state
            routeLogger.debug('SimplifiedBaseballState team info (initialization)', {
                home: {
                    displayName: simplifiedState.home.displayName,
                    shortName: simplifiedState.home.shortName,
                    runs: simplifiedState.home.runs
                },
                visitors: {
                    displayName: simplifiedState.visitors.displayName,
                    shortName: simplifiedState.visitors.shortName,
                    runs: simplifiedState.visitors.runs
                }
            });
            
            // Set next batter and pitcher
            simplifiedState.home.nextBatter = gameState.home.currentBatter || null;
            simplifiedState.home.nextPitcher = gameState.home.currentPitcher || null;
            simplifiedState.visitors.nextBatter = gameState.visitors.currentBatter || null;
            simplifiedState.visitors.nextPitcher = gameState.visitors.currentPitcher || null;
            
            // Set current play
            simplifiedState.currentPlay = firstPlay.pn;
            
            // No play description for initialization
            simplifiedState.playDescription = undefined;
            
            // Include event string for the first play
            simplifiedState.eventString = firstPlay.event;
            
            res.json(simplifiedState);
            return;
        }
        
        // Regular nextPlay logic for currentPlay > 0
        const { currentPlayData, nextPlayData } = await PlayDataService.fetchPlayData(gameId, currentPlay);
        
        // Create initial baseball state
        let currentState = await BaseballStateService.createInitialBaseballState(
            gameId,
            sessionId,
            currentPlay,
            currentPlayData
        );
        
        // Process lineup state
        currentState = await BaseballStateService.processLineupState(
            gameId,
            sessionId,
            currentPlay,
            currentState,
            currentPlayData,
            nextPlayData
        );
        
        // Calculate scores
        const { homeScoreBeforePlay, visitorScoreBeforePlay } = await ScoreService.calculateScore(
            gameId,
            currentPlay,
            currentPlayData,
            nextPlayData
        );
        
        // Determine home team ID
        const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;

        // Update the baseball state with the calculated scores BEFORE the play
        // This ensures the stats.runs property is updated before creating the simplified state
        if (isHomeTeam(nextPlayData, currentState.home.id)) {
            currentState.home.stats.runs = homeScoreBeforePlay;
            currentState.visitors.stats.runs = visitorScoreBeforePlay;
        } else {
            currentState.home.stats.runs = visitorScoreBeforePlay;
            currentState.visitors.stats.runs = homeScoreBeforePlay;
        }
        
        // Generate detailed play-by-play commentary
        const logEntries = await CommentaryService.generateDetailedPlayCompletion(
            currentState,
            currentPlayData, // Using currentPlayData for commentary
            currentPlay, // This is now currentPlayIndex in the method signature
            skipLLM,
            gameId,
            announcerStyle
        );
        
        // Get the correct event for the current batter
        const currentBatter = currentPlayData.batter;
        const correctPlayForBatter = await PlayDataService.fetchPlayForBatter(gameId, currentBatter);
        
        // Use the correct event if found, otherwise use the current play's event
        const eventToTranslate = correctPlayForBatter?.event || currentPlayData.event || nextPlayData.event;
        
        // Generate play description using the event translation service
        let playDescription: string | undefined;
        try {
            if (eventToTranslate) {
                playDescription = translateEvent(eventToTranslate);
                
                // Double-check that the play description matches the expected event
                if (eventToTranslate in EXPECTED_EVENT_MAP && EXPECTED_EVENT_MAP[eventToTranslate] !== playDescription) {
                    playDescription = EXPECTED_EVENT_MAP[eventToTranslate];
                }
            }
        } catch (error) {
            throw new EventTranslationError('Failed to translate event data');
        }

        // Create a simplified response
        const simplifiedState = createSimplifiedState(currentState, nextPlayData, playDescription);
        
        // Debug log the simplified state
        routeLogger.debug('SimplifiedBaseballState team info', {
            home: {
                displayName: simplifiedState.home.displayName,
                shortName: simplifiedState.home.shortName,
                runs: simplifiedState.home.runs
            },
            visitors: {
                displayName: simplifiedState.visitors.displayName,
                shortName: simplifiedState.visitors.shortName,
                runs: simplifiedState.visitors.runs
            }
        });
        
        // Set log entries
        simplifiedState.game.log = logEntries;
        
        // Update next batter and pitcher
        updateNextBatterAndPitcher(simplifiedState, nextPlayData);
        
        // Set current play to next play number
        simplifiedState.currentPlay = nextPlayData.pn;
        
        // Set event string
        simplifiedState.eventString = eventToTranslate || nextPlayData.event || '';
        
        // Process lineup changes
        try {
            await LineupService.processLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
            await LineupService.updateLineupInfo(gameId, sessionId, nextPlayData, simplifiedState);
        } catch (error) {
            // Log the error but don't throw it to avoid breaking the main flow
            routeLogger.warn('Error processing lineup changes', { error });
        }
        
        routeLogger.info('Successfully processed next play', {
            currentPlay: simplifiedState.currentPlay,
            inning: simplifiedState.game.inning,
            isTopInning: simplifiedState.game.isTopInning
        });
        
        res.json(simplifiedState);
    } catch (error: unknown) {
        // Pass the error to the error handling middleware
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