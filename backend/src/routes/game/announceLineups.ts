import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateLineupAnnouncementPrompt } from '../../services/prompts';
import { getLineupData } from '../../services/game/getLineupData';

export const announceLineups: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const skipLLM = req.query.skipLLM === 'true';
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }

    try {
        // Query the plays table for the first play for this game
        const firstPlay = await db('plays')
            .where({ gid: gameId })
            .orderBy('pn', 'asc')
            .first();
        
        if (!firstPlay) {
            res.status(404).json({ error: 'No plays found for the specified game ID' });
            return;
        }

        try {
            // Get lineup data
            const lineupData = await getLineupData(gameId);
            
            // Create a prompt using our template and the lineup data
            const prompt = generateLineupAnnouncementPrompt(lineupData);

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

            // Return a modified version of the initial state with the lineup announcement
            const gameState: BaseballState = {
                ...createEmptyBaseballState(),
                gameId: gameId,
                game: {
                    ...createEmptyBaseballState().game,
                    log: logEntries
                },
                home: {
                    ...createEmptyBaseballState().home,
                    id: lineupData.homeTeam.id,
                    displayName: lineupData.homeTeam.displayName,
                    shortName: lineupData.homeTeam.shortName,
                    currentPitcher: lineupData.homeTeam.currentPitcher,
                    lineup: lineupData.homeTeam.lineup
                },
                visitors: {
                    ...createEmptyBaseballState().visitors,
                    id: lineupData.visitingTeam.id,
                    displayName: lineupData.visitingTeam.displayName,
                    shortName: lineupData.visitingTeam.shortName,
                    currentPitcher: lineupData.visitingTeam.currentPitcher,
                    lineup: lineupData.visitingTeam.lineup
                }
            };
            
            res.json(gameState);
        } catch (error) {
            console.error('Error generating completion:', error);
            res.status(500).json({ error: 'Failed to generate completion' });
        }
    } catch (error) {
        console.error('Error announcing lineups:', error);
        res.status(500).json({ error: 'Failed to announce lineups' });
    }
};
