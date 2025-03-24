import { Request, RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { PlayData, PlayDataResult } from '../../../../common/types/PlayData';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateNextPlayPrompt } from '../../services/prompts';
import { detectAndSaveLineupChanges, getLineupStateForPlay } from '../../services/game/lineupTracking';

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
    
    return {
        ...currentState,
        home: {
            ...currentState.home,
            lineup: homeLineup,
            currentPitcher: homePitcher 
                ? `${playerMap.get(homePitcher.playerId)?.firstName || ''} ${playerMap.get(homePitcher.playerId)?.lastName || ''}`.trim() 
                : (currentPlayData.top_bot === 0 ? `${playerMap.get(currentPlayData.pitcher)?.firstName || ''} ${playerMap.get(currentPlayData.pitcher)?.lastName || ''}`.trim() : ''),
            currentBatter: homeBatter 
                ? `${playerMap.get(homeBatter.playerId)?.firstName || ''} ${playerMap.get(homeBatter.playerId)?.lastName || ''}`.trim() 
                : ''
        },
        visitors: {
            ...currentState.visitors,
            lineup: visitingLineup,
            currentPitcher: visitingPitcher 
                ? `${playerMap.get(visitingPitcher.playerId)?.firstName || ''} ${playerMap.get(visitingPitcher.playerId)?.lastName || ''}`.trim() 
                : (currentPlayData.top_bot === 1 ? `${playerMap.get(currentPlayData.pitcher)?.firstName || ''} ${playerMap.get(currentPlayData.pitcher)?.lastName || ''}`.trim() : ''),
            currentBatter: visitingBatter 
                ? `${playerMap.get(visitingBatter.playerId)?.firstName || ''} ${playerMap.get(visitingBatter.playerId)?.lastName || ''}`.trim() 
                : ''
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

export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';

    try {
        validateRequestInput(gameId, sessionId, currentPlay);
        
        const { currentPlayData, nextPlayData } = await fetchPlayData(gameId, currentPlay);
        let currentState = createInitialBaseballState(gameId, sessionId, currentPlay, currentPlayData);
        currentState = await processLineupState(gameId, sessionId, currentPlay, currentState, currentPlayData);
        
        const logEntries = await generatePlayCompletion(currentState, nextPlayData, currentPlay, skipLLM, gameId);
        
        const updatedState: BaseballState = {
            ...currentState,
            game: {
                ...currentState.game,
                log: logEntries,
                inning: nextPlayData.inning,
                isTopInning: nextPlayData.top_bot === 0,
                outs: nextPlayData.outs_pre
            },
            home: {
                ...currentState.home,
                id: nextPlayData.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam,
                currentBatter: currentState.home.currentBatter,
                currentPitcher: currentState.home.currentPitcher,
                lineup: currentState.home.lineup
            },
            visitors: {
                ...currentState.visitors,
                id: nextPlayData.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam,
                currentBatter: currentState.visitors.currentBatter,
                currentPitcher: currentState.visitors.currentPitcher,
                lineup: currentState.visitors.lineup
            },
            currentPlay: nextPlayData.pn
        };
        
        try {
            console.log(`[NEXTPLAY] Processing lineup changes for game ${gameId}, from play ${currentPlay} to ${nextPlayData.pn}`);
            console.log(`[NEXTPLAY] Current play data: Inning ${currentPlayData.inning} (${currentPlayData.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${currentPlayData.batter}, Pitcher: ${currentPlayData.pitcher}`);
            console.log(`[NEXTPLAY] Next play data: Inning ${nextPlayData.inning} (${nextPlayData.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${nextPlayData.batter}, Pitcher: ${nextPlayData.pitcher}`);
            
            const lineupStateId = await detectAndSaveLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
            
            if (lineupStateId) {
                console.log(`[NEXTPLAY] Lineup changes detected and saved with state ID: ${lineupStateId}`);
            } else {
                console.log(`[NEXTPLAY] No lineup changes detected or saved`);
            }
        } catch (error: unknown) {
            console.error('Error tracking lineup changes:', error instanceof Error ? error.message : error);
        }
        
        res.json(updatedState);
        } catch (error: unknown) {
            console.error('Error:', error);
            const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
            const message = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(status).json({ error: message });
    }
};
