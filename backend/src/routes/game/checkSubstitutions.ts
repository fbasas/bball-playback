import { RequestHandler } from 'express';
import { SubstitutionResponse } from '../../../../common/types/SubstitutionTypes';
import { db } from '../../config/database';
import { SubstitutionDetector } from '../../services/game/SubstitutionDetector';

/**
 * Check for substitutions between the current play and the next play
 *
 * This endpoint detects and reports player substitutions that occurred between
 * the current play and the next play in a baseball game. It identifies different
 * types of substitutions including pitching changes, pinch hitters, pinch runners,
 * and fielding changes.
 *
 * The endpoint requires a game ID, session ID, and the current play index to
 * determine which plays to compare for substitution detection.
 *
 * @route GET /api/game/checkSubstitutions/:gameId
 * @param {string} gameId - The ID of the game (path parameter)
 * @param {string} currentPlay - The index of the current play (query parameter)
 * @param {string} session-id - The session identifier (header)
 * @returns {SubstitutionResponse} Response data contains detailed substitution information
 *
 * @example
 * // Request
 * GET /api/game/checkSubstitutions/CIN201904150?currentPlay=42
 * Headers:
 *   session-id: 123e4567-e89b-12d3-a456-426614174000
 *
 * // Response
 * {
 *   "hasPitchingChange": true,
 *   "hasPinchHitter": false,
 *   "hasPinchRunner": false,
 *   "substitutions": [
 *     {
 *       "type": "PITCHING_CHANGE",
 *       "playerIn": {
 *         "playerId": "smitj001",
 *         "playerName": "Joe Smith",
 *         "teamId": "CIN",
 *         "position": "P"
 *       },
 *       "playerOut": {
 *         "playerId": "joneb001",
 *         "playerName": "Bob Jones",
 *         "teamId": "CIN",
 *         "position": "P"
 *       },
 *       "description": "Joe Smith replaces Bob Jones as pitcher"
 *     }
 *   ]
 * }
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

    // Handle the case when currentPlay is 0
    if (currentPlay === 0) {
      // TODO: In the future, handle the edge case where a substitution occurs before the first play of the game
      // For now, we automatically report that no substitutions occurred
      const emptyResponse: SubstitutionResponse = {
        hasPitchingChange: false,
        hasPinchHitter: false,
        hasPinchRunner: false,
        substitutions: []
      };
      res.json(emptyResponse);
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