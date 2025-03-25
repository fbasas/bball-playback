import express from 'express';
import { createGame } from './createGame';
import { initGame } from './initGame';
import { getNextPlay } from './nextPlay';
import { getGameInfo } from './gameInfo';
import { announceLineups } from './announceLineups';
import { checkSubstitutions } from './checkSubstitutions';
import {
  getLineupHistory,
  getLineupStateForPlayHandler,
  getLatestLineupStateHandler
} from './lineupHistory';

const router = express.Router();

router.post('/createGame', createGame);
router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);
router.get('/info/:gid', getGameInfo);
router.get('/announceLineups/:gameId', announceLineups);
router.get('/checkSubstitutions/:gameId', checkSubstitutions);

// Lineup tracking routes
router.get('/lineup/history/:gameId', getLineupHistory);
router.get('/lineup/state/:gameId/:playIndex', getLineupStateForPlayHandler);
router.get('/lineup/latest/:gameId', getLatestLineupStateHandler);

export const GameRouter = router;
