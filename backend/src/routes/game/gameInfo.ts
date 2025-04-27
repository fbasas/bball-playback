import { RequestHandler } from 'express';
import { db } from '../../config/database';
import { GameInfoResponse } from '../../../../common/types/ApiTypes';

/**
 * Get information about a game, including teams and plays
 * @returns {GameInfoResponse} Response data contains team information and an array of PlayData objects
 */
export const getGameInfo: RequestHandler = async (req, res) => {
    const { gid } = req.params;
    
    if (!gid) {
        res.status(400).json({ error: 'Game ID (gid) is required' });
        return;
    }

    try {
        // Get game information from gameinfo table
        const gameInfo = await db('gameinfo')
            .where({ gid })
            .first();
            
        if (!gameInfo) {
            res.status(404).json({ error: 'Game information not found for the specified game ID' });
            return;
        }
        
        // Get team information
        const homeTeam = await db('teams')
            .where({ team: gameInfo.hometeam })
            .first();
            
        const visitingTeam = await db('teams')
            .where({ team: gameInfo.visteam })
            .first();
            
        if (!homeTeam || !visitingTeam) {
            res.status(404).json({ error: 'Team information not found' });
            return;
        }
        
        // Query the plays table for the specified game ID
        const plays = await db('plays')
            .where({ gid })
            .orderBy('pn', 'asc');
        
        if (plays.length === 0) {
            res.status(404).json({ error: 'No plays found for the specified game ID' });
            return;
        }
        
        // Format the response
        res.json({
            gameId: gid,
            homeTeam: {
                id: homeTeam.team,
                displayName: `${homeTeam.city} ${homeTeam.nickname}`.trim(),
                shortName: homeTeam.nickname
            },
            visitingTeam: {
                id: visitingTeam.team,
                displayName: `${visitingTeam.city} ${visitingTeam.nickname}`.trim(),
                shortName: visitingTeam.nickname
            },
            plays
        });
    } catch (error) {
        console.error('Error retrieving game info:', error);
        res.status(500).json({ error: 'Failed to retrieve game info' });
    }
};
