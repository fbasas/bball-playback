import { RequestHandler } from 'express';
import { SubstitutionResponse } from '../../../../common/types/SubstitutionTypes';
import { db } from '../../config/database';
import { SubstitutionDetector } from '../../services/game/SubstitutionDetector';

/**
 * Check for substitutions between the current play and the next play
 * @returns {SubstitutionResponse} Response data contains substitution information
 */
export const checkSubstitutions: RequestHandler = async (req, res) => {
  const gameId = req.params.gameId;
  const sessionId = req.headers['session-id'] as string;
  const currentPlay = parseInt(req.query.currentPlay as string);

  try {
    // Validate input
    if (!gameId || !sessionId || isNaN(currentPlay)) {
      res.status(400).json({ 
        error: 'Missing required parameters: gameId, sessionId, currentPlay' 
      });
      return;
    }

    // Create detector from current play (it will find the next play internally)
    const detector = await SubstitutionDetector.createFromCurrentPlay(gameId, sessionId, currentPlay);
    
    if (!detector) {
      res.status(404).json({ 
        error: 'Play data not found for the specified game and play index, or no next play exists' 
      });
      return;
    }

    // Detect substitutions
    const substitutionResponse = await detector.detectSubstitutions();
    
    res.json(substitutionResponse);
  } catch (error) {
    console.error('Error checking substitutions:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: message });
  }
};