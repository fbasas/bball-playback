import request from 'supertest';
import express from 'express';
import { GameRouter } from '../game';
import { CreateGameRequest } from '../../../../common/types/ApiTypes';
import { errorMiddleware } from '../../core/errors/ErrorMiddleware';

// Mock dependencies
jest.mock('../../services/game/gameInitialization', () => ({
  initializeGame: jest.fn().mockImplementation((gameId) => ({
    gameId,
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      onFirst: '',
      onSecond: '',
      onThird: '',
      log: []
    },
    home: {
      id: 'HOME_TEAM',
      displayName: 'Home Team',
      shortName: 'HOME',
      currentPitcher: 'PITCHER_001',
      lineup: [],
      stats: {
        innings: [],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: null
    },
    visitors: {
      id: 'AWAY_TEAM',
      displayName: 'Away Team',
      shortName: 'AWAY',
      currentPitcher: 'PITCHER_002',
      lineup: [],
      stats: {
        innings: [],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: null
    },
    currentPlay: 0,
    gameType: 'replay'
  }))
}));

jest.mock('../../database/repositories/PlayRepository', () => ({
  playRepository: {
    getNextPlay: jest.fn().mockResolvedValue({
      gid: 'TEST_GAME_001',
      pn: 1,
      inning: 1,
      top_bot: 0,
      batteam: 'AWAY_TEAM',
      pitteam: 'HOME_TEAM',
      batter: 'BATTER_001',
      pitcher: 'PITCHER_001',
      outs_pre: 0,
      outs_post: 1,
      event: 'S8',
      runs: 0
    })
  }
}));

describe('Game Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/game', GameRouter);
    app.use(errorMiddleware);
  });

  describe('POST /api/game/createGame', () => {
    it('should create a new game with valid team IDs', async () => {
      const requestBody: CreateGameRequest = {
        homeTeamId: 'HOME_TEAM',
        visitingTeamId: 'AWAY_TEAM'
      };

      const response = await request(app)
        .post('/api/game/createGame')
        .send(requestBody)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('gameId');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('gameState');
      expect(response.body.gameState.home.id).toBe('HOME_TEAM');
      expect(response.body.gameState.visitors.id).toBe('AWAY_TEAM');
    });

    it('should return 400 when missing required fields', async () => {
      const response = await request(app)
        .post('/api/game/createGame')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when team IDs are invalid', async () => {
      const response = await request(app)
        .post('/api/game/createGame')
        .send({
          homeTeamId: '',
          visitingTeamId: 'AWAY_TEAM'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/game/init/:gameId', () => {
    it('should initialize a game with valid game ID', async () => {
      const response = await request(app)
        .get('/api/game/init/TEST_GAME_001')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('gameId', 'TEST_GAME_001');
      expect(response.body).toHaveProperty('game');
      expect(response.body).toHaveProperty('home');
      expect(response.body).toHaveProperty('visitors');
    });

    it('should return 400 when game ID is missing', async () => {
      const response = await request(app)
        .get('/api/game/init/')
        .expect(404); // Express returns 404 for missing route parameters
    });
  });

  describe('GET /api/game/next/:gameId', () => {
    it('should get the next play for a valid game ID', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('currentPlayData');
      expect(response.body.currentPlayData).toHaveProperty('gid', 'TEST_GAME_001');
      expect(response.body.currentPlayData).toHaveProperty('event', 'S8');
    });

    it('should accept a currentPlay query parameter', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('currentPlayData');
    });
  });

  // Additional tests for other endpoints can be added here
});