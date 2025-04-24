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
    getErrorStatusCode, 
    createSimplifiedState, 
    updateNextBatterAndPitcher,
    isHomeTeam
} from '../../utils/GameUtils';
import { 
    EXPECTED_EVENT_MAP, 
    DEFAULT_ANNOUNCER_STYLE 
} from '../../constants/GameConstants';
import { 
    ResourceNotFoundError, 
    DatabaseError, 
    EventTranslationError 
} from '../../types/errors/GameErrors';

/**
 * Get the next play in a game sequence
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
 */
export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';
    const announcerStyle = (req.query.announcerStyle as AnnouncerStyle) || DEFAULT_ANNOUNCER_STYLE;

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
            
            // Initialize runs
            simplifiedState.home.runs = 0;
            simplifiedState.visitors.runs = 0;
            
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
        let currentState = BaseballStateService.createInitialBaseballState(
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
        
        // Generate detailed play-by-play commentary
        const logEntries = await CommentaryService.generateDetailedPlayCompletion(
            currentState,
            nextPlayData,
            currentPlay,
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
        
        // Calculate scores
        const { homeScoreAfterPlay, visitorScoreAfterPlay } = await ScoreService.calculateScore(
            gameId, 
            currentPlay, 
            currentPlayData, 
            nextPlayData
        );
        
        // Determine home team ID
        const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam;

        // Create a simplified response
        const simplifiedState = createSimplifiedState(currentState, nextPlayData, playDescription);
        
        // Set log entries
        simplifiedState.game.log = logEntries;
        
        // Update scores
        if (isHomeTeam(nextPlayData, simplifiedState.home.id)) {
            simplifiedState.home.runs = homeScoreAfterPlay;
            simplifiedState.visitors.runs = visitorScoreAfterPlay;
        } else {
            simplifiedState.home.runs = visitorScoreAfterPlay;
            simplifiedState.visitors.runs = homeScoreAfterPlay;
        }
        
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
            console.error('Error processing lineup changes:', error);
        }
        
        res.json(simplifiedState);
    } catch (error: unknown) {
        const status = getErrorStatusCode(error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        
        console.error(`Error in getNextPlay: ${message}`, error);
        res.status(status).json({ error: message });
    }
};
