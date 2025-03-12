import express, { Router, Request, Response, RequestHandler } from 'express';
import { BaseballState } from '../../../common/types/BaseballTypes';
import { initialBaseballState } from '../../../common/data/initialBaseballState';
import { db } from '../config/database';
import { generateCompletion } from '../services/openai';
import { 
    generateInitGamePrompt, 
    generateNextPlayPrompt, 
    generateLineupAnnouncementPrompt 
} from '../services/prompts';

interface CreateGameRequest {
    homeTeamId: string;
    visitingTeamId: string;
}

const router = express.Router();

// Create a new game
const createGame: RequestHandler = (req, res) => {
    const { homeTeamId, visitingTeamId } = req.body as CreateGameRequest;
    
    if (!homeTeamId || !visitingTeamId) {
        res.status(400).json({ error: 'Both homeTeamId and visitingTeamId are required' });
        return;
    }

    try {
        // Generate a unique game ID (for now, using timestamp)
        const gameId = Date.now().toString();
        
        // Create initial game state with the provided team IDs
        const gameState: BaseballState = {
            ...initialBaseballState,
            gameId,
            home: {
                ...initialBaseballState.home,
                id: homeTeamId
            },
            visitors: {
                ...initialBaseballState.visitors,
                id: visitingTeamId
            }
        };
        
        res.json({ gameId, gameState });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
};

// Initialize game state
const initGame: RequestHandler = async (req, res) => {
    const gameId = req.params.gameId;
    
    if (!gameId) {
        res.status(400).json({ error: 'Game ID is required' });
        return;
    }

    try {
        // Query the plays table for the first play (lowest 'pn' value) for this game
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
            const prompt = await generateInitGamePrompt({
                ...initialBaseballState,
                gameId: gameId
            });

            // Send the prompt to OpenAI with game ID
            const completionText = await generateCompletion(prompt, gameId);

            // Split the completion text by sentence endings to create an array of log entries
            const logEntries = completionText
                .replace(/([.!?])\s+/g, '$1\n') // Add newlines after sentence endings
                .split('\n')
                .filter(line => line.trim() !== '') // Remove empty lines
                .map(line => line.trim());          // Trim whitespace

            // Return a modified version of the initial state
            const gameState: BaseballState = {
                ...initialBaseballState,
                gameId: gameId,
                game: {
                    ...initialBaseballState.game,
                    log: logEntries
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

// Get next play
const getNextPlay: RequestHandler = async (req, res) => {
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
            ...initialBaseballState,
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
                ...initialBaseballState,
                gameId: gameId,
                game: {
                    ...initialBaseballState.game,
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

// Get game info from plays table
const getGameInfo: RequestHandler = async (req, res) => {
    const { gid } = req.params;
    
    if (!gid) {
        res.status(400).json({ error: 'Game ID (gid) is required' });
        return;
    }

    try {
        // Query the plays table for the specified game ID
        const plays = await db('plays')
            .where({ gid })
            .orderBy('pn', 'asc');
        
        if (plays.length === 0) {
            res.status(404).json({ error: 'No plays found for the specified game ID' });
            return;
        }
        
        res.json({ plays });
    } catch (error) {
        console.error('Error retrieving game info:', error);
        res.status(500).json({ error: 'Failed to retrieve game info' });
    }
};

// Announce lineups
const announceLineups: RequestHandler = async (req, res) => {
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

router.post('/createGame', createGame);
router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);
router.get('/info/:gid', getGameInfo);
router.get('/announceLineups/:gameId', announceLineups);

export const GameRouter = router;
