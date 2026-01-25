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
  // Helper to create PlayData for testing
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

  // Create a mock repository
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
    })
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ScoreService.getInstance();
      const instance2 = ScoreService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('determineTeams (pure function)', () => {
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

  describe('computeScoreResult (pure function)', () => {
    let service: ScoreService;

    beforeEach(() => {
      service = new ScoreService(createMockRepository());
    });

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

    it('should handle grand slam (4 runs)', () => {
      const nextPlayData = createPlayData({
        runs: 4,
        batteam: 'HOM',
        top_bot: 1
      });

      const result = service.computeScoreResult(2, 5, nextPlayData, 'HOM');

      expect(result.homeScoreAfterPlay).toBe(6); // 2 + 4 runs
    });

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

  describe('calculateScore (integration of business logic)', () => {
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

    it('should return 0-0 scores on repository error', async () => {
      const mockRepo: IScoreRepository = {
        getRunsForTeam: jest.fn().mockRejectedValue(new Error('Database error')),
        getRunsForTeamBefore: jest.fn().mockRejectedValue(new Error('Database error'))
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

  describe('scoring scenarios', () => {
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
