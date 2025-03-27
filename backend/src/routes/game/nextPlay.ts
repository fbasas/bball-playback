import { Request, RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';
import { PlayData, PlayDataResult } from '../../../../common/types/PlayData';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateNextPlayPrompt } from '../../services/prompts';
import { detectAndSaveLineupChanges, getLineupStateForPlay } from '../../services/game/lineupTracking';
import { translateEvent } from '../../services/eventTranslation';
import {
    fetchFirstPlay,
    generateInitializationCompletion,
    initializeLineupTracking,
    constructInitialGameState
} from '../../services/game/gameInitialization';

interface RequestParams {
    gameId: string;
    sessionId: string;
    currentPlay: number;
    skipLLM: boolean;
}


const validateRequestInput = (gameId: string, sessionId: string, currentPlay: number): void => {
    if (!gameId) {
        throw new Error('Game ID is required');
    }
    if (!sessionId) {
        throw new Error('Session ID header is required');
    }
    if (isNaN(currentPlay)) {
        throw new Error('Current play index is required and must be a number');
    }
};

const fetchPlayData = async (gameId: string, currentPlay: number): Promise<PlayDataResult> => {
    const currentPlayData = await db('plays')
        .where({ gid: gameId, pn: currentPlay })
        .first();
    
    if (!currentPlayData) {
        throw new Error('Current play not found for the specified game ID');
    }
    
    if (!currentPlayData.inning || currentPlayData.top_bot === undefined || 
        currentPlayData.outs_pre === undefined || currentPlayData.batteam === undefined ||
        currentPlayData.pitteam === undefined) {
        throw new Error('Missing required data in current play');
    }
    
    const nextPlayData = await db('plays')
        .where({ gid: gameId })
        .where('pn', '>', currentPlay)
        .orderBy('pn', 'asc')
        .first();
    
    if (!nextPlayData) {
        throw new Error('No more plays found for the specified game ID');
    }
    
    if (!nextPlayData.inning || nextPlayData.top_bot === undefined ||
        nextPlayData.outs_pre === undefined) {
        throw new Error('Missing required data in next play');
    }
    
    // Check for the event field
    if (!nextPlayData.event) {
        throw new Error('Event data not found for the specified play');
    }
    
    return { currentPlayData, nextPlayData };
};

const createInitialBaseballState = (
    gameId: string, 
    sessionId: string, 
    currentPlay: number, 
    currentPlayData: PlayData
): BaseballState => ({
    ...createEmptyBaseballState(),
    gameId,
    sessionId,
    currentPlay,
    gameType: 'replay',
    game: {
        ...createEmptyBaseballState().game,
        inning: currentPlayData.inning,
        isTopInning: currentPlayData.top_bot === 0,
        outs: currentPlayData.outs_pre
    },
    home: {
        ...createEmptyBaseballState().home,
        id: currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam
    },
    visitors: {
        ...createEmptyBaseballState().visitors,
        id: currentPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam
    }
});

const processLineupState = async (
    gameId: string,
    sessionId: string,
    currentPlay: number,
    currentState: BaseballState,
    currentPlayData: PlayData
): Promise<BaseballState> => {
    const lineupState = await getLineupStateForPlay(gameId, sessionId, currentPlay);
    
    if (!lineupState) {
        console.warn(`No lineup state found for game ${gameId}, play ${currentPlay}. Using basic state.`);
        return currentState;
    }

    const playerIds = lineupState.players.map(p => p.playerId);
    const players = await db('allplayers')
        .whereIn('id', playerIds)
        .select('id', 'first', 'last');
    
    const playerMap = new Map();
    players.forEach(player => {
        playerMap.set(player.id, {
            firstName: player.first || '',
            lastName: player.last || ''
        });
    });
    
    const homeTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.home.id);
    const visitingTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.visitors.id);
    
    const homeLineup = homeTeamPlayers
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map(p => {
            const player = playerMap.get(p.playerId);
            return {
                position: p.position,
                firstName: player?.firstName || '',
                lastName: player?.lastName || '',
                retrosheet_id: p.playerId
            };
        });
    
    const visitingLineup = visitingTeamPlayers
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map(p => {
            const player = playerMap.get(p.playerId);
            return {
                position: p.position,
                firstName: player?.firstName || '',
                lastName: player?.lastName || '',
                retrosheet_id: p.playerId
            };
        });
    
    const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
    const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
    const homeBatter = homeTeamPlayers.find(p => p.isCurrentBatter);
    const visitingBatter = visitingTeamPlayers.find(p => p.isCurrentBatter);
    
    console.log(`[NEXTPLAY] Home pitcher: ${homePitcher ? homePitcher.playerId : 'not found'}`);
    console.log(`[NEXTPLAY] Visiting pitcher: ${visitingPitcher ? visitingPitcher.playerId : 'not found'}`);

    if (!homePitcher && currentPlayData.top_bot === 0) {
        console.log(`[NEXTPLAY] Using pitcher from play data for home team: ${currentPlayData.pitcher}`);
        if (!playerMap.has(currentPlayData.pitcher)) {
            const pitcher = await db('allplayers')
                .where({ id: currentPlayData.pitcher })
                .first();
            if (pitcher) {
                playerMap.set(currentPlayData.pitcher, {
                    firstName: pitcher.first || '',
                    lastName: pitcher.last || ''
                });
                console.log(`[NEXTPLAY] Added pitcher ${currentPlayData.pitcher} to player map: ${pitcher.first} ${pitcher.last}`);
            }
        }
    }
    
    if (!visitingPitcher && currentPlayData.top_bot === 1) {
        console.log(`[NEXTPLAY] Using pitcher from play data for visiting team: ${currentPlayData.pitcher}`);
        if (!playerMap.has(currentPlayData.pitcher)) {
            const pitcher = await db('allplayers')
                .where({ id: currentPlayData.pitcher })
                .first();
            if (pitcher) {
                playerMap.set(currentPlayData.pitcher, {
                    firstName: pitcher.first || '',
                    lastName: pitcher.last || ''
                });
                console.log(`[NEXTPLAY] Added pitcher ${currentPlayData.pitcher} to player map: ${pitcher.first} ${pitcher.last}`);
            }
        }
    }
    
    // Calculate the current pitcher and batter values
    const homePitcherName = homePitcher
        ? `${playerMap.get(homePitcher.playerId)?.firstName || ''} ${playerMap.get(homePitcher.playerId)?.lastName || ''}`.trim()
        : (currentPlayData.top_bot === 0 ? `${playerMap.get(currentPlayData.pitcher)?.firstName || ''} ${playerMap.get(currentPlayData.pitcher)?.lastName || ''}`.trim() : '');
    
    const visitingPitcherName = visitingPitcher
        ? `${playerMap.get(visitingPitcher.playerId)?.firstName || ''} ${playerMap.get(visitingPitcher.playerId)?.lastName || ''}`.trim()
        : (currentPlayData.top_bot === 1 ? `${playerMap.get(currentPlayData.pitcher)?.firstName || ''} ${playerMap.get(currentPlayData.pitcher)?.lastName || ''}`.trim() : '');
    
    const homeBatterName = homeBatter
        ? `${playerMap.get(homeBatter.playerId)?.firstName || ''} ${playerMap.get(homeBatter.playerId)?.lastName || ''}`.trim()
        : '';
    
    const visitingBatterName = visitingBatter
        ? `${playerMap.get(visitingBatter.playerId)?.firstName || ''} ${playerMap.get(visitingBatter.playerId)?.lastName || ''}`.trim()
        : '';
    
    return {
        ...currentState,
        home: {
            ...currentState.home,
            lineup: homeLineup,
            currentPitcher: homePitcherName,
            currentBatter: homeBatterName
        },
        visitors: {
            ...currentState.visitors,
            lineup: visitingLineup,
            currentPitcher: visitingPitcherName,
            currentBatter: visitingBatterName
        }
    };
};

const generatePlayCompletion = async (
    currentState: BaseballState,
    nextPlay: PlayData,
    currentPlay: number,
    skipLLM: boolean,
    gameId: string
): Promise<string[]> => {
    const prompt = generateNextPlayPrompt(currentState, nextPlay, currentPlay);
    
    const completionText = skipLLM
        ? "This is a dummy response for testing purposes. LLM calls are being skipped."
        : await generateCompletion(prompt, gameId);
    
    return completionText
        .replace(/([.!?])\s+/g, '$1\n')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => line.trim());
};

/**
 * Get the next play in a game sequence
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
 */
export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';

    try {
        // Basic validation
        if (!gameId) {
            throw new Error('Game ID is required');
        }
        if (!sessionId) {
            throw new Error('Session ID header is required');
        }
        if (isNaN(currentPlay)) {
            throw new Error('Current play index is required and must be a number');
        }

        // Handle initialization (currentPlay === 0)
        if (currentPlay === 0) {
            console.log(`[NEXTPLAY] Initializing game ${gameId} with currentPlay=0`);
            
            // Fetch the first play
            const firstPlay = await fetchFirstPlay(gameId);
            
            // Generate initialization text
            const logEntries = await generateInitializationCompletion(gameId, sessionId, skipLLM);
            
            // Initialize lineup tracking
            await initializeLineupTracking(gameId, sessionId);
            
            // Construct initial game state
            const gameState = await constructInitialGameState(gameId, sessionId, firstPlay, logEntries);
            
            // Convert to SimplifiedBaseballState
            const simplifiedState: SimplifiedBaseballState = {
                gameId: gameState.gameId,
                sessionId: gameState.sessionId,
                game: {
                    inning: gameState.game.inning,
                    isTopInning: gameState.game.isTopInning,
                    outs: gameState.game.outs,
                    log: gameState.game.log,
                    onFirst: gameState.game.onFirst,
                    onSecond: gameState.game.onSecond,
                    onThird: gameState.game.onThird
                },
                home: {
                    id: gameState.home.id,
                    displayName: gameState.home.displayName,
                    shortName: gameState.home.shortName,
                    currentBatter: null,
                    currentPitcher: null,
                    nextBatter: gameState.home.currentBatter || null,
                    nextPitcher: gameState.home.currentPitcher || null
                },
                visitors: {
                    id: gameState.visitors.id,
                    displayName: gameState.visitors.displayName,
                    shortName: gameState.visitors.shortName,
                    currentBatter: null,
                    currentPitcher: null,
                    nextBatter: gameState.visitors.currentBatter || null,
                    nextPitcher: gameState.visitors.currentPitcher || null
                },
                currentPlay: firstPlay.pn,
                playDescription: undefined, // No play description for initialization
                eventString: firstPlay.event // Include event string for the first play
            };
            
            res.json(simplifiedState);
            return;
        }
        
        // Regular nextPlay logic for currentPlay > 0
        validateRequestInput(gameId, sessionId, currentPlay);
        
        const { currentPlayData, nextPlayData } = await fetchPlayData(gameId, currentPlay);
        let currentState = createInitialBaseballState(gameId, sessionId, currentPlay, currentPlayData);
        currentState = await processLineupState(gameId, sessionId, currentPlay, currentState, currentPlayData);
        
        const logEntries = await generatePlayCompletion(currentState, nextPlayData, currentPlay, skipLLM, gameId);
        
        // Generate play description using the event translation service
        let playDescription: string | undefined;
        try {
            // We've already checked that nextPlayData.event exists in fetchPlayData
            playDescription = translateEvent(nextPlayData.event!);
            console.log(`[NEXTPLAY] Generated play description: ${playDescription}`);
        } catch (error) {
            console.error('Error translating event:', error instanceof Error ? error.message : error);
            throw new Error('Failed to translate event data');
        }
        
        // Create a simplified response
        const simplifiedState: SimplifiedBaseballState = {
            gameId: currentState.gameId,
            sessionId: currentState.sessionId,
            game: {
                inning: nextPlayData.inning,
                isTopInning: nextPlayData.top_bot === 0,
                outs: nextPlayData.outs_pre,
                log: logEntries,
                onFirst: nextPlayData.br1_pre || '',
                onSecond: nextPlayData.br2_pre || '',
                onThird: nextPlayData.br3_pre || ''
            },
            home: {
                id: nextPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam,
                displayName: currentState.home.displayName,
                shortName: currentState.home.shortName,
                currentBatter: currentState.home.currentBatter,
                currentPitcher: currentState.home.currentPitcher,
                nextBatter: nextPlayData.top_bot === 1 ? nextPlayData.batter || null : null,
                nextPitcher: nextPlayData.top_bot === 0 ? nextPlayData.pitcher || null : null
            },
            visitors: {
                id: nextPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam,
                displayName: currentState.visitors.displayName,
                shortName: currentState.visitors.shortName,
                currentBatter: currentState.visitors.currentBatter,
                currentPitcher: currentState.visitors.currentPitcher,
                nextBatter: nextPlayData.top_bot === 0 ? nextPlayData.batter || null : null,
                nextPitcher: nextPlayData.top_bot === 1 ? nextPlayData.pitcher || null : null
            },
            currentPlay: nextPlayData.pn,
            playDescription,
            eventString: nextPlayData.event
        };
        
        // No debug logging in production code
        
        try {
            console.log(`[NEXTPLAY] Processing lineup changes for game ${gameId}, from play ${currentPlay} to ${nextPlayData.pn}`);
            console.log(`[NEXTPLAY] Current play data: Inning ${currentPlayData.inning} (${currentPlayData.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${currentPlayData.batter}, Pitcher: ${currentPlayData.pitcher}`);
            console.log(`[NEXTPLAY] Next play data: Inning ${nextPlayData.inning} (${nextPlayData.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${nextPlayData.batter}, Pitcher: ${nextPlayData.pitcher}`);
            
            const lineupStateId = await detectAndSaveLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
            
            if (lineupStateId) {
                console.log(`[NEXTPLAY] Lineup changes detected and saved with state ID: ${lineupStateId}`);
                
                // Get the updated lineup state
                const updatedLineupState = await getLineupStateForPlay(gameId, sessionId, nextPlayData.pn);
                
                if (updatedLineupState) {
                    console.log(`[NEXTPLAY] Retrieved updated lineup state for play ${nextPlayData.pn}`);
                    
                    // Get player names
                    const playerIds = updatedLineupState.players.map(p => p.playerId);
                    const players = await db('allplayers')
                        .whereIn('id', playerIds)
                        .select('id', 'first', 'last');
                    
                    const playerMap = new Map();
                    players.forEach(player => {
                        playerMap.set(player.id, {
                            firstName: player.first || '',
                            lastName: player.last || ''
                        });
                    });
                    
                    // Get home and visiting team players
                    const homeTeamId = nextPlayData.top_bot === 0 ? nextPlayData.pitteam : nextPlayData.batteam;
                    const visitingTeamId = nextPlayData.top_bot === 0 ? nextPlayData.batteam : nextPlayData.pitteam;
                    
                    const homeTeamPlayers = updatedLineupState.players.filter(p => p.teamId === homeTeamId);
                    const visitingTeamPlayers = updatedLineupState.players.filter(p => p.teamId === visitingTeamId);
                    
                    // Get current batters and pitchers
                    const homeBatter = homeTeamPlayers.find(p => p.isCurrentBatter);
                    const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
                    const visitingBatter = visitingTeamPlayers.find(p => p.isCurrentBatter);
                    const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
                    
                    // Update the simplified state with the current batters and pitchers
                    if (homeBatter) {
                        const player = playerMap.get(homeBatter.playerId);
                        simplifiedState.home.currentBatter = player ? `${player.firstName} ${player.lastName}`.trim() : null;
                    }
                    
                    if (homePitcher) {
                        const player = playerMap.get(homePitcher.playerId);
                        simplifiedState.home.currentPitcher = player ? `${player.firstName} ${player.lastName}`.trim() : null;
                    }
                    
                    if (visitingBatter) {
                        const player = playerMap.get(visitingBatter.playerId);
                        simplifiedState.visitors.currentBatter = player ? `${player.firstName} ${player.lastName}`.trim() : null;
                    }
                    
                    if (visitingPitcher) {
                        const player = playerMap.get(visitingPitcher.playerId);
                        simplifiedState.visitors.currentPitcher = player ? `${player.firstName} ${player.lastName}`.trim() : null;
                    }
                    
                    // No debug logging in production code
                }
            } else {
                console.log(`[NEXTPLAY] No lineup changes detected or saved`);
            }
        } catch (error: unknown) {
            console.error('Error tracking lineup changes:', error instanceof Error ? error.message : error);
        }
        
        res.json(simplifiedState);
        } catch (error: unknown) {
            console.error('Error:', error);
            const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(status).json({ error: message });
    }
};
