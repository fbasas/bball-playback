import { RequestHandler } from 'express';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';

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
            ...createEmptyBaseballState(),
            gameId,
            home: {
                ...createEmptyBaseballState().home,
                id: homeTeamId
            },
            visitors: {
                ...createEmptyBaseballState().visitors,
                id: visitingTeamId
            }
        };
        
        res.json({ gameId, gameState });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
};
