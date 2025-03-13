import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateNextPlayPrompt } from '../../services/prompts';
import { detectAndSaveLineupChanges } from '../../services/game/lineupTracking';

export const getNextPlay: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }

    if (isNaN(currentPlay)) {
        res.status(400).json({ error: 'Current play index is required and must be a number' });
        return;
    }

    try {
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

        // Get current game state (in a real app, you'd retrieve this from a database)
        // For now, we'll use a modified version of the initial state
        const currentState: BaseballState = {
            ...createEmptyBaseballState(),
            gameId: gameId,
            currentPlay: currentPlay,
            gameType: 'replay' // Default to replay mode
        };

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

            // Return a modified version of the current state
            const updatedState: BaseballState = {
                ...createEmptyBaseballState(),
                gameId: gameId,
                game: {
                    ...createEmptyBaseballState().game,
                    log: logEntries,
                    inning: nextPlay.inn_ct || 1,
                    isTopInning: nextPlay.bat_home_id === '0', // 0 = visitor (top), 1 = home (bottom)
                    outs: nextPlay.outs_ct || 0
                },
                currentPlay: nextPlay.pn, // Update to the new current play
                gameType: currentState.gameType // Preserve the game type
            };
            
            // Track lineup changes
            try {
                // Get the current play data (the play before nextPlay)
                const currentPlayData = await db('plays')
                    .where({ gid: gameId, pn: currentPlay })
                    .first();
                
                if (currentPlayData) {
                    // Detect and save lineup changes between the current play and next play
                    await detectAndSaveLineupChanges(gameId, currentPlayData, nextPlay);
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
