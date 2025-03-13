import express from 'express';
import { createGame } from './createGame';
import { initGame } from './initGame';
import { getNextPlay } from './nextPlay';
import { getGameInfo } from './gameInfo';
import { announceLineups } from './announceLineups';

const router = express.Router();

router.post('/createGame', createGame);
router.get('/init/:gameId', initGame);
router.get('/next/:gameId', getNextPlay);
router.get('/info/:gid', getGameInfo);
router.get('/announceLineups/:gameId', announceLineups);

export const GameRouter = router;
