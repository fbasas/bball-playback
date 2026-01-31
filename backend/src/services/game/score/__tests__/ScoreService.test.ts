/**
 * ScoreService Unit Tests
 *
 * These tests verify the business logic for calculating baseball scores.
 * They use mock repositories to inject controlled data, allowing us to test
 * pure business logic without database dependencies.
 *
 * =============================================================================
 * TEST DATA CONVENTIONS
 * =============================================================================
 *
 * Team IDs:
 *   - 'HOM' = Home team (plays in bottom of innings)
 *   - 'VIS' = Visitor team (plays in top of innings)
 *
 * Play Data Fields:
 *   - top_bot: 0 = top of inning (visitors batting), 1 = bottom (home batting)
 *   - batteam: The team currently at bat
 *   - pitteam: The team currently pitching
 *   - runs: Number of runs scored on this play (0-4 typically)
 *   - pn: Play number (sequential within game)
 *   - inning: Current inning (1-9+)
 *
 * Mock Repository:
 *   createMockRepository(homeRuns, visitorRuns) returns a mock that will
 *   return the specified run totals when queried for each team.
 *
 * =============================================================================
 * SITUATION COVERAGE
 * =============================================================================
 *
 * These tests cover the following baseball situations:
 *
 * 1. TEAM IDENTIFICATION
 *    - Top of inning: visitors bat, home pitches → home = pitteam
 *    - Bottom of inning: home bats, visitors pitch → home = batteam
 *
 * 2. SCORING SITUATIONS
 *    - No runs scored (strikeout, flyout, groundout)
 *    - Single run (solo homer, sac fly, RBI single, wild pitch, error)
 *    - Multiple runs (2-run homer, 3-run double, grand slam)
 *
 * 3. GAME SITUATIONS
 *    - First play of game (0-0 score)
 *    - Mid-game scoring (accumulated runs from earlier innings)
 *    - Walkoff scenarios (home team wins in bottom of 9th+)
 *    - Extra innings (10th inning and beyond)
 *
 * 4. EDGE CASES
 *    - Null/undefined runs field
 *    - Repository errors (should return 0-0 gracefully)
 *
 * =============================================================================
 * SITUATIONS NOT YET COVERED (Future Tests)
 * =============================================================================
 *
 * - Mercy rule / run differential limits
 * - Suspended games
 * - Tie games (historic/exhibition)
 * - Forfeit situations
 * - Rain delay resumptions
 * - Double-headers with carryover
 */

import { PlayData } from '../../../../../../common/types/PlayData';
import { ScoreResult, TeamIds, IScoreRepository } from '../../../interfaces';

// Mock the scoreRepository module BEFORE importing ScoreService
jest.mock('../../../../database/repositories/ScoreRepository', () => ({
  scoreRepository: {
    getRunsForTeam: jest.fn().mockResolvedValue(0),
    getRunsForTeamBefore: jest.fn().mockResolvedValue(0)
  }
}));

// Mock the metrics collector
jest.mock('../../../../core/metrics', () => ({
  baseballMetricsCollector: {
    recordScoreChange: jest.fn(),
    recordDatabaseQuery: jest.fn()
  }
}));

// Mock the logger
jest.mock('../../../../core/logging', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

// Import ScoreService AFTER mocks are set up
import { ScoreService } from '../ScoreService';

describe('ScoreService', () => {
  /**
   * Helper to create PlayData for testing.
   *
   * Default values represent: Top of 1st inning, visitors batting,
   * no runs scored, no outs.
   */
  const createPlayData = (overrides: Partial<PlayData> = {}): PlayData => ({
    gid: 'TEST202401010',
    pn: 1,
    inning: 1,
    top_bot: 0, // 0 = top of inning (visitors batting)
    batteam: 'VIS',
    pitteam: 'HOM',
    batter: 'batter001',
    pitcher: 'pitcher001',
    outs_pre: 0,
    outs_post: 0,
    runs: 0,
    ...overrides
  });

  /**
   * Creates a mock repository with predetermined run totals.
   *
   * @param homeRuns - Total runs for home team up to the queried play
   * @param visitorRuns - Total runs for visitor team up to the queried play
   *
   * Example: createMockRepository(3, 2) simulates a game where home
   * has scored 3 runs and visitors have scored 2 runs so far.
   */
  const createMockRepository = (
    homeRuns: number = 0,
    visitorRuns: number = 0
  ): IScoreRepository => ({
    getRunsForTeam: jest.fn().mockImplementation((gameId, teamId, upToPlay) => {
      if (teamId === 'HOM') return Promise.resolve(homeRuns);
      if (teamId === 'VIS') return Promise.resolve(visitorRuns);
      return Promise.resolve(0);
    }),
    getRunsForTeamBefore: jest.fn().mockImplementation((gameId, teamId, beforePlay) => {
      if (teamId === 'HOM') return Promise.resolve(homeRuns);
      if (teamId === 'VIS') return Promise.resolve(visitorRuns);
      return Promise.resolve(0);
    }),
    preloadCumulativeScores: jest.fn().mockResolvedValue({ teams: ['HOM', 'VIS'], playCount: 0 })
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ScoreService.getInstance();
      const instance2 = ScoreService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  // ===========================================================================
  // TEAM IDENTIFICATION TESTS
  // ===========================================================================
  // These test the core baseball logic of determining which team is home/visitor
  // based on the inning half (top/bottom).

  describe('determineTeams (pure function)', () => {
    /**
     * SITUATION: Top of inning (visitors batting)
     *
     * In the top of any inning, the visiting team bats and the home team pitches.
     * Therefore: batteam = visitors, pitteam = home
     *
     * Example: Top of 3rd, Yankees (visitors) batting against Red Sox (home)
     *   batteam = 'NYY', pitteam = 'BOS' → home = 'BOS', visitor = 'NYY'
     */
    it('should identify home team as pitteam when top of inning (visitors batting)', () => {
      const service = new ScoreService(createMockRepository());
      const playData = createPlayData({
        top_bot: 0, // Top of inning
        batteam: 'NYY', // Yankees batting (visitors)
        pitteam: 'BOS'  // Red Sox pitching (home)
      });

      const result = service.determineTeams(playData);

      expect(result.homeTeamId).toBe('BOS');
      expect(result.visitorTeamId).toBe('NYY');
    });

    /**
     * SITUATION: Bottom of inning (home team batting)
     *
     * In the bottom of any inning, the home team bats and the visiting team pitches.
     * Therefore: batteam = home, pitteam = visitors
     *
     * Example: Bottom of 3rd, Red Sox (home) batting against Yankees (visitors)
     *   batteam = 'BOS', pitteam = 'NYY' → home = 'BOS', visitor = 'NYY'
     */
    it('should identify home team as batteam when bottom of inning (home batting)', () => {
      const service = new ScoreService(createMockRepository());
      const playData = createPlayData({
        top_bot: 1, // Bottom of inning
        batteam: 'BOS', // Red Sox batting (home)
        pitteam: 'NYY'  // Yankees pitching (visitors)
      });

      const result = service.determineTeams(playData);

      expect(result.homeTeamId).toBe('BOS');
      expect(result.visitorTeamId).toBe('NYY');
    });
  });

  // ===========================================================================
  // SCORE COMPUTATION TESTS (Pure Function)
  // ===========================================================================
  // These test the computeScoreResult function which is pure (no I/O).
  // Given run totals and a play with runs, compute before/after scores.

  describe('computeScoreResult (pure function)', () => {
    let service: ScoreService;

    beforeEach(() => {
      service = new ScoreService(createMockRepository());
    });

    /**
     * SITUATION: No runs scored on the play
     *
     * Most common outcome - strikeout, flyout, groundout, etc.
     * Scores should remain unchanged.
     *
     * Test data: Home 2, Visitors 3, next play scores 0 runs
     * Expected: Before = 2-3, After = 2-3
     */
    it('should return unchanged scores when no runs scored', () => {
      const nextPlayData = createPlayData({ runs: 0, batteam: 'VIS' });

      const result = service.computeScoreResult(2, 3, nextPlayData, 'HOM');

      expect(result).toEqual({
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 3,
        homeScoreAfterPlay: 2,
        visitorScoreAfterPlay: 3
      });
    });

    /**
     * SITUATION: Home team scores (bottom of inning)
     *
     * Home team batting in bottom of inning, scores 2 runs.
     * Could be: 2-run homer, 2 RBI single, bases loaded walk + wild pitch, etc.
     *
     * Test data: Home 3, Visitors 4, home bats and scores 2
     * Expected: Before = 3-4, After = 5-4
     */
    it('should add runs to home team when home is batting', () => {
      const nextPlayData = createPlayData({
        runs: 2,
        batteam: 'HOM', // Home team batting
        top_bot: 1
      });

      const result = service.computeScoreResult(3, 4, nextPlayData, 'HOM');

      expect(result.homeScoreBeforePlay).toBe(3);
      expect(result.homeScoreAfterPlay).toBe(5); // 3 + 2 runs
      expect(result.visitorScoreBeforePlay).toBe(4);
      expect(result.visitorScoreAfterPlay).toBe(4); // unchanged
    });

    /**
     * SITUATION: Visitor team scores (top of inning)
     *
     * Visiting team batting in top of inning, scores 1 run.
     * Could be: Solo homer, sac fly, RBI single, error, wild pitch, etc.
     *
     * Test data: Home 2, Visitors 1, visitors bat and score 1
     * Expected: Before = 2-1, After = 2-2
     */
    it('should add runs to visitor team when visitors are batting', () => {
      const nextPlayData = createPlayData({
        runs: 1,
        batteam: 'VIS', // Visitors batting
        top_bot: 0
      });

      const result = service.computeScoreResult(2, 1, nextPlayData, 'HOM');

      expect(result.homeScoreBeforePlay).toBe(2);
      expect(result.homeScoreAfterPlay).toBe(2); // unchanged
      expect(result.visitorScoreBeforePlay).toBe(1);
      expect(result.visitorScoreAfterPlay).toBe(2); // 1 + 1 run
    });

    /**
     * SITUATION: Grand slam (4 runs on one play)
     *
     * Bases loaded, batter hits home run = 4 runs.
     * Maximum runs possible on a single play in normal circumstances.
     *
     * Test data: Home 2, Visitors 5, home hits grand slam
     * Expected: Before = 2-5, After = 6-5 (home takes lead!)
     */
    it('should handle grand slam (4 runs)', () => {
      const nextPlayData = createPlayData({
        runs: 4,
        batteam: 'HOM',
        top_bot: 1
      });

      const result = service.computeScoreResult(2, 5, nextPlayData, 'HOM');

      expect(result.homeScoreAfterPlay).toBe(6); // 2 + 4 runs
    });

    /**
     * SITUATION: Null/undefined runs field
     *
     * Edge case - database might return null for runs field.
     * Should treat as 0 runs, not NaN or error.
     *
     * Test data: Home 1, Visitors 1, runs = null
     * Expected: Before = 1-1, After = 1-1 (no change)
     */
    it('should handle null/undefined runs as 0', () => {
      const nextPlayData = createPlayData({
        runs: null as any,
        batteam: 'VIS'
      });

      const result = service.computeScoreResult(1, 1, nextPlayData, 'HOM');

      expect(result.homeScoreAfterPlay).toBe(1);
      expect(result.visitorScoreAfterPlay).toBe(1);
    });
  });

  // ===========================================================================
  // INTEGRATION TESTS (Service orchestration)
  // ===========================================================================
  // These test the full calculateScore flow: team determination → data fetch → computation

  describe('calculateScore (integration of business logic)', () => {
    /**
     * SITUATION: Normal mid-game scoring
     *
     * Tests the full orchestration:
     * 1. Determine teams from play data
     * 2. Fetch run totals from repository
     * 3. Compute before/after scores
     *
     * Test data: Repository returns Home 3, Visitors 2
     *            Next play: Home scores 1 in bottom of inning
     * Expected: Before = 3-2, After = 4-2
     */
    it('should orchestrate team determination, data fetch, and computation', async () => {
      const mockRepo = createMockRepository(3, 2); // Home: 3 runs, Visitor: 2 runs
      const service = new ScoreService(mockRepo);

      const currentPlayData = createPlayData({ pn: 10 });
      const nextPlayData = createPlayData({
        pn: 11,
        runs: 1,
        batteam: 'HOM', // Home scores 1
        pitteam: 'VIS',
        top_bot: 1
      });

      const result = await service.calculateScore(
        'TEST202401010',
        10,
        currentPlayData,
        nextPlayData
      );

      expect(result.homeScoreBeforePlay).toBe(3);
      expect(result.visitorScoreBeforePlay).toBe(2);
      expect(result.homeScoreAfterPlay).toBe(4); // 3 + 1
      expect(result.visitorScoreAfterPlay).toBe(2);

      // Verify repository was called correctly
      expect(mockRepo.getRunsForTeam).toHaveBeenCalledWith('TEST202401010', 'HOM', 10);
      expect(mockRepo.getRunsForTeam).toHaveBeenCalledWith('TEST202401010', 'VIS', 10);
    });

    /**
     * SITUATION: Database error during score calculation
     *
     * Repository throws an error (connection lost, query timeout, etc.)
     * Service should handle gracefully and return 0-0 default scores
     * rather than crashing the game playback.
     *
     * Test data: Repository throws "Database error"
     * Expected: Returns 0-0-0-0 (safe default)
     */
    it('should return 0-0 scores on repository error', async () => {
      const mockRepo: IScoreRepository = {
        getRunsForTeam: jest.fn().mockRejectedValue(new Error('Database error')),
        getRunsForTeamBefore: jest.fn().mockRejectedValue(new Error('Database error')),
        preloadCumulativeScores: jest.fn().mockResolvedValue({ teams: [], playCount: 0 })
      };
      const service = new ScoreService(mockRepo);

      const currentPlayData = createPlayData({ pn: 5 });
      const nextPlayData = createPlayData({ pn: 6, runs: 1 });

      const result = await service.calculateScore(
        'TEST202401010',
        5,
        currentPlayData,
        nextPlayData
      );

      expect(result).toEqual({
        homeScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreBeforePlay: 0,
        visitorScoreAfterPlay: 0
      });
    });
  });

  // ===========================================================================
  // GAME SITUATION TESTS
  // ===========================================================================
  // These test specific baseball game situations with realistic scenarios.

  describe('scoring scenarios', () => {
    /**
     * SITUATION: First play of game
     *
     * At the very start of a game, both teams have 0 runs.
     * This is the baseline state before any scoring occurs.
     *
     * Test data: Play 1, Repository returns 0-0, no runs scored
     * Expected: Before = 0-0, After = 0-0
     */
    describe('first play initialization (0-0)', () => {
      it('should return 0-0 for the first play of a game', async () => {
        const mockRepo = createMockRepository(0, 0);
        const service = new ScoreService(mockRepo);

        const currentPlayData = createPlayData({ pn: 1 });
        const nextPlayData = createPlayData({ pn: 2, runs: 0 });

        const result = await service.calculateScore(
          'TEST202401010',
          1,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreBeforePlay).toBe(0);
        expect(result.visitorScoreBeforePlay).toBe(0);
        expect(result.homeScoreAfterPlay).toBe(0);
        expect(result.visitorScoreAfterPlay).toBe(0);
      });
    });

    /**
     * SITUATION: Walkoff win in bottom of 9th
     *
     * The most dramatic ending in baseball - home team wins in their
     * final at-bat. Game ends immediately when winning run scores.
     *
     * Scenario: Bottom 9th, Home trailing 4-5, hits 2-run walkoff homer
     * Test data: Repository returns Home 4, Visitors 5
     *            Next play: Home scores 2 in bottom of 9th
     * Expected: Before = 4-5 (losing), After = 6-5 (WIN!)
     */
    describe('walkoff scenarios', () => {
      it('should track walkoff home run in bottom of 9th', async () => {
        const mockRepo = createMockRepository(4, 5); // Home losing 4-5
        const service = new ScoreService(mockRepo);

        const currentPlayData = createPlayData({
          pn: 75,
          inning: 9,
          top_bot: 1
        });
        const nextPlayData = createPlayData({
          pn: 76,
          inning: 9,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 2 // 2-run walkoff homer
        });

        const result = await service.calculateScore(
          'TEST202401010',
          75,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay).toBe(6); // 4 + 2 = 6
        expect(result.visitorScoreAfterPlay).toBe(5);
        expect(result.homeScoreAfterPlay).toBeGreaterThan(result.visitorScoreAfterPlay);
      });
    });

    /**
     * SITUATION: Extra innings scoring
     *
     * Game tied after 9 innings, play continues.
     * Extra innings follow same rules - visitors bat top, home bats bottom.
     *
     * Scenario: 10th inning, game tied 5-5, visitors score in top of 10th
     * Test data: Repository returns Home 5, Visitors 5
     *            Next play: Visitors score 1 in top of 10th
     * Expected: Before = 5-5 (tied), After = 5-6 (visitors lead)
     */
    describe('extra innings', () => {
      it('should track scoring in 10th inning', async () => {
        const mockRepo = createMockRepository(5, 5); // Tied 5-5
        const service = new ScoreService(mockRepo);

        const currentPlayData = createPlayData({
          pn: 85,
          inning: 10,
          top_bot: 0
        });
        const nextPlayData = createPlayData({
          pn: 86,
          inning: 10,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 1
        });

        const result = await service.calculateScore(
          'TEST202401010',
          85,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay).toBe(6); // 5 + 1
        expect(result.homeScoreAfterPlay).toBe(5);
      });
    });

    /**
     * SITUATION: Grand slam changes the game
     *
     * High-leverage situation - grand slam (4 runs) in a close game.
     *
     * Scenario: Home team down 2-1, hits grand slam
     * Test data: Repository returns Home 2, Visitors 1
     *            Next play: Home scores 4 (grand slam)
     * Expected: Before = 2-1, After = 6-1 (4-run swing!)
     */
    describe('high-scoring plays', () => {
      it('should handle grand slam correctly', async () => {
        const mockRepo = createMockRepository(2, 1);
        const service = new ScoreService(mockRepo);

        const currentPlayData = createPlayData({ pn: 25 });
        const nextPlayData = createPlayData({
          pn: 26,
          batteam: 'HOM',
          pitteam: 'VIS',
          top_bot: 1,
          runs: 4
        });

        const result = await service.calculateScore(
          'TEST202401010',
          25,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay - result.homeScoreBeforePlay).toBe(4);
      });
    });
  });

  // ===========================================================================
  // BACKWARD COMPATIBILITY TESTS
  // ===========================================================================
  // Ensure static methods continue to work for existing code.

  describe('static methods (backward compatibility)', () => {
    it('should provide static calculateScore method', async () => {
      // This test verifies backward compatibility with existing code
      // that uses ScoreService.calculateScore() statically
      const result = await ScoreService.calculateScore(
        'TEST202401010',
        1,
        createPlayData({ pn: 1 }),
        createPlayData({ pn: 2 })
      );

      expect(result).toHaveProperty('homeScoreBeforePlay');
      expect(result).toHaveProperty('visitorScoreBeforePlay');
      expect(result).toHaveProperty('homeScoreAfterPlay');
      expect(result).toHaveProperty('visitorScoreAfterPlay');
    });

    it('should provide static determineTeams method', () => {
      const result = ScoreService.determineTeams(createPlayData({
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM'
      }));

      expect(result.homeTeamId).toBe('HOM');
      expect(result.visitorTeamId).toBe('VIS');
    });

    it('should provide static computeScoreResult method', () => {
      const result = ScoreService.computeScoreResult(
        2,
        3,
        createPlayData({ runs: 1, batteam: 'HOM' }),
        'HOM'
      );

      expect(result.homeScoreAfterPlay).toBe(3);
    });
  });
});
