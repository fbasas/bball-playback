/**
 * PlayRepository Integration Tests
 *
 * Tests PlayRepository methods against real Retrosheet database.
 * Skipped by default — set INTEGRATION_TEST_DB=true to enable.
 *
 * Usage:
 *   cd backend
 *   INTEGRATION_TEST_DB=true npx jest PlayRepository.integration --verbose --no-coverage
 */

import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Skip unless INTEGRATION_TEST_DB is set
const RUN_INTEGRATION = process.env.INTEGRATION_TEST_DB === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

// Test constants - World Series 2024 Game 5
const TEST_GAME_ID = 'NYA202410300';

// Lazy imports to avoid config validation when skipped
let PlayRepository: any;
let playRepository: any;
let ResourceNotFoundError: any;
let db: any;

describeIf('PlayRepository Integration Tests', () => {
  let validationDb: Knex;

  beforeAll(async () => {
    // Lazy-load modules
    const playRepo = await import('../PlayRepository');
    PlayRepository = playRepo.PlayRepository;
    playRepository = playRepo.playRepository;
    const errors = await import('../../../types/errors/GameErrors');
    ResourceNotFoundError = errors.ResourceNotFoundError;
    const database = await import('../../../config/database');
    db = database.db;

    // Create separate validation connection
    validationDb = knex({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      },
    });
  });

  afterAll(async () => {
    if (validationDb) await validationDb.destroy();
    if (db) await db.destroy();
  });

  describe('fetchFirstPlay', () => {
    it('returns correct first play data for known game', async () => {
      const startTime = Date.now();
      const firstPlay = await playRepository.fetchFirstPlay(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Verify structure
      expect(firstPlay).toHaveProperty('gid', TEST_GAME_ID);
      expect(firstPlay).toHaveProperty('pn');
      expect(firstPlay).toHaveProperty('inning');
      expect(firstPlay).toHaveProperty('top_bot');
      expect(firstPlay).toHaveProperty('batteam');
      expect(firstPlay).toHaveProperty('pitteam');
      expect(firstPlay).toHaveProperty('event');

      // First play should be pn=1
      expect(firstPlay.pn).toBe(1);
      // First play should be top of 1st inning
      expect(firstPlay.inning).toBe(1);
      expect(firstPlay.top_bot).toBe(0);

      // Validate against direct query
      const dbResult = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .orderBy('pn', 'asc')
        .first();
      expect(firstPlay.pn).toBe(dbResult.pn);
      expect(firstPlay.batteam).toBe(dbResult.batteam);

      // Performance check (allow more time for remote DB)
      expect(elapsed).toBeLessThan(1000);
    });

    it('throws ResourceNotFoundError for non-existent game', async () => {
      await expect(playRepository.fetchFirstPlay('NONEXISTENT_GAME'))
        .rejects
        .toThrow(ResourceNotFoundError);
    });

    it('caches results on repeated calls', async () => {
      // First call populates cache
      await playRepository.fetchFirstPlay(TEST_GAME_ID);

      // Second call should be faster (from cache)
      const startTime = Date.now();
      await playRepository.fetchFirstPlay(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Cache hit should be < 5ms
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('fetchPlayData', () => {
    it('returns current and next play for valid play number', async () => {
      const startTime = Date.now();
      const result = await playRepository.fetchPlayData(TEST_GAME_ID, 5);
      const elapsed = Date.now() - startTime;

      // Verify structure
      expect(result).toHaveProperty('currentPlayData');
      expect(result).toHaveProperty('nextPlayData');

      // Current play should be pn=5
      expect(result.currentPlayData.pn).toBe(5);
      expect(result.currentPlayData.gid).toBe(TEST_GAME_ID);

      // Next play should be pn=6
      expect(result.nextPlayData.pn).toBe(6);
      expect(result.nextPlayData.gid).toBe(TEST_GAME_ID);

      // Both should have required fields
      expect(result.currentPlayData).toHaveProperty('inning');
      expect(result.currentPlayData).toHaveProperty('outs_pre');
      expect(result.nextPlayData).toHaveProperty('event');

      // Performance check (allow more time for remote DB)
      expect(elapsed).toBeLessThan(1000);
    });

    it('handles currentPlay=0 initialization case', async () => {
      const result = await playRepository.fetchPlayData(TEST_GAME_ID, 0);

      // Current play should be a dummy play at pn=0
      expect(result.currentPlayData.pn).toBe(0);
      expect(result.currentPlayData.inning).toBe(1);
      expect(result.currentPlayData.top_bot).toBe(0);

      // Next play should be the actual first play
      expect(result.nextPlayData.pn).toBe(1);
    });

    it('throws ResourceNotFoundError for play beyond game end', async () => {
      // Get max play number
      const maxResult = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .max('pn as maxPn')
        .first();
      const maxPn = maxResult?.maxPn || 0;

      // Request next play after last should fail
      await expect(playRepository.fetchPlayData(TEST_GAME_ID, maxPn))
        .rejects
        .toThrow(ResourceNotFoundError);
    });
  });

  describe('fetchAllPlaysForGame', () => {
    it('returns all plays for a game in order', async () => {
      const startTime = Date.now();
      const plays = await playRepository.fetchAllPlaysForGame(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Should have many plays
      expect(plays.length).toBeGreaterThan(50);

      // Verify ordering
      for (let i = 1; i < plays.length; i++) {
        expect(plays[i].pn).toBeGreaterThan(plays[i - 1].pn);
      }

      // First play should be pn=1
      expect(plays[0].pn).toBe(1);

      // Validate count against direct query
      const countResult = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .count('* as count')
        .first();
      expect(plays.length).toBe(Number(countResult?.count));

      // Performance check (allow more time for full fetch)
      expect(elapsed).toBeLessThan(500);
    });

    it('throws ResourceNotFoundError for non-existent game', async () => {
      await expect(playRepository.fetchAllPlaysForGame('NONEXISTENT_GAME'))
        .rejects
        .toThrow(ResourceNotFoundError);
    });
  });

  describe('fetchPlaysUpTo', () => {
    it('returns plays up to specified play number', async () => {
      const upToPlay = 10;
      const plays = await playRepository.fetchPlaysUpTo(TEST_GAME_ID, upToPlay);

      // Should have plays 1-9 (exclusive of upToPlay)
      expect(plays.length).toBe(9);

      // All plays should be < upToPlay
      for (const play of plays) {
        expect(play.pn).toBeLessThan(upToPlay);
      }

      // Should be in order
      for (let i = 1; i < plays.length; i++) {
        expect(plays[i].pn).toBeGreaterThan(plays[i - 1].pn);
      }
    });

    it('returns empty array for upToPlay=1', async () => {
      const plays = await playRepository.fetchPlaysUpTo(TEST_GAME_ID, 1);
      expect(plays).toHaveLength(0);
    });
  });

  describe('fetchPlayForBatter', () => {
    it('finds play for a known batter', async () => {
      // Get a batter from the first play
      const firstPlay = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .orderBy('pn', 'asc')
        .first();

      const batterId = firstPlay.batter;
      const play = await playRepository.fetchPlayForBatter(TEST_GAME_ID, batterId);

      expect(play).not.toBeNull();
      expect(play?.batter).toBe(batterId);
      expect(play?.gid).toBe(TEST_GAME_ID);
    });

    it('returns null for non-existent batter', async () => {
      const play = await playRepository.fetchPlayForBatter(TEST_GAME_ID, 'NONEXISTENT_BATTER');
      expect(play).toBeNull();
    });
  });
});
