import { RequestHandler } from 'express';
import { BaseballState } from '../../../../common/types/BaseballTypes';
import { initialBaseballState } from '../../../../common/data/initialBaseballState';

interface CreateGameRequest {
    homeTeamId: string;
    visitingTeamId: string;
}

export const createGame: RequestHandler = (req, res) => {
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
