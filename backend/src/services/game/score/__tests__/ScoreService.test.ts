import { ScoreService, ScoreResult } from '../ScoreService';
import { scoreRepository } from '../../../../database/repositories/ScoreRepository';
import { PlayData } from '../../../../../../common/types/PlayData';

// Mock the scoreRepository
jest.mock('../../../../database/repositories/ScoreRepository', () => ({
  scoreRepository: {
    calculateScore: jest.fn(),
    calculateScoreOptimized: jest.fn()
  },
  ScoreResult: {}
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

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return a singleton instance', () => {
      const instance1 = ScoreService.getInstance();
      const instance2 = ScoreService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('calculateScore', () => {
    describe('first play initialization (0-0)', () => {
      it('should return 0-0 score for the first play of a game', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 0,
          homeScoreAfterPlay: 0,
          visitorScoreAfterPlay: 0
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({ pn: 1 });
        const nextPlayData = createPlayData({ pn: 2 });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          1,
          currentPlayData,
          nextPlayData
        );

        expect(result).toEqual(mockResult);
        expect(result.homeScoreBeforePlay).toBe(0);
        expect(result.visitorScoreBeforePlay).toBe(0);
      });
    });

    describe('single run scoring', () => {
      it('should track a single run scored by visitors in top of inning', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 0,
          homeScoreAfterPlay: 0,
          visitorScoreAfterPlay: 1
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 5,
          top_bot: 0, // Top of inning - visitors batting
          batteam: 'VIS',
          pitteam: 'HOM'
        });
        const nextPlayData = createPlayData({
          pn: 6,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 1
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          5,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay).toBe(1);
        expect(result.homeScoreAfterPlay).toBe(0);
      });

      it('should track a single run scored by home team in bottom of inning', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 1,
          homeScoreAfterPlay: 1,
          visitorScoreAfterPlay: 1
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 10,
          top_bot: 1, // Bottom of inning - home batting
          batteam: 'HOM',
          pitteam: 'VIS'
        });
        const nextPlayData = createPlayData({
          pn: 11,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 1
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          10,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay).toBe(1);
        expect(result.visitorScoreAfterPlay).toBe(1);
      });
    });

    describe('multiple runs per play (grand slam, etc.)', () => {
      it('should track 4 runs on a grand slam', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 2,
          visitorScoreBeforePlay: 1,
          homeScoreAfterPlay: 6,
          visitorScoreAfterPlay: 1
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 25,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          br1_pre: 'runner1',
          br2_pre: 'runner2',
          br3_pre: 'runner3'
        });
        const nextPlayData = createPlayData({
          pn: 26,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 4
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          25,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay - result.homeScoreBeforePlay).toBe(4);
      });

      it('should track 2 runs on a 2-run homer', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 0,
          homeScoreAfterPlay: 0,
          visitorScoreAfterPlay: 2
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 8,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          br1_pre: 'runner1'
        });
        const nextPlayData = createPlayData({
          pn: 9,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 2
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          8,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay).toBe(2);
      });

      it('should track 3 runs on a bases-clearing double', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 1,
          visitorScoreBeforePlay: 3,
          homeScoreAfterPlay: 1,
          visitorScoreAfterPlay: 6
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 45,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          br1_pre: 'runner1',
          br2_pre: 'runner2',
          br3_pre: 'runner3'
        });
        const nextPlayData = createPlayData({
          pn: 46,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 3
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          45,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay - result.visitorScoreBeforePlay).toBe(3);
      });
    });

    describe('score tracking across innings', () => {
      it('should accumulate scores across multiple innings', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 3,
          visitorScoreBeforePlay: 2,
          homeScoreAfterPlay: 4,
          visitorScoreAfterPlay: 2
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 50,
          inning: 5,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS'
        });
        const nextPlayData = createPlayData({
          pn: 51,
          inning: 5,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 1
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          50,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreBeforePlay).toBe(3);
        expect(result.homeScoreAfterPlay).toBe(4);
      });
    });

    describe('half-inning transitions', () => {
      it('should maintain correct scores during top to bottom transition', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 2,
          homeScoreAfterPlay: 0,
          visitorScoreAfterPlay: 2
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        // Last play of top of 1st
        const currentPlayData = createPlayData({
          pn: 8,
          inning: 1,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          outs_pre: 2,
          outs_post: 3
        });
        // First play of bottom of 1st
        const nextPlayData = createPlayData({
          pn: 9,
          inning: 1,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          outs_pre: 0
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          8,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreBeforePlay).toBe(2);
        expect(result.homeScoreBeforePlay).toBe(0);
      });

      it('should maintain correct scores during bottom to top (new inning) transition', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 1,
          visitorScoreBeforePlay: 2,
          homeScoreAfterPlay: 1,
          visitorScoreAfterPlay: 2
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        // Last play of bottom of 1st
        const currentPlayData = createPlayData({
          pn: 15,
          inning: 1,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          outs_pre: 2,
          outs_post: 3
        });
        // First play of top of 2nd
        const nextPlayData = createPlayData({
          pn: 16,
          inning: 2,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          outs_pre: 0
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          15,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay).toBe(1);
        expect(result.visitorScoreAfterPlay).toBe(2);
      });
    });

    describe('high-scoring innings', () => {
      it('should handle a 7-run inning correctly', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 0,
          visitorScoreBeforePlay: 5,
          homeScoreAfterPlay: 0,
          visitorScoreAfterPlay: 7
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 12,
          inning: 1,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM'
        });
        const nextPlayData = createPlayData({
          pn: 13,
          inning: 1,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 2
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          12,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay).toBe(7);
      });
    });

    describe('walkoff scenarios', () => {
      it('should track walkoff home run in bottom of 9th', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 4,
          visitorScoreBeforePlay: 5,
          homeScoreAfterPlay: 6,
          visitorScoreAfterPlay: 5
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 75,
          inning: 9,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          br1_pre: 'runner1'
        });
        const nextPlayData = createPlayData({
          pn: 76,
          inning: 9,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 2
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          75,
          currentPlayData,
          nextPlayData
        );

        // Home team wins with walkoff
        expect(result.homeScoreAfterPlay).toBeGreaterThan(result.visitorScoreAfterPlay);
        expect(result.homeScoreAfterPlay).toBe(6);
      });

      it('should track walkoff single in bottom of 9th', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 3,
          visitorScoreBeforePlay: 3,
          homeScoreAfterPlay: 4,
          visitorScoreAfterPlay: 3
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 80,
          inning: 9,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          br3_pre: 'runner3'
        });
        const nextPlayData = createPlayData({
          pn: 81,
          inning: 9,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 1
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          80,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay).toBe(4);
        expect(result.visitorScoreAfterPlay).toBe(3);
      });
    });

    describe('extra innings', () => {
      it('should track scoring in 10th inning', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 5,
          visitorScoreBeforePlay: 5,
          homeScoreAfterPlay: 5,
          visitorScoreAfterPlay: 6
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 85,
          inning: 10,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM'
        });
        const nextPlayData = createPlayData({
          pn: 86,
          inning: 10,
          top_bot: 0,
          batteam: 'VIS',
          pitteam: 'HOM',
          runs: 1
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          85,
          currentPlayData,
          nextPlayData
        );

        expect(result.visitorScoreAfterPlay).toBe(6);
        expect(result.homeScoreAfterPlay).toBe(5);
      });

      it('should track walkoff in extra innings', async () => {
        const mockResult: ScoreResult = {
          homeScoreBeforePlay: 5,
          visitorScoreBeforePlay: 6,
          homeScoreAfterPlay: 7,
          visitorScoreAfterPlay: 6
        };
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

        const currentPlayData = createPlayData({
          pn: 95,
          inning: 11,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          br1_pre: 'runner1'
        });
        const nextPlayData = createPlayData({
          pn: 96,
          inning: 11,
          top_bot: 1,
          batteam: 'HOM',
          pitteam: 'VIS',
          runs: 2
        });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          95,
          currentPlayData,
          nextPlayData
        );

        expect(result.homeScoreAfterPlay).toBe(7);
        expect(result.homeScoreAfterPlay).toBeGreaterThan(result.visitorScoreAfterPlay);
      });
    });

    describe('error handling', () => {
      it('should return default 0-0 scores when repository throws error', async () => {
        (scoreRepository.calculateScoreOptimized as jest.Mock).mockRejectedValue(
          new Error('Database connection failed')
        );

        const currentPlayData = createPlayData({ pn: 5 });
        const nextPlayData = createPlayData({ pn: 6, runs: 1 });

        const result = await ScoreService.calculateScore(
          'TEST202401010',
          5,
          currentPlayData,
          nextPlayData
        );

        // Should return default scores instead of throwing
        expect(result).toEqual({
          homeScoreBeforePlay: 0,
          homeScoreAfterPlay: 0,
          visitorScoreBeforePlay: 0,
          visitorScoreAfterPlay: 0
        });
      });
    });
  });

  describe('calculateScoreOptimized', () => {
    it('should call the optimized repository method', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 1,
        homeScoreAfterPlay: 3,
        visitorScoreAfterPlay: 1
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({ pn: 30 });
      const nextPlayData = createPlayData({ pn: 31, runs: 1 });

      const result = await ScoreService.calculateScoreOptimized(
        'TEST202401010',
        30,
        currentPlayData,
        nextPlayData
      );

      expect(scoreRepository.calculateScoreOptimized).toHaveBeenCalledWith(
        'TEST202401010',
        30,
        currentPlayData,
        nextPlayData
      );
      expect(result).toEqual(mockResult);
    });

    it('should return default scores on error', async () => {
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockRejectedValue(
        new Error('Query timeout')
      );

      const currentPlayData = createPlayData({ pn: 30 });
      const nextPlayData = createPlayData({ pn: 31 });

      const result = await ScoreService.calculateScoreOptimized(
        'TEST202401010',
        30,
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

  describe('calculateScoreLegacy', () => {
    it('should call the legacy repository method', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 1,
        visitorScoreBeforePlay: 2,
        homeScoreAfterPlay: 1,
        visitorScoreAfterPlay: 3
      };
      (scoreRepository.calculateScore as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({ pn: 20 });
      const nextPlayData = createPlayData({ pn: 21, runs: 1 });

      const result = await ScoreService.calculateScoreLegacy(
        'TEST202401010',
        20,
        currentPlayData,
        nextPlayData
      );

      expect(scoreRepository.calculateScore).toHaveBeenCalledWith(
        'TEST202401010',
        20,
        currentPlayData,
        nextPlayData
      );
      expect(result).toEqual(mockResult);
    });

    it('should return default scores on error', async () => {
      (scoreRepository.calculateScore as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const currentPlayData = createPlayData({ pn: 20 });
      const nextPlayData = createPlayData({ pn: 21 });

      const result = await ScoreService.calculateScoreLegacy(
        'TEST202401010',
        20,
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

  describe('instance methods', () => {
    let service: ScoreService;

    beforeEach(() => {
      service = new ScoreService();
    });

    it('should call repository methods from instance methods', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 0,
        visitorScoreBeforePlay: 0,
        homeScoreAfterPlay: 1,
        visitorScoreAfterPlay: 0
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({ pn: 10 });
      const nextPlayData = createPlayData({ pn: 11, runs: 1 });

      const result = await service.calculateScore(
        'TEST202401010',
        10,
        currentPlayData,
        nextPlayData
      );

      expect(result).toEqual(mockResult);
      expect(scoreRepository.calculateScoreOptimized).toHaveBeenCalled();
    });
  });

  describe('score after specific plays', () => {
    it('should not change score on a strikeout', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 1,
        homeScoreAfterPlay: 2,
        visitorScoreAfterPlay: 1
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({
        pn: 40,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM'
      });
      const nextPlayData = createPlayData({
        pn: 41,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM',
        runs: 0
      });

      const result = await ScoreService.calculateScore(
        'TEST202401010',
        40,
        currentPlayData,
        nextPlayData
      );

      expect(result.homeScoreAfterPlay).toBe(result.homeScoreBeforePlay);
      expect(result.visitorScoreAfterPlay).toBe(result.visitorScoreBeforePlay);
    });

    it('should track run scored on error', async () => {
      // Run scored due to an error should still be counted
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 1,
        visitorScoreBeforePlay: 0,
        homeScoreAfterPlay: 1,
        visitorScoreAfterPlay: 1
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({
        pn: 35,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM',
        br3_pre: 'runner3'
      });
      const nextPlayData = createPlayData({
        pn: 36,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM',
        runs: 1, // Run scored on error
        event: 'E6' // Error by shortstop
      });

      const result = await ScoreService.calculateScore(
        'TEST202401010',
        35,
        currentPlayData,
        nextPlayData
      );

      expect(result.visitorScoreAfterPlay).toBe(1);
    });

    it('should track run scored on sacrifice fly', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 0,
        visitorScoreBeforePlay: 0,
        homeScoreAfterPlay: 1,
        visitorScoreAfterPlay: 0
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({
        pn: 28,
        top_bot: 1,
        batteam: 'HOM',
        pitteam: 'VIS',
        br3_pre: 'runner3',
        outs_pre: 0
      });
      const nextPlayData = createPlayData({
        pn: 29,
        top_bot: 1,
        batteam: 'HOM',
        pitteam: 'VIS',
        runs: 1,
        outs_post: 1,
        event: 'SF9' // Sacrifice fly to right field
      });

      const result = await ScoreService.calculateScore(
        'TEST202401010',
        28,
        currentPlayData,
        nextPlayData
      );

      expect(result.homeScoreAfterPlay).toBe(1);
    });

    it('should track run scored on wild pitch', async () => {
      const mockResult: ScoreResult = {
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 3,
        homeScoreAfterPlay: 2,
        visitorScoreAfterPlay: 4
      };
      (scoreRepository.calculateScoreOptimized as jest.Mock).mockResolvedValue(mockResult);

      const currentPlayData = createPlayData({
        pn: 55,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM',
        br3_pre: 'runner3'
      });
      const nextPlayData = createPlayData({
        pn: 56,
        top_bot: 0,
        batteam: 'VIS',
        pitteam: 'HOM',
        runs: 1,
        event: 'WP' // Wild pitch
      });

      const result = await ScoreService.calculateScore(
        'TEST202401010',
        55,
        currentPlayData,
        nextPlayData
      );

      expect(result.visitorScoreAfterPlay).toBe(4);
    });
  });
});
