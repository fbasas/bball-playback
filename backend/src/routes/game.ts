import { Router, Request, Response } from 'express';
import { BaseballState } from '../../../common/types/BaseballTypes';
import { initialBaseballState } from '../../../common/data/initialBaseballState';

const router: Router = Router();

// Initialize game state
router.post('/init', (req: Request, res: Response) => {
    const { gameId } = req.body;
    
    try {
        // For now, return the initial state with the provided gameId
        const gameState: BaseballState = {
            ...initialBaseballState,
            gameId: gameId || -1
        };
        
        res.json(gameState);
    } catch (error) {
        console.error('Error initializing game:', error);
        res.status(500).json({ error: 'Failed to initialize game' });
    }
});

// Get next play
router.post('/next', (req: Request, res: Response) => {
    const { gameState } = req.body;
    
    try {
        // For now, just return a modified version of the current state
        // This will be replaced with actual game logic later
        const updatedState: BaseballState = {
            ...gameState,
            game: {
                ...gameState.game,
                log: ['Next play generated at ' + new Date().toLocaleTimeString()]
            }
        };
        
        res.json(updatedState);
    } catch (error) {
        console.error('Error generating next play:', error);
        res.status(500).json({ error: 'Failed to generate next play' });
    }
});

export const GameRouter = router; 