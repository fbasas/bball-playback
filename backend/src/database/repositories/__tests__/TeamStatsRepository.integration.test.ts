/**
 * TeamStatsRepository Integration Tests
 *
 * Tests TeamStatsRepository methods against real Retrosheet database.
 * Skipped by default — set INTEGRATION_TEST_DB=true to enable.
 *
 * Usage:
 *   cd backend
 *   INTEGRATION_TEST_DB=true npx jest TeamStatsRepository.integration --verbose --no-coverage
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
let TeamStatsRepository: any;
let teamStatsRepository: any;
let db: any;

describeIf('TeamStatsRepository Integration Tests', () => {
  let validationDb: Knex;
  let homeTeamId: string;
  let visitorTeamId: string;

  beforeAll(async () => {
    // Lazy-load modules
    const teamStatsRepo = await import('../TeamStatsRepository');
    TeamStatsRepository = teamStatsRepo.TeamStatsRepository;
    teamStatsRepository = teamStatsRepo.teamStatsRepository;
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
  });

  afterAll(async () => {
    if (validationDb) await validationDb.destroy();
    if (db) await db.destroy();
  });

  describe('getTeamStatsForGame', () => {
    it('returns stats for both teams', async () => {
      const startTime = Date.now();
      const teamStats = await teamStatsRepository.getTeamStatsForGame(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Should have exactly 2 teams
      expect(teamStats).toHaveLength(2);

      // Each team should have lineup data
      for (const stats of teamStats) {
        expect(stats).toHaveProperty('team');
        expect(stats).toHaveProperty('start_l1');
        expect(stats).toHaveProperty('start_l2');
        expect(stats).toHaveProperty('start_l3');
        expect(stats).toHaveProperty('start_l4');
        expect(stats).toHaveProperty('start_l5');
        expect(stats).toHaveProperty('start_l6');
        expect(stats).toHaveProperty('start_l7');
        expect(stats).toHaveProperty('start_l8');
        expect(stats).toHaveProperty('start_l9');
        expect(stats).toHaveProperty('start_f1'); // Starting pitcher
      }

      // Validate teams match expected
      const teamIds = teamStats.map((s: any) => s.team);
      expect(teamIds).toContain(homeTeamId);
      expect(teamIds).toContain(visitorTeamId);

      // Performance check (allow more time for remote DB, first call is uncached)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns empty array for non-existent game', async () => {
      const teamStats = await teamStatsRepository.getTeamStatsForGame('NONEXISTENT_GAME');
      expect(teamStats).toHaveLength(0);
    });

    it('caches results on repeated calls', async () => {
      // First call populates cache
      await teamStatsRepository.getTeamStatsForGame(TEST_GAME_ID);

      // Second call should be faster (from cache)
      const startTime = Date.now();
      await teamStatsRepository.getTeamStatsForGame(TEST_GAME_ID);
      const elapsed = Date.now() - startTime;

      // Cache hit should be < 5ms
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('getStartingLineup', () => {
    it('returns 9 batters in lineup for home team', async () => {
      const startTime = Date.now();
      const lineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);
      const elapsed = Date.now() - startTime;

      // Should have batting order
      expect(lineup).toHaveProperty('battingOrder');
      expect(lineup).toHaveProperty('pitcher');

      // Should have 9 batters
      expect(lineup.battingOrder.length).toBe(9);

      // All batters should be non-empty strings (player IDs)
      for (const batterId of lineup.battingOrder) {
        expect(typeof batterId).toBe('string');
        expect(batterId.length).toBeGreaterThan(0);
      }

      // Should have a pitcher
      expect(lineup.pitcher).not.toBeNull();
      expect(typeof lineup.pitcher).toBe('string');

      // Performance check (allow more time for remote DB)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns 9 batters in lineup for visitor team', async () => {
      const lineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, visitorTeamId);

      expect(lineup.battingOrder.length).toBe(9);
      expect(lineup.pitcher).not.toBeNull();
    });

    it('validates lineup against direct query', async () => {
      const lineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);

      // Get from database directly
      const dbResult = await validationDb('teamstats')
        .where({ gid: TEST_GAME_ID, team: homeTeamId })
        .first();

      expect(dbResult).not.toBeNull();

      // Compare batting order
      expect(lineup.battingOrder[0]).toBe(dbResult.start_l1);
      expect(lineup.battingOrder[1]).toBe(dbResult.start_l2);
      expect(lineup.battingOrder[2]).toBe(dbResult.start_l3);
      expect(lineup.battingOrder[3]).toBe(dbResult.start_l4);
      expect(lineup.battingOrder[4]).toBe(dbResult.start_l5);
      expect(lineup.battingOrder[5]).toBe(dbResult.start_l6);
      expect(lineup.battingOrder[6]).toBe(dbResult.start_l7);
      expect(lineup.battingOrder[7]).toBe(dbResult.start_l8);
      expect(lineup.battingOrder[8]).toBe(dbResult.start_l9);

      // Compare pitcher
      expect(lineup.pitcher).toBe(dbResult.start_f1);
    });

    it('returns empty lineup for non-existent team', async () => {
      const lineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, 'NONEXISTENT_TEAM');

      expect(lineup.battingOrder).toHaveLength(0);
      expect(lineup.pitcher).toBeNull();
    });

    it('caches results on repeated calls', async () => {
      // First call populates cache
      await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);

      // Second call should be faster (from cache)
      const startTime = Date.now();
      await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);
      const elapsed = Date.now() - startTime;

      // Cache hit should be < 5ms
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('getStartingPitcher', () => {
    it('returns starting pitcher for home team', async () => {
      const pitcher = await teamStatsRepository.getStartingPitcher(TEST_GAME_ID, homeTeamId);

      expect(pitcher).not.toBeNull();
      expect(typeof pitcher).toBe('string');
      expect(pitcher.length).toBeGreaterThan(0);

      // Validate against direct query
      const dbResult = await validationDb('teamstats')
        .where({ gid: TEST_GAME_ID, team: homeTeamId })
        .first();
      expect(pitcher).toBe(dbResult.start_f1);
    });

    it('returns starting pitcher for visitor team', async () => {
      const pitcher = await teamStatsRepository.getStartingPitcher(TEST_GAME_ID, visitorTeamId);

      expect(pitcher).not.toBeNull();
      expect(typeof pitcher).toBe('string');

      // Validate against direct query
      const dbResult = await validationDb('teamstats')
        .where({ gid: TEST_GAME_ID, team: visitorTeamId })
        .first();
      expect(pitcher).toBe(dbResult.start_f1);
    });

    it('returns null for non-existent team', async () => {
      const pitcher = await teamStatsRepository.getStartingPitcher(TEST_GAME_ID, 'NONEXISTENT_TEAM');
      expect(pitcher).toBeNull();
    });
  });

  describe('data quality validation', () => {
    it('all lineup players are valid player IDs', async () => {
      const homeLineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);
      const visitorLineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, visitorTeamId);

      // Collect all player IDs from lineups
      const allPlayerIds = [
        ...homeLineup.battingOrder,
        ...visitorLineup.battingOrder,
        homeLineup.pitcher,
        visitorLineup.pitcher,
      ].filter(Boolean);

      // All should be non-empty strings (Retrosheet IDs vary in format)
      for (const playerId of allPlayerIds) {
        expect(typeof playerId).toBe('string');
        expect(playerId.length).toBeGreaterThan(0);
      }
    });

    it('no duplicate players in lineup', async () => {
      const homeLineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);
      const visitorLineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, visitorTeamId);

      // Check for duplicates in home lineup
      const homeSet = new Set(homeLineup.battingOrder);
      expect(homeSet.size).toBe(homeLineup.battingOrder.length);

      // Check for duplicates in visitor lineup
      const visitorSet = new Set(visitorLineup.battingOrder);
      expect(visitorSet.size).toBe(visitorLineup.battingOrder.length);
    });

    it('lineups contain players who actually played in game', async () => {
      const homeLineup = await teamStatsRepository.getStartingLineup(TEST_GAME_ID, homeTeamId);

      // Get all batters who appeared in the game
      const gameBatters = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .distinct('batter')
        .pluck('batter');

      const batterSet = new Set(gameBatters);

      // At least some lineup players should appear as batters
      const matchCount = homeLineup.battingOrder.filter((p: string) => batterSet.has(p)).length;
      expect(matchCount).toBeGreaterThan(0);
    });
  });
});
