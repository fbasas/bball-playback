import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateNextPlayPrompt } from '../../services/prompts';
import { detectAndSaveLineupChanges, getLineupStateForPlay } from '../../services/game/lineupTracking';

export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }

    if (!sessionId) {
        res.status(400).json({ error: 'Session ID header is required' });
        return;
    }

    if (isNaN(currentPlay)) {
        res.status(400).json({ error: 'Current play index is required and must be a number' });
        return;
    }

    try {
        // Query the plays table for the current play data
        const currentPlayData = await db('plays')
            .where({ gid: gameId, pn: currentPlay })
            .first();
        
        if (!currentPlayData) {
            res.status(404).json({ error: 'Current play not found for the specified game ID' });
            return;
        }
        
        // Validate required fields in currentPlayData
        if (!currentPlayData.inning || currentPlayData.top_bot === undefined || 
            currentPlayData.outs_pre === undefined || currentPlayData.batteam === undefined ||
            currentPlayData.pitteam === undefined) {
            res.status(500).json({ error: 'Missing required data in current play' });
            return;
        }
        
        // Query the plays table for the next play (next highest 'pn' value) for this game
        const nextPlay = await db('plays')
            .where({ gid: gameId })
            .where('pn', '>', currentPlay)
            .orderBy('pn', 'asc')
            .first();
        
        if (!nextPlay) {
            res.status(404).json({ error: 'No more plays found for the specified game ID' });
            return;
        }
        
        // Validate required fields in nextPlay
        if (!nextPlay.inning || nextPlay.top_bot === undefined || 
            nextPlay.outs_pre === undefined) {
            res.status(500).json({ error: 'Missing required data in next play' });
            return;
        }

        // Initialize the baseball state using data from the plays table
        let currentState: BaseballState = {
            ...createEmptyBaseballState(),
            gameId: gameId,
            sessionId: sessionId,
            currentPlay: currentPlay,
            gameType: 'replay',
            game: {
                ...createEmptyBaseballState().game,
                inning: currentPlayData.inning,
                isTopInning: currentPlayData.top_bot === 0, // Use top_bot field: 0 = top, 1 = bottom
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
        };

        // Get the lineup state for the current play to populate lineup information
        const lineupState = await getLineupStateForPlay(gameId, sessionId, currentPlay);
        
        // If we have a lineup state, use it to populate the lineup information
        if (lineupState) {
            // Get player details for the lineup
            const playerIds = lineupState.players.map(p => p.playerId);
            const players = await db('allplayers')
                .whereIn('id', playerIds)
                .select('id', 'first', 'last');
            
            // Create player lookup map
            const playerMap = new Map();
            players.forEach(player => {
                playerMap.set(player.id, {
                    firstName: player.first || '',
                    lastName: player.last || ''
                });
            });
            
            // Create home team lineup
            const homeTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.home.id);
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
            
            // Create visiting team lineup
            const visitingTeamPlayers = lineupState.players.filter(p => p.teamId === currentState.visitors.id);
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
            
            // Get current pitchers
            const homePitcher = homeTeamPlayers.find(p => p.isCurrentPitcher);
            const visitingPitcher = visitingTeamPlayers.find(p => p.isCurrentPitcher);
            
            // Update the baseball state with lineup information
            currentState = {
                ...currentState,
                home: {
                    ...currentState.home,
                    lineup: homeLineup,
                    currentPitcher: homePitcher ? `${playerMap.get(homePitcher.playerId)?.firstName || ''} ${playerMap.get(homePitcher.playerId)?.lastName || ''}`.trim() : ''
                },
                visitors: {
                    ...currentState.visitors,
                    lineup: visitingLineup,
                    currentPitcher: visitingPitcher ? `${playerMap.get(visitingPitcher.playerId)?.firstName || ''} ${playerMap.get(visitingPitcher.playerId)?.lastName || ''}`.trim() : ''
                }
            };
        } else {
            console.warn(`No lineup state found for game ${gameId}, play ${currentPlay}. Using basic state.`);
        }

        // Create a prompt using our template
        const prompt = generateNextPlayPrompt(currentState, nextPlay, currentPlay);

        try {
            // Generate completion text
            let completionText;
            
            if (skipLLM) {
                // Skip LLM call and use dummy text for testing
                console.log('Skipping LLM call and using dummy response');
                completionText = "This is a dummy response for testing purposes. LLM calls are being skipped.";
            } else {
                // Send the prompt to OpenAI with game ID
                completionText = await generateCompletion(prompt, gameId);
            }

            // Split the completion text by sentence endings to create an array of log entries
            const logEntries = completionText
                .replace(/([.!?])\s+/g, '$1\n') // Add newlines after sentence endings
                .split('\n')
                .filter(line => line.trim() !== '') // Remove empty lines
                .map(line => line.trim());          // Trim whitespace

            // Get the game state from the next play in the plays table
            const updatedState: BaseballState = {
                ...currentState,
                gameId: gameId,
                sessionId: sessionId,
                game: {
                    ...currentState.game,
                    log: logEntries,
                    inning: nextPlay.inning,
                    isTopInning: nextPlay.top_bot === 0, // Use top_bot field: 0 = top, 1 = bottom
                    outs: nextPlay.outs_pre
                },
                home: {
                    ...currentState.home,
                    id: nextPlay.top_bot === 0 ? currentPlayData.pitteam : currentPlayData.batteam
                },
                visitors: {
                    ...currentState.visitors,
                    id: nextPlay.top_bot === 0 ? currentPlayData.batteam : currentPlayData.pitteam
                },
                currentPlay: nextPlay.pn // Update to the new current play
            };
            
            // Track lineup changes
            try {
                console.log(`[NEXTPLAY] Processing lineup changes for game ${gameId}, from play ${currentPlay} to ${nextPlay.pn}`);
                console.log(`[NEXTPLAY] Current play data: Inning ${currentPlayData.inning} (${currentPlayData.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${currentPlayData.batter}, Pitcher: ${currentPlayData.pitcher}`);
                console.log(`[NEXTPLAY] Next play data: Inning ${nextPlay.inning} (${nextPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Batter: ${nextPlay.batter}, Pitcher: ${nextPlay.pitcher}`);
                
                // Detect and save lineup changes between the current play and next play
                const lineupStateId = await detectAndSaveLineupChanges(gameId, sessionId, currentPlayData, nextPlay);
                
                if (lineupStateId) {
                    console.log(`[NEXTPLAY] Lineup changes detected and saved with state ID: ${lineupStateId}`);
                } else {
                    console.log(`[NEXTPLAY] No lineup changes detected or saved`);
                }
            } catch (error) {
                console.error('Error tracking lineup changes:', error);
                // Continue even if lineup tracking fails
            }
            
            res.json(updatedState);
        } catch (error) {
            console.error('Error generating completion:', error);
            res.status(500).json({ error: 'Failed to generate completion' });
        }
    } catch (error) {
        console.error('Error generating next play:', error);
        res.status(500).json({ error: 'Failed to generate next play' });
    }
};
