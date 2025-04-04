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
        .select('*', 'runs') // Select the runs column
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

    // Check for runs field (should exist based on schema)
    if (nextPlayData.runs === undefined || nextPlayData.runs === null) {
        console.warn(`[NEXTPLAY] Warning: Runs field missing or null for play ${nextPlayData.pn}. Assuming 0 runs.`);
        nextPlayData.runs = 0; // Default to 0 if missing
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
    currentPlayData: PlayData,
    nextPlayData: PlayData // Add nextPlayData here
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

    // Helper to get player name, fetching if not in map
    const getPlayerNameFromMap = async (playerId: string | null | undefined): Promise<string | null> => {
        if (!playerId) return null;
        
        let player = playerMap.get(playerId);
        if (!player) {
            const dbPlayer = await db('allplayers')
                .where({ id: playerId })
                .select('id', 'first', 'last')
                .first();
            if (dbPlayer) {
                player = {
                    firstName: dbPlayer.first || '',
                    lastName: dbPlayer.last || ''
                };
                playerMap.set(playerId, player); // Cache for future use
                console.log(`[NEXTPLAY] Fetched and cached runner ${playerId}: ${player.firstName} ${player.lastName}`);
            } else {
                 console.warn(`[NEXTPLAY] Could not find player details for runner ID: ${playerId}`);
                 return playerId; // Return ID if name not found
            }
        }
        return `${player.firstName} ${player.lastName}`.trim();
    };
    
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

    // Get runner names using the helper
    const runner1Name = await getPlayerNameFromMap(nextPlayData.br1_pre);
    const runner2Name = await getPlayerNameFromMap(nextPlayData.br2_pre);
    const runner3Name = await getPlayerNameFromMap(nextPlayData.br3_pre);

    return {
        ...currentState,
        game: { // Update game state with runner names
             ...currentState.game,
             onFirst: runner1Name || '',
             onSecond: runner2Name || '',
             onThird: runner3Name || ''
        },
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
                    nextPitcher: gameState.home.currentPitcher || null,
                    runs: 0 // Initialize home runs
                },
                visitors: {
                    id: gameState.visitors.id,
                    displayName: gameState.visitors.displayName,
                    shortName: gameState.visitors.shortName,
                    currentBatter: null,
                    currentPitcher: null,
                    nextBatter: gameState.visitors.currentBatter || null,
                    nextPitcher: gameState.visitors.currentPitcher || null,
                    runs: 0 // Initialize visitor runs
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
        currentState = await processLineupState(gameId, sessionId, currentPlay, currentState, currentPlayData, nextPlayData); // Pass nextPlayData
        
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
        
        // --- Calculate Cumulative Score ---
        // Fetch all plays up to and including the *current* play to get score *before* next play
        const previousPlays = await db('plays')
            .select('gid', 'pn', 'top_bot', 'batteam', 'runs')
            .where({ gid: gameId })
            .where('pn', '<=', currentPlay) // Include current play
            .orderBy('pn', 'asc');

        let homeScoreBeforePlay = 0;
        let visitorScoreBeforePlay = 0;
        const homeTeamId = currentPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam; // Determine home team ID from current play

        previousPlays.forEach(play => {
            const runsOnPlay = play.runs || 0; // Default to 0 if null/undefined
            if (runsOnPlay > 0) {
                // Determine which team was batting during this play
                const isHomeBatting = play.batteam === homeTeamId;
                if (isHomeBatting) {
                    homeScoreBeforePlay += runsOnPlay;
                } else {
                    visitorScoreBeforePlay += runsOnPlay;
                }
            }
        });
        console.log(`[NEXTPLAY] Score before play ${nextPlayData.pn}: Home=${homeScoreBeforePlay}, Away=${visitorScoreBeforePlay}`);

        // Calculate score *after* the next play
        let homeScoreAfterPlay = homeScoreBeforePlay;
        let visitorScoreAfterPlay = visitorScoreBeforePlay;
        const runsOnNextPlay = nextPlayData.runs || 0;

        if (runsOnNextPlay > 0) {
            const isHomeBattingNext = nextPlayData.batteam === homeTeamId;
            if (isHomeBattingNext) {
                homeScoreAfterPlay += runsOnNextPlay;
            } else {
                visitorScoreAfterPlay += runsOnNextPlay;
            }
        }
        console.log(`[NEXTPLAY] Score after play ${nextPlayData.pn}: Home=${homeScoreAfterPlay}, Away=${visitorScoreAfterPlay} (Runs on play: ${runsOnNextPlay})`);
        // --- End Score Calculation ---

        // Create a simplified response
        const simplifiedState: SimplifiedBaseballState = {
            gameId: currentState.gameId,
            sessionId: currentState.sessionId,
            game: {
                inning: nextPlayData.inning,
                isTopInning: nextPlayData.top_bot === 0,
                outs: nextPlayData.outs_pre,
                log: logEntries,
                onFirst: currentState.game.onFirst || '', // Use name from processed state
                onSecond: currentState.game.onSecond || '', // Use name from processed state
                onThird: currentState.game.onThird || '' // Use name from processed state
            },
            home: { // Note: This object might represent the VISITING team if top_bot=0
                id: nextPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam, // This is the ACTUAL home team ID
                displayName: currentState.home.displayName, // Display names might be swapped here, consider fetching based on ID if needed
                shortName: currentState.home.shortName,     // Display names might be swapped here, consider fetching based on ID if needed
                currentBatter: currentState.home.currentBatter, // This might be the VISITING batter if top_bot=0
                currentPitcher: currentState.home.currentPitcher, // This might be the VISITING pitcher if top_bot=0
                // Assign score based on the ACTUAL home team ID determined during calculation
                runs: (nextPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam) === homeTeamId ? homeScoreAfterPlay : visitorScoreAfterPlay,
                nextBatter: nextPlayData.top_bot === 1 ? nextPlayData.batter || null : null,
                nextPitcher: nextPlayData.top_bot === 0 ? nextPlayData.pitcher || null : null
            },
            visitors: { // Note: This object might represent the HOME team if top_bot=0
                id: nextPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam, // This is the ACTUAL visitor team ID
                displayName: currentState.visitors.displayName, // Display names might be swapped here, consider fetching based on ID if needed
                shortName: currentState.visitors.shortName,     // Display names might be swapped here, consider fetching based on ID if needed
                currentBatter: currentState.visitors.currentBatter, // This might be the HOME batter if top_bot=0
                currentPitcher: currentState.visitors.currentPitcher, // This might be the HOME pitcher if top_bot=0
                 // Assign score based on the ACTUAL team ID for this slot
                 // If the ID in this slot IS the home team, assign home score, otherwise assign visitor score.
                runs: (nextPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam) === homeTeamId ? homeScoreAfterPlay : visitorScoreAfterPlay,
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
        
        // Log the final state being sent
        console.log('[NEXTPLAY] Sending simplified state:', JSON.stringify(simplifiedState, null, 2));
        res.json(simplifiedState);
        } catch (error: unknown) {
            console.error('Error:', error);
            const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(status).json({ error: message });
    }
};
