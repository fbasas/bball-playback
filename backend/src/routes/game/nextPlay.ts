import { RequestHandler } from 'express';
import { AnnouncerStyle } from '../../services/game/commentary/CommentaryService';
import { GamePlaybackService } from '../../services/game/playback';
import { validateRequestInput } from '../../utils/GameUtils';
import { DEFAULT_ANNOUNCER_STYLE } from '../../constants/GameConstants';
import { contextLogger } from '../../core/logging';

/**
 * Get the next play in a game sequence
 * @returns {SimplifiedBaseballState} Response data contains a SimplifiedBaseballState object with the next play information
 */
export const getNextPlay: RequestHandler = async (req, res, next) => {
    const routeLogger = contextLogger({
        route: 'getNextPlay',
        gameId: req.params.gameId,
        sessionId: req.headers['session-id'] as string
    });

    const gameId = req.params.gameId;
    const sessionId = req.headers['session-id'] as string;
    const currentPlay = parseInt(req.query.currentPlay as string);
    const skipLLM = req.query.skipLLM === 'true';
    const announcerStyle = (req.query.announcerStyle as AnnouncerStyle) || DEFAULT_ANNOUNCER_STYLE;

    routeLogger.info('Processing next play request', {
        currentPlay,
        skipLLM,
        announcerStyle
    });

    try {
        // Basic validation
        validateRequestInput(gameId, sessionId, currentPlay);

        const result = await GamePlaybackService.getNextPlay(
            gameId,
            sessionId,
            currentPlay,
            { skipLLM, announcerStyle }
        );

        routeLogger.info('Successfully processed next play', {
            currentPlay: result.currentPlay,
            inning: result.game.inning,
            isTopInning: result.game.isTopInning
        });

        res.json(result);
    } catch (error: unknown) {
        next(error);
    }
};
