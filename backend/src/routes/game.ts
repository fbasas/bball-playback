import express, { Router, Request, Response, RequestHandler } from 'express';
import { BaseballState } from '../../../common/types/BaseballTypes';
import { initialBaseballState } from '../../../common/data/initialBaseballState';
import { db } from '../config/database';

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
        const gameId = Date.now();
        
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
const initGame: RequestHandler = (req, res) => {
    const gameId = parseInt(req.params.gameId);
    
    try {
        // For now, return the initial state with the provided gameId
        const gameState: BaseballState = {
            ...initialBaseballState,
            gameId: gameId
        };
        
        res.json(gameState);
    } catch (error) {
        console.error('Error initializing game:', error);
        res.status(500).json({ error: 'Failed to initialize game' });
    }
};

// Get next play
const getNextPlay: RequestHandler = (req, res) => {
    const gameId = parseInt(req.params.gameId);
    
    try {
        // For now, just return a modified version of the current state
        const updatedState: BaseballState = {
            ...initialBaseballState,
            gameId: gameId,
            game: {
                ...initialBaseballState.game,
                log: ['Next play generated at ' + new Date().toLocaleTimeString()]
            }
        };
        
        res.json(updatedState);
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

router.post('/createGame', createGame);
router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);
router.get('/info/:gid', getGameInfo);

export const GameRouter = router;
