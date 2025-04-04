import { RequestHandler } from 'express';
import { getAllLineupChanges, getLatestLineupState, getLineupStateForPlay } from '../../services/game/lineupTracking';

import { LineupHistoryResponse, LineupState } from '../../../../common/types/ApiTypes';

/**
 * Get all lineup changes for a game
 * @returns {LineupHistoryResponse} Response data contains an array of LineupChange objects
 */
export const getLineupHistory: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  if (!sessionId) {
    res.status(400).json({ error: 'Session ID header is required' });
    return;
  }
  
  try {
    const changes = await getAllLineupChanges(gameId, sessionId);
    res.json({ changes });
  } catch (error) {
    console.error('Error getting lineup history:', error);
    res.status(500).json({ error: 'Failed to get lineup history' });
  }
};

/**
 * Get the lineup state for a specific play in a game
 * @returns {LineupState} Response data contains a LineupState object for the specified play
 */
export const getLineupStateForPlayHandler: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  const playIndex = parseInt(req.params.playIndex);
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  if (!sessionId) {
    res.status(400).json({ error: 'Session ID header is required' });
    return;
  }
  
  if (isNaN(playIndex)) {
    res.status(400).json({ error: 'Play index is required and must be a number' });
    return;
  }
  
  try {
    const lineupState = await getLineupStateForPlay(gameId, sessionId, playIndex);
    
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
 * @returns {LineupState} Response data contains the most recent LineupState object for the game
 */
export const getLatestLineupStateHandler: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  
  if (!gameId) {
    res.status(400).json({ error: 'Game ID is required' });
    return;
  }
  
  if (!sessionId) {
    res.status(400).json({ error: 'Session ID header is required' });
    return;
  }
  
  try {
    const lineupState = await getLatestLineupState(gameId, sessionId);
    
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
