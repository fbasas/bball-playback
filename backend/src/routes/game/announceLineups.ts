import { RequestHandler } from 'express';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateLineupAnnouncementPrompt } from '../../services/prompts';

export const announceLineups: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    
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
            // Create a prompt using our template
            const prompt = await generateLineupAnnouncementPrompt(gameId);

            // Send the prompt to OpenAI with game ID
            const completionText = await generateCompletion(prompt, gameId);

            // Split the completion text by sentence endings to create an array of log entries
            const logEntries = completionText
                .replace(/([.!?])\s+/g, '$1\n') // Add newlines after sentence endings
                .split('\n')
                .filter(line => line.trim() !== '') // Remove empty lines
                .map(line => line.trim());          // Trim whitespace

            // Return the lineup announcement
            res.json({
                gameId: gameId,
                announcement: logEntries
            });
        } catch (error) {
            console.error('Error generating completion:', error);
            res.status(500).json({ error: 'Failed to generate completion' });
        }
    } catch (error) {
        console.error('Error announcing lineups:', error);
        res.status(500).json({ error: 'Failed to announce lineups' });
    }
};
