import express from 'express';
import { createGameRouter } from './createGame';
import { initGame } from './initGame';
import { nextPlayRouter } from './nextPlayWithValidation';
import { getGameInfo } from './gameInfo';
import { announceLineups } from './announceLineups';
import { checkSubstitutions } from './checkSubstitutions';
import {
  getLineupHistory,
  getLineupStateForPlayHandler,
  getLatestLineupStateHandler
} from './lineupHistory';

const router = express.Router();

// Use the createGame router which includes validation middleware
router.use('/createGame', createGameRouter);
router.get('/init/:gameId', initGame);
// Use the nextPlay router which includes validation middleware
router.use('/next', nextPlayRouter);
router.get('/info/:gid', getGameInfo);
router.get('/announceLineups/:gameId', announceLineups);
router.get('/checkSubstitutions/:gameId', checkSubstitutions);

// Lineup tracking routes
router.get('/lineup/history/:gameId', getLineupHistory);
router.get('/lineup/state/:gameId/:playIndex', getLineupStateForPlayHandler);
router.get('/lineup/latest/:gameId', getLatestLineupStateHandler);

export const GameRouter = router;
