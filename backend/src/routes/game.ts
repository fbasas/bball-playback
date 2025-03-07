import express, { Router, Request, Response, RequestHandler } from 'express';
import { BaseballState } from '../../../common/types/BaseballTypes';
import { initialBaseballState } from '../../../common/data/initialBaseballState';

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

router.post('/createGame', createGame);
router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);

export const GameRouter = router; 