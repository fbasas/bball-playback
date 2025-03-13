import { RequestHandler } from 'express';
import { db } from '../../config/database';

export const getGameInfo: RequestHandler = async (req, res) => {
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
