/**
 * PlayerRepository Integration Tests
 *
 * Tests PlayerRepository methods against real Retrosheet database.
 * Skipped by default — set INTEGRATION_TEST_DB=true to enable.
 *
 * Usage:
 *   cd backend
 *   INTEGRATION_TEST_DB=true npx jest PlayerRepository.integration --verbose --no-coverage
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
let PlayerRepository: any;
let playerRepository: any;
let db: any;

describeIf('PlayerRepository Integration Tests', () => {
  let validationDb: Knex;
  let testPlayerIds: string[] = [];

  beforeAll(async () => {
    // Lazy-load modules
    const playerRepo = await import('../PlayerRepository');
    PlayerRepository = playerRepo.PlayerRepository;
    playerRepository = playerRepo.playerRepository;
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

    // Get real player IDs from the test game for testing
    const plays = await validationDb('plays')
      .where({ gid: TEST_GAME_ID })
      .distinct('batter')
      .pluck('batter');
    testPlayerIds = plays.slice(0, 5); // Get first 5 unique batters
  });

  afterAll(async () => {
    if (validationDb) await validationDb.destroy();
    if (db) await db.destroy();
  });

  describe('getPlayerById', () => {
    it('returns correct player info for known player', async () => {
      // Use first test player
      const playerId = testPlayerIds[0];

      const startTime = Date.now();
      const playerInfo = await playerRepository.getPlayerById(playerId);
      const elapsed = Date.now() - startTime;

      // Verify structure
      expect(playerInfo).toHaveProperty('id', playerId);
      expect(playerInfo).toHaveProperty('firstName');
      expect(playerInfo).toHaveProperty('lastName');
      expect(playerInfo).toHaveProperty('fullName');

      // Validate against direct query
      const dbResult = await validationDb('allplayers')
        .where({ id: playerId })
        .first();

      if (dbResult) {
        expect(playerInfo.firstName).toBe(dbResult.first || '');
        expect(playerInfo.lastName).toBe(dbResult.last || '');
        expect(playerInfo.fullName).toBe(`${dbResult.first || ''} ${dbResult.last || ''}`.trim());
      }

      // Performance check (allow more time for remote DB, first call is uncached)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns default player info for unknown player ID', async () => {
      const unknownId = 'UNKNOWN_PLAYER_XYZ';
      const playerInfo = await playerRepository.getPlayerById(unknownId);

      // Should return a default player with ID as name
      expect(playerInfo).not.toBeNull();
      expect(playerInfo.id).toBe(unknownId);
      expect(playerInfo.lastName).toBe(unknownId);
      expect(playerInfo.fullName).toBe(unknownId);
    });

    it('returns null for empty player ID', async () => {
      const playerInfo = await playerRepository.getPlayerById('');
      expect(playerInfo).toBeNull();
    });

    it('caches results on repeated calls', async () => {
      const playerId = testPlayerIds[0];

      // First call populates cache
      await playerRepository.getPlayerById(playerId);

      // Second call should be faster (from cache)
      const startTime = Date.now();
      await playerRepository.getPlayerById(playerId);
      const elapsed = Date.now() - startTime;

      // Cache hit should be < 5ms
      expect(elapsed).toBeLessThan(5);
    });
  });

  describe('getPlayersByIds', () => {
    it('returns map of player info for multiple players', async () => {
      const startTime = Date.now();
      const playerMap = await playerRepository.getPlayersByIds(testPlayerIds);
      const elapsed = Date.now() - startTime;

      // Should have all requested players
      expect(playerMap.size).toBe(testPlayerIds.length);

      // Each player should have correct structure
      for (const playerId of testPlayerIds) {
        expect(playerMap.has(playerId)).toBe(true);
        const info = playerMap.get(playerId);
        expect(info).toHaveProperty('id', playerId);
        expect(info).toHaveProperty('firstName');
        expect(info).toHaveProperty('lastName');
        expect(info).toHaveProperty('fullName');
      }

      // Performance check (allow more time for remote DB)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns empty map for empty array', async () => {
      const playerMap = await playerRepository.getPlayersByIds([]);
      expect(playerMap.size).toBe(0);
    });

    it('handles mix of known and unknown players', async () => {
      const mixedIds = [...testPlayerIds.slice(0, 2), 'UNKNOWN_PLAYER_123'];
      const playerMap = await playerRepository.getPlayersByIds(mixedIds);

      // Should have all 3 entries
      expect(playerMap.size).toBe(3);

      // Unknown player should have default info
      const unknownInfo = playerMap.get('UNKNOWN_PLAYER_123');
      expect(unknownInfo?.fullName).toBe('UNKNOWN_PLAYER_123');
    });

    it('efficiently handles large batches', async () => {
      // Get 30+ players from the game
      const allBatters = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .distinct('batter')
        .pluck('batter');

      const startTime = Date.now();
      const playerMap = await playerRepository.getPlayersByIds(allBatters);
      const elapsed = Date.now() - startTime;

      expect(playerMap.size).toBe(allBatters.length);

      // Should handle batch efficiently (allow more time for remote DB)
      expect(elapsed).toBeLessThan(2000);
    });
  });

  describe('getPlayerName', () => {
    it('returns formatted full name', async () => {
      const playerId = testPlayerIds[0];

      const startTime = Date.now();
      const name = await playerRepository.getPlayerName(playerId);
      const elapsed = Date.now() - startTime;

      expect(name).not.toBeNull();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);

      // Validate against direct query
      const dbResult = await validationDb('allplayers')
        .where({ id: playerId })
        .first();

      if (dbResult) {
        const expectedName = `${dbResult.first || ''} ${dbResult.last || ''}`.trim();
        expect(name).toBe(expectedName);
      }

      // Performance check (allow more time for remote DB)
      expect(elapsed).toBeLessThan(1000);
    });

    it('returns null for empty player ID', async () => {
      const name = await playerRepository.getPlayerName('');
      expect(name).toBeNull();
    });

    it('returns player ID as name for unknown player', async () => {
      const unknownId = 'UNKNOWN_PLAYER_ABC';
      const name = await playerRepository.getPlayerName(unknownId);
      expect(name).toBe(unknownId);
    });
  });

  describe('data quality validation', () => {
    it('all batters in test game have valid player records', async () => {
      // Get all unique batters from game
      const batters = await validationDb('plays')
        .where({ gid: TEST_GAME_ID })
        .distinct('batter')
        .pluck('batter');

      const playerMap = await playerRepository.getPlayersByIds(batters);

      // Count how many have real names (not just ID as name)
      let realNameCount = 0;
      for (const [id, info] of playerMap) {
        if (info.fullName !== id && info.lastName !== id) {
          realNameCount++;
        }
      }

      // Most players should have real names in the database
      const realNameRatio = realNameCount / batters.length;
      expect(realNameRatio).toBeGreaterThan(0.8); // 80%+ should have real names
    });
  });
});
