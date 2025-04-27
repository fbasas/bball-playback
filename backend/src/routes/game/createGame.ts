import { RequestHandler, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { BaseballState, createEmptyBaseballState } from '../../../../common/types/BaseballTypes';
import { CreateGameRequest, CreateGameResponse } from '../../../../common/types/ApiTypes';
import { BadRequestError } from '../../core/errors';
import { logger, contextLogger } from '../../core/logging';
import { validateBody, CreateGameRequestSchema } from '../../validation';

/**
 * Create a new game with the specified home and visiting teams
 * @returns {CreateGameResponse} Response data contains gameId, sessionId, and gameState properties
 */
export const createGame: RequestHandler = (req, res, next) => {
    // Create a context-specific logger for this route
    const routeLogger = contextLogger({ route: 'createGame' });
    
    try {
        // Body is already validated by middleware
        const { homeTeamId, visitingTeamId } = req.body as CreateGameRequest;
        
        routeLogger.debug('Received request to create game', { homeTeamId, visitingTeamId });
        
        // Generate a unique game ID (for now, using timestamp)
        const gameId = Date.now().toString();
        
        // Generate a unique session ID using UUID
        const sessionId = uuidv4();
        
        routeLogger.info('Creating new game', { gameId, sessionId });
        
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
        
        routeLogger.info('Game created successfully', { gameId });
        
        res.json({ gameId, sessionId, gameState });
    } catch (error) {
        // Pass the error to the error handling middleware
        next(error);
    }
};

/**
 * Create the router for the createGame endpoint
 */
export const createGameRouter = Router();

// Apply validation middleware before the route handler
createGameRouter.post('/', validateBody(CreateGameRequestSchema), createGame);
