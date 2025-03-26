import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState, Player } from '../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../common/types/PlayData';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateInitGamePrompt } from '../../services/prompts';
import { getLineupData } from '../../services/game/getLineupData';
import { saveInitialLineup } from '../../services/game/lineupTracking';

/**
 * Initialize a game with the first play data
 * @returns {BaseballState} Response data contains a BaseballState object with initial game state
 * @deprecated Use nextPlay endpoint with currentPlay=0 instead
 */
export const initGame: RequestHandler = async (req, res) => {
    console.warn('DEPRECATED: The initGame endpoint is deprecated. Please use nextPlay with currentPlay=0 instead.');
    
    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const skipLLM = req.query.skipLLM === 'true';
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }
    
    if (!sessionId) {
        res.status(400).json({ error: 'Session ID header is required' });
        return;
    }

    try {
        // Query the plays table for the first play (lowest 'pn' value) for this game
        const firstPlay: PlayData = await db('plays')
            .where({ gid: gameId })
            .orderBy('pn', 'asc')
            .first();
        
        if (!firstPlay) {
            res.status(404).json({ error: 'No plays found for the specified game ID' });
            return;
        }

        try {
            // Create a prompt using our template
            const prompt = await generateInitGamePrompt({
                ...createEmptyBaseballState(),
                gameId: gameId,
                sessionId: sessionId
            });

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

            // Initialize lineup tracking
            try {
                // Get team stats for the game
                const teamstats = await db('teamstats')
                    .where({ gid: gameId })
                    .select('team', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6', 'start_l7', 'start_l8', 'start_l9', 'start_f1');
                
                if (!teamstats || teamstats.length !== 2) {
                    throw new Error(`Team stats not found for game ID: ${gameId}`);
                }
                
                // Get game info to determine home and visiting teams
                const gameInfo = await db('gameinfo')
                    .where({ gid: gameId })
                    .first();
                
                if (!gameInfo) {
                    throw new Error(`Game information not found for game ID: ${gameId}`);
                }
                
                // Determine which team is home and which is visiting
                const homeTeamData = teamstats.find(t => t.team === gameInfo.hometeam);
                const visitingTeamData = teamstats.find(t => t.team === gameInfo.visteam);
                
                if (!homeTeamData || !visitingTeamData) {
                    throw new Error(`Could not determine home and visiting teams for game ID: ${gameId}`);
                }
                
                // Get lineup data for UI display
                const lineupData = await getLineupData(gameId);
                
                // Get player IDs from teamstats
                const homePlayerIds = [
                    homeTeamData.start_l1, homeTeamData.start_l2, homeTeamData.start_l3,
                    homeTeamData.start_l4, homeTeamData.start_l5, homeTeamData.start_l6,
                    homeTeamData.start_l7, homeTeamData.start_l8, homeTeamData.start_l9
                ].filter(Boolean);
                
                const visitingPlayerIds = [
                    visitingTeamData.start_l1, visitingTeamData.start_l2, visitingTeamData.start_l3,
                    visitingTeamData.start_l4, visitingTeamData.start_l5, visitingTeamData.start_l6,
                    visitingTeamData.start_l7, visitingTeamData.start_l8, visitingTeamData.start_l9
                ].filter(Boolean);
                
                // Get player details from allplayers table
                const allPlayerIds = [...homePlayerIds, ...visitingPlayerIds];
                const players = await db('allplayers')
                    .whereIn('id', allPlayerIds)
                    .select('id', 'first', 'last');
                
                // Create player lookup map
                const playerMap = new Map();
                players.forEach(player => {
                    playerMap.set(player.id, {
                        firstName: player.first || '',
                        lastName: player.last || ''
                    });
                });
                
                // Create home team lineup with retrosheet_id
                const homeLineup = homePlayerIds.map((playerId, index) => {
                    const player = playerMap.get(playerId);
                    if (!player) return null;
                    
                    return {
                        position: lineupData.homeTeam.lineup[index]?.position || 'DH',
                        firstName: player.firstName,
                        lastName: player.lastName,
                        retrosheet_id: playerId
                    };
                }).filter(Boolean) as Player[];
                
                // Create visiting team lineup with retrosheet_id
                const visitingLineup = visitingPlayerIds.map((playerId, index) => {
                    const player = playerMap.get(playerId);
                    if (!player) return null;
                    
                    return {
                        position: lineupData.visitingTeam.lineup[index]?.position || 'DH',
                        firstName: player.firstName,
                        lastName: player.lastName,
                        retrosheet_id: playerId
                    };
                }).filter(Boolean) as Player[];
                
                // Initialize lineup tracking
                await saveInitialLineup(
                    gameId,
                    sessionId,
                    {
                        id: lineupData.homeTeam.id,
                        lineup: homeLineup,
                        currentPitcher: lineupData.homeTeam.currentPitcher
                    },
                    {
                        id: lineupData.visitingTeam.id,
                        lineup: visitingLineup,
                        currentPitcher: lineupData.visitingTeam.currentPitcher
                    }
                );
                
                console.log('Lineup tracking initialized successfully');
            } catch (error) {
                console.error('Error initializing lineup tracking:', error);
                // Continue even if lineup tracking initialization fails
            }
            
            // Get the lineup data for the game
            const lineupData = await getLineupData(gameId);
            
            // Get the first play data to determine runners on bases
            const firstPlayData = firstPlay;
            
            // Return a modified version of the initial state with full game data
            const gameState: BaseballState = {
                ...createEmptyBaseballState(),
                gameId: gameId,
                sessionId: sessionId,
                game: {
                    ...createEmptyBaseballState().game,
                    log: logEntries,
                    // Add runners on bases from the first play
                    onFirst: firstPlayData.br1_pre || "",
                    onSecond: firstPlayData.br2_pre || "",
                    onThird: firstPlayData.br3_pre || ""
                },
                home: {
                    ...createEmptyBaseballState().home,
                    id: lineupData.homeTeam.id,
                    displayName: lineupData.homeTeam.displayName,
                    shortName: lineupData.homeTeam.shortName,
                    currentPitcher: lineupData.homeTeam.currentPitcher,
                    lineup: lineupData.homeTeam.lineup,
                    // Set current batter to null initially for home team
                    // It will be set in the frontend based on the current inning
                    currentBatter: null
                },
                visitors: {
                    ...createEmptyBaseballState().visitors,
                    id: lineupData.visitingTeam.id,
                    displayName: lineupData.visitingTeam.displayName,
                    shortName: lineupData.visitingTeam.shortName,
                    currentPitcher: lineupData.visitingTeam.currentPitcher,
                    lineup: lineupData.visitingTeam.lineup,
                    // Set the first batter in the lineup as the current batter for visitors
                    // since the game starts with the visiting team batting
                    currentBatter: lineupData.visitingTeam.lineup.length > 0 ? 
                        `${lineupData.visitingTeam.lineup[0].firstName} ${lineupData.visitingTeam.lineup[0].lastName}`.trim() : 
                        null
                }
            };
            
            res.json(gameState);
        } catch (error) {
            console.error('Error generating completion:', error);
            res.status(500).json({ error: 'Failed to generate completion' });
        }
    } catch (error) {
        console.error('Error initializing game:', error);
        res.status(500).json({ error: 'Failed to initialize game' });
    }
};
