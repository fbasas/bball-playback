import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateNextPlayPrompt } from '../../services/prompts';

export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const lastPlayIndex = parseInt(req.query.lastPlayIndex as string);
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }

    if (isNaN(lastPlayIndex)) {
        res.status(400).json({ error: 'Last play index is required and must be a number' });
        return;
    }

    try {
        // Query the plays table for the next play (next highest 'pn' value) for this game
        const nextPlay = await db('plays')
            .where({ gid: gameId })
            .where('pn', '>', lastPlayIndex)
            .orderBy('pn', 'asc')
            .first();
        
        if (!nextPlay) {
            res.status(404).json({ error: 'No more plays found for the specified game ID' });
            return;
        }

        // Get current game state (in a real app, you'd retrieve this from a database)
        // For now, we'll use a modified version of the initial state
        const currentState: BaseballState = {
            ...createEmptyBaseballState(),
            gameId: gameId
        };

        // Create a prompt using our template
        const prompt = generateNextPlayPrompt(currentState, nextPlay, lastPlayIndex);

        try {
            // Send the prompt to OpenAI with game ID
            const completionText = await generateCompletion(prompt, gameId);

            // Split the completion text by sentence endings to create an array of log entries
            const logEntries = completionText
                .replace(/([.!?])\s+/g, '$1\n') // Add newlines after sentence endings
                .split('\n')
                .filter(line => line.trim() !== '') // Remove empty lines
                .map(line => line.trim());          // Trim whitespace

            // Return a modified version of the current state
            const updatedState: BaseballState = {
                ...createEmptyBaseballState(),
                gameId: gameId,
                game: {
                    ...createEmptyBaseballState().game,
                    log: logEntries
                }
            };
            
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
