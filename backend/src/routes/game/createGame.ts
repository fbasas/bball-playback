import { RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { CreateGameRequest, CreateGameResponse } from '../../../../common/types/ApiTypes';

/**
 * Create a new game with the specified home and visiting teams
 * @returns {CreateGameResponse} Response data contains gameId, sessionId, and gameState properties
 */
export const createGame: RequestHandler = (req, res) => {
    const { homeTeamId, visitingTeamId } = req.body as CreateGameRequest;
    
    if (!homeTeamId || !visitingTeamId) {
        res.status(400).json({ error: 'Both homeTeamId and visitingTeamId are required' });
        return;
    }

    try {
        // Generate a unique game ID (for now, using timestamp)
        const gameId = Date.now().toString();
        
        // Generate a unique session ID using UUID
        const sessionId = uuidv4();
        
        // Create initial game state with the provided team IDs
        const gameState: BaseballState = {
            ...createEmptyBaseballState(),
            gameId,
            sessionId,
            home: {
                ...createEmptyBaseballState().home,
                id: homeTeamId
            },
            visitors: {
                ...createEmptyBaseballState().visitors,
                id: visitingTeamId
            }
        };
        
        res.json({ gameId, sessionId, gameState });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
};
