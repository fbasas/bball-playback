import { RequestHandler } from 'express';
import { getAllLineupChanges, getLatestLineupState, getLineupStateForPlay } from '../../services/game/lineupTracking';

/**
 * Get all lineup changes for a game
 */
export const getLineupHistory: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  try {
    const changes = await getAllLineupChanges(gameId);
    res.json({ changes });
  } catch (error) {
    console.error('Error getting lineup history:', error);
    res.status(500).json({ error: 'Failed to get lineup history' });
  }
};

/**
 * Get the lineup state for a specific play in a game
 */
export const getLineupStateForPlayHandler: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const playIndex = parseInt(req.params.playIndex);
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  if (isNaN(playIndex)) {
    res.status(400).json({ error: 'Play index is required and must be a number' });
    return;
  }
  
  try {
    const lineupState = await getLineupStateForPlay(gameId, playIndex);
    
    if (!lineupState) {
      res.status(404).json({ error: 'Lineup state not found for the specified game and play' });
      return;
    }
    
    res.json(lineupState);
  } catch (error) {
    console.error('Error getting lineup state for play:', error);
    res.status(500).json({ error: 'Failed to get lineup state for play' });
  }
};

/**
 * Get the latest lineup state for a game
 */
export const getLatestLineupStateHandler: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  try {
    const lineupState = await getLatestLineupState(gameId);
    
    if (!lineupState) {
      res.status(404).json({ error: 'Lineup state not found for the specified game' });
      return;
    }
    
    res.json(lineupState);
  } catch (error) {
    console.error('Error getting latest lineup state:', error);
    res.status(500).json({ error: 'Failed to get latest lineup state' });
  }
};
