import { RequestHandler } from 'express';
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
    validateRequestInput,
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
    EventTranslationError,
    ValidationError
} from '../../core/errors';
import { logger, contextLogger } from '../../core/logging';

/**
 * Get the next play in a game sequence
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
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
        // Basic validation
        validateRequestInput(gameId, sessionId, currentPlay);

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
        
        // Calculate scores using the optimized method
        const scoreResult = await ScoreService.calculateScoreOptimized(
            gameId,
            currentPlay,
            currentPlayData,
            nextPlayData
        );
        
        // Extract scores from the result
        const {
            homeScoreBeforePlay,
            visitorScoreBeforePlay,
            homeScoreAfterPlay,
            visitorScoreAfterPlay
        } = scoreResult;
        
        routeLogger.debug('Score calculation result', {
            homeScoreBeforePlay,
            visitorScoreBeforePlay,
            homeScoreAfterPlay,
            visitorScoreAfterPlay,
            currentPlay,
            currentPlayData: {
                pn: currentPlayData.pn,
                batter: currentPlayData.batter,
                event: currentPlayData.event,
                runs: currentPlayData.runs
            }
        });
        
        // Determine home team ID for the current play
        const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;

        // Update the baseball state with the calculated scores AFTER the play
        // This ensures the stats.runs property shows the current score after the previous play
        routeLogger.debug('Team IDs', {
            homeStateId: currentState.home.id,
            visitorStateId: currentState.visitors.id,
            nextPlayHomeTeam: isHomeTeam(nextPlayData, currentState.home.id) ? 'Yes' : 'No',
            nextPlayData: {
                batteam: nextPlayData.batteam,
                pitteam: nextPlayData.pitteam,
                top_bot: nextPlayData.top_bot
            }
        });
        
        // Use the "after" scores
        if (isHomeTeam(nextPlayData, currentState.home.id)) {
            currentState.home.stats.runs = homeScoreAfterPlay;
            currentState.visitors.stats.runs = visitorScoreAfterPlay;
            routeLogger.debug('Setting scores (home team matches)', {
                homeTeam: currentState.home.id,
                homeScore: homeScoreAfterPlay,
                visitorTeam: currentState.visitors.id,
                visitorScore: visitorScoreAfterPlay
            });
        } else {
            currentState.home.stats.runs = visitorScoreAfterPlay;
            currentState.visitors.stats.runs = homeScoreAfterPlay;
            routeLogger.debug('Setting scores (home team does not match)', {
                homeTeam: currentState.home.id,
                homeScore: visitorScoreAfterPlay,
                visitorTeam: currentState.visitors.id,
                visitorScore: homeScoreAfterPlay
            });
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
