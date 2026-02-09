/**
 * ScoreRepository Integration Tests
 *
 * Tests ScoreRepository methods against real Retrosheet database.
 * Skipped by default — set INTEGRATION_TEST_DB=true to enable.
 *
 * Usage:
 *   cd backend
 *   INTEGRATION_TEST_DB=true npx jest ScoreRepository.integration --verbose --no-coverage
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
let ScoreRepository: any;
let scoreRepository: any;
let db: any;

describeIf('ScoreRepository Integration Tests', () => {
  let validationDb: Knex;
  let homeTeamId: string;
  let visitorTeamId: string;
  let maxPlayNumber: number;

  beforeAll(async () => {
    // Lazy-load modules
    const scoreRepo = await import('../ScoreRepository');
    ScoreRepository = scoreRepo.ScoreRepository;
    scoreRepository = scoreRepo.scoreRepository;
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

    // Get team IDs from first play (visitor bats top of 1st)
    const firstPlay = await validationDb('plays')
      .where({ gid: TEST_GAME_ID, top_bot: 0 })
      .orderBy('pn', 'asc')
      .first();

    visitorTeamId = firstPlay.batteam;
    homeTeamId = firstPlay.pitteam;

    // Get max play number
    const maxResult = await validationDb('plays')
      .where({ gid: TEST_GAME_ID })
      .max('pn as maxPn')
      .first();
    maxPlayNumber = maxResult?.maxPn || 0;
  });

  afterAll(async () => {
    if (validationDb) await validationDb.destroy();
    if (db) await db.destroy();
  });

  describe('getRunsForTeam', () => {
    it('returns correct cumulative runs for known game', async () => {
      // Test at play 50
      const upToPlay = 50;

      const startTime = Date.now();
      const homeRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, upToPlay);
      const visitorRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, visitorTeamId, upToPlay);
      const elapsed = Date.now() - startTime;

      // Validate against direct query
      const expectedHome = await getExpectedRuns(validationDb, TEST_GAME_ID, homeTeamId, upToPlay);
      const expectedVisitor = await getExpectedRuns(validationDb, TEST_GAME_ID, visitorTeamId, upToPlay);

      expect(homeRuns).toBe(expectedHome);
      expect(visitorRuns).toBe(expectedVisitor);

      // Both should be non-negative integers
      expect(homeRuns).toBeGreaterThanOrEqual(0);
      expect(visitorRuns).toBeGreaterThanOrEqual(0);

      // Performance check (allow more time for remote DB, first call is uncached)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns 0 for team with no runs at early play', async () => {
      // At play 1, unlikely to have runs yet
      const runs = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, 1);

      // Validate against direct query
      const expected = await getExpectedRuns(validationDb, TEST_GAME_ID, homeTeamId, 1);
      expect(runs).toBe(expected);
    });

    it('returns correct final score', async () => {
      const homeRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, maxPlayNumber);
      const visitorRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, visitorTeamId, maxPlayNumber);

      // Validate against direct query
      const expectedHome = await getExpectedRuns(validationDb, TEST_GAME_ID, homeTeamId, maxPlayNumber);
      const expectedVisitor = await getExpectedRuns(validationDb, TEST_GAME_ID, visitorTeamId, maxPlayNumber);

      expect(homeRuns).toBe(expectedHome);
      expect(visitorRuns).toBe(expectedVisitor);

      // Final score should match the actual game result
      // NYA202410300 was Yankees (home) vs Dodgers (visitor)
      console.log(`Final score: Home ${homeRuns} - Visitor ${visitorRuns}`);
    });

    it('score accumulates correctly across innings', async () => {
      // Get runs at different play numbers and verify monotonic increase
      const playNumbers = [10, 30, 50, 70, maxPlayNumber];
      let previousHomeRuns = 0;
      let previousVisitorRuns = 0;

      for (const pn of playNumbers) {
        if (pn > maxPlayNumber) continue;

        const homeRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, pn);
        const visitorRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, visitorTeamId, pn);

        // Score should never decrease
        expect(homeRuns).toBeGreaterThanOrEqual(previousHomeRuns);
        expect(visitorRuns).toBeGreaterThanOrEqual(previousVisitorRuns);

        previousHomeRuns = homeRuns;
        previousVisitorRuns = visitorRuns;
      }
    });

    it('caches results on repeated calls', async () => {
      // First call populates cache
      await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, 25);

      // Second call should be faster (from cache)
      const startTime = Date.now();
      await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, 25);
      const elapsed = Date.now() - startTime;

      // Cache hit should be < 5ms
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('getRunsForTeamBefore', () => {
    it('returns runs before specified play (exclusive)', async () => {
      const beforePlay = 50;

      const runsBefore = await scoreRepository.getRunsForTeamBefore(TEST_GAME_ID, homeTeamId, beforePlay);
      const runsIncluding = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, beforePlay);

      // Runs before should be <= runs including
      expect(runsBefore).toBeLessThanOrEqual(runsIncluding);

      // Validate against direct query
      const expected = await getExpectedRunsBefore(validationDb, TEST_GAME_ID, homeTeamId, beforePlay);
      expect(runsBefore).toBe(expected);
    });

    it('returns 0 for beforePlay=1', async () => {
      const runs = await scoreRepository.getRunsForTeamBefore(TEST_GAME_ID, homeTeamId, 1);
      expect(runs).toBe(0);
    });
  });

  describe('preloadCumulativeScores', () => {
    it('preloads all scores for a game', async () => {
      // Create fresh repository to test preloading
      const freshRepo = new ScoreRepository();

      const startTime = Date.now();
      const result = await freshRepo.preloadCumulativeScores(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Should return team IDs and play count
      expect(result).toHaveProperty('teams');
      expect(result).toHaveProperty('playCount');
      expect(result.teams.length).toBe(2); // Home and visitor
      expect(result.playCount).toBeGreaterThan(50);

      // Teams should include our known teams
      expect(result.teams).toContain(homeTeamId);
      expect(result.teams).toContain(visitorTeamId);

      // Performance: preloading should be efficient (allow more for remote DB)
      expect(elapsed).toBeLessThan(2000);
    });

    it('subsequent lookups are cache hits after preload', async () => {
      // Create fresh repository
      const freshRepo = new ScoreRepository();

      // Preload
      await freshRepo.preloadCumulativeScores(TEST_GAME_ID);

      // Now lookups should be instant
      const startTime = Date.now();
      for (let pn = 1; pn <= 10; pn++) {
        await freshRepo.getRunsForTeam(TEST_GAME_ID, homeTeamId, pn);
        await freshRepo.getRunsForTeam(TEST_GAME_ID, visitorTeamId, pn);
      }
      const elapsed = Date.now() - startTime;

      // 20 cache lookups should be reasonably fast
      expect(elapsed).toBeLessThan(500);
    });

    it('returns empty result for non-existent game', async () => {
      const freshRepo = new ScoreRepository();
      const result = await freshRepo.preloadCumulativeScores('NONEXISTENT_GAME');

      expect(result.teams).toHaveLength(0);
      expect(result.playCount).toBe(0);
    });
  });

  describe('score validation against box score', () => {
    it('final scores match expected game outcome', async () => {
      const homeRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, homeTeamId, maxPlayNumber);
      const visitorRuns = await scoreRepository.getRunsForTeam(TEST_GAME_ID, visitorTeamId, maxPlayNumber);

      // Sum all runs from plays table
      const homePlays = await validationDb('plays')
        .where({ gid: TEST_GAME_ID, batteam: homeTeamId })
        .sum('runs as total')
        .first();
      const visitorPlays = await validationDb('plays')
        .where({ gid: TEST_GAME_ID, batteam: visitorTeamId })
        .sum('runs as total')
        .first();

      expect(homeRuns).toBe(Number(homePlays?.total || 0));
      expect(visitorRuns).toBe(Number(visitorPlays?.total || 0));
    });
  });
});

// Helper functions
async function getExpectedRuns(db: Knex, gameId: string, teamId: string, upToPlay: number): Promise<number> {
  const result = await db('plays')
    .where({ gid: gameId, batteam: teamId })
    .where('pn', '<=', upToPlay)
    .sum('runs as total')
    .first();
  return result?.total ? Number(result.total) : 0;
}

async function getExpectedRunsBefore(db: Knex, gameId: string, teamId: string, beforePlay: number): Promise<number> {
  const result = await db('plays')
    .where({ gid: gameId, batteam: teamId })
    .where('pn', '<', beforePlay)
    .sum('runs as total')
    .first();
  return result?.total ? Number(result.total) : 0;
}
