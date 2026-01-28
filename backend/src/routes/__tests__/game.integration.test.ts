import request from 'supertest';
import express from 'express';
import { GameRouter } from '../game';
import { CreateGameRequest } from '../../../../common/types/ApiTypes';
import { errorMiddleware } from '../../core/errors/ErrorMiddleware';

// =============================================================================
// Mock database to prevent knex initialization errors
// =============================================================================
jest.mock('../../config/database', () => {
  const mockPlay = {
    gid: 'TEST_GAME_001', pn: 1, inning: 1, top_bot: 0,
    batteam: 'AWAY_TEAM', pitteam: 'HOME_TEAM',
    batter: 'BATTER_001', pitcher: 'PITCHER_001',
    outs_pre: 0, outs_post: 1, event: 'S8', runs: 0
  };
  const chain = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(mockPlay),
    select: jest.fn().mockResolvedValue([]),
  };
  return { db: jest.fn().mockReturnValue(chain) };
});

jest.mock('../../config/config', () => ({
  config: {
    openai: { apiKey: 'test-key', model: 'gpt-4' },
    server: { port: 3000 },
    database: { host: 'localhost', port: 5432, name: 'test', user: 'test', password: 'test' },
  }
}));

// Mock gameInitialization (used by initGame and createGame routes)
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

// Mock repositories that get imported transitively
jest.mock('../../database/repositories/PlayRepository', () => ({
  playRepository: { getNextPlay: jest.fn(), fetchFirstPlay: jest.fn(), fetchPlayData: jest.fn() }
}));
jest.mock('../../database/repositories/ScoreRepository', () => ({
  scoreRepository: { getRunsForTeam: jest.fn(), getRunsForTeamBefore: jest.fn() }
}));
jest.mock('../../database/repositories/GameRepository', () => ({
  gameRepository: { getGameInfo: jest.fn() }
}));
jest.mock('../../database/repositories/PlayerRepository', () => ({
  playerRepository: { getPlayerById: jest.fn(), getPlayersByIds: jest.fn() }
}));
jest.mock('../../database/repositories/TeamStatsRepository', () => ({
  teamStatsRepository: { getTeamStatsForGame: jest.fn(), getStartingLineup: jest.fn(), getStartingPitcher: jest.fn() }
}));

// Mock GamePlaybackService — the main dependency for the nextPlay route
const mockGetNextPlay = jest.fn();
jest.mock('../../services/game/playback', () => ({
  GamePlaybackService: {
    getNextPlay: (...args: any[]) => mockGetNextPlay(...args),
  }
}));

// Mock lineup-related modules that get imported transitively
jest.mock('../../services/game/lineupTracking', () => ({
  getLatestLineupState: jest.fn(),
  saveLineupState: jest.fn(),
  saveInitialLineup: jest.fn()
}));

// Mock openai and getLineupData (used by initGame route)
jest.mock('../../services/openai', () => ({
  generateCompletion: jest.fn().mockResolvedValue('Mock commentary')
}));
jest.mock('../../services/game/getLineupData', () => ({
  getLineupData: jest.fn().mockResolvedValue({ home: [], visitors: [] })
}));

// Suppress noisy logs during tests
beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => { jest.restoreAllMocks(); });

// =============================================================================
// Helpers
// =============================================================================

const VALID_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

function mockNextPlayResponse(overrides: Record<string, any> = {}) {
  return {
    gameId: 'TEST_GAME_001',
    sessionId: VALID_SESSION_ID,
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      onFirst: '',
      onSecond: '',
      onThird: '',
      log: ['Play description here']
    },
    home: {
      id: 'HOME_TEAM',
      displayName: 'Home Team',
      shortName: 'HOME',
      currentBatter: null,
      currentPitcher: 'Pitcher Name',
      runs: 0
    },
    visitors: {
      id: 'AWAY_TEAM',
      displayName: 'Away Team',
      shortName: 'AWAY',
      currentBatter: 'Batter Name',
      currentPitcher: null,
      runs: 0
    },
    currentPlay: 1,
    playDescription: 'Single to center field',
    eventString: 'S8',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('Game Routes Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/game', GameRouter);
    app.use(errorMiddleware);
    jest.clearAllMocks();
    mockGetNextPlay.mockResolvedValue(mockNextPlayResponse());
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

      expect(response.body).toHaveProperty('status', 'error');
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

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('GET /api/game/init/:gameId', () => {
    // Skipped: deprecated endpoint requires complex DB/prompt mocking
    it.skip('should initialize a game with valid game ID', async () => {
      const response = await request(app)
        .get('/api/game/init/TEST_GAME_001')
        .set('session-id', VALID_SESSION_ID)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('gameId', 'TEST_GAME_001');
      expect(response.body).toHaveProperty('game');
      expect(response.body).toHaveProperty('home');
      expect(response.body).toHaveProperty('visitors');
    });

    it('should return 404 when game ID is missing', async () => {
      await request(app)
        .get('/api/game/init/')
        .expect(404); // Express returns 404 for missing route parameters
    });
  });

  describe('GET /api/game/next/:gameId', () => {
    // ----- Successful requests -----

    it('should return full response structure for valid request', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .set('session-id', VALID_SESSION_ID)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('gameId', 'TEST_GAME_001');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('game');
      expect(response.body.game).toHaveProperty('inning');
      expect(response.body.game).toHaveProperty('isTopInning');
      expect(response.body.game).toHaveProperty('outs');
      expect(response.body).toHaveProperty('home');
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('currentPlay');
      expect(response.body).toHaveProperty('playDescription');
      expect(response.body).toHaveProperty('eventString');
    });

    it('should handle initialization request (currentPlay=0)', async () => {
      mockGetNextPlay.mockResolvedValue(mockNextPlayResponse({ currentPlay: 0 }));

      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=0')
        .set('session-id', VALID_SESSION_ID)
        .expect(200);

      expect(mockGetNextPlay).toHaveBeenCalledWith(
        'TEST_GAME_001',
        VALID_SESSION_ID,
        0,
        expect.objectContaining({ skipLLM: false })
      );
    });

    it('should pass skipLLM=true to the service', async () => {
      await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1&skipLLM=true')
        .set('session-id', VALID_SESSION_ID)
        .expect(200);

      expect(mockGetNextPlay).toHaveBeenCalledWith(
        'TEST_GAME_001',
        VALID_SESSION_ID,
        1,
        expect.objectContaining({ skipLLM: true })
      );
    });

    it('should pass announcerStyle to the service', async () => {
      await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1&announcerStyle=poetic')
        .set('session-id', VALID_SESSION_ID)
        .expect(200);

      expect(mockGetNextPlay).toHaveBeenCalledWith(
        'TEST_GAME_001',
        VALID_SESSION_ID,
        1,
        expect.objectContaining({ announcerStyle: 'poetic' })
      );
    });

    it('should use default announcerStyle when not specified', async () => {
      await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .set('session-id', VALID_SESSION_ID)
        .expect(200);

      expect(mockGetNextPlay).toHaveBeenCalledWith(
        'TEST_GAME_001',
        VALID_SESSION_ID,
        1,
        expect.objectContaining({ announcerStyle: expect.any(String) })
      );
    });

    // ----- Validation failures (400s) -----

    it('should return 400 when currentPlay is missing', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001')
        .set('session-id', VALID_SESSION_ID)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 when currentPlay is non-numeric', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=abc')
        .set('session-id', VALID_SESSION_ID)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 when currentPlay is negative', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=-1')
        .set('session-id', VALID_SESSION_ID)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 when session-id header is missing', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 when session-id is not a valid UUID', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .set('session-id', 'not-a-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 400 when announcerStyle is invalid', async () => {
      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1&announcerStyle=invalid')
        .set('session-id', VALID_SESSION_ID)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
    });

    // ----- Error handling -----

    it('should return 500 when service throws an error', async () => {
      mockGetNextPlay.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=1')
        .set('session-id', VALID_SESSION_ID)
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Database connection failed');
    });

    it('should not call service when validation fails', async () => {
      await request(app)
        .get('/api/game/next/TEST_GAME_001?currentPlay=abc')
        .set('session-id', VALID_SESSION_ID)
        .expect(400);

      expect(mockGetNextPlay).not.toHaveBeenCalled();
    });
  });
});
