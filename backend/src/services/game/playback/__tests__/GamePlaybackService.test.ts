/**
 * GamePlaybackService Unit Tests
 *
 * These tests verify the orchestration logic for game playback.
 * They use mock services to test the service coordination without database dependencies.
 */

import { PlayData, PlayDataResult } from '../../../../../../common/types/PlayData';
import { BaseballState } from '../../../../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../../../../common/types/SimplifiedBaseballState';
import {
  IPlayDataService,
  IScoreService,
  ICommentaryService,
  ILineupService,
  ScoreResult
} from '../../../interfaces';

// =============================================================================
// CRITICAL: Mock database and repositories FIRST to prevent initialization errors
// =============================================================================

jest.mock('../../../../config/database', () => ({
  db: jest.fn()
}));

jest.mock('../../../../database/repositories/PlayRepository', () => ({
  playRepository: {
    fetchFirstPlay: jest.fn(),
    fetchPlayData: jest.fn(),
    fetchPlayForBatter: jest.fn()
  }
}));

jest.mock('../../../../database/repositories/ScoreRepository', () => ({
  scoreRepository: {
    getRunsForTeam: jest.fn(),
    getRunsForTeamBefore: jest.fn()
  }
}));

jest.mock('../../../../database/repositories/GameRepository', () => ({
  gameRepository: {
    getGameInfo: jest.fn()
  }
}));

jest.mock('../../../../database/repositories/PlayerRepository', () => ({
  playerRepository: {
    getPlayerById: jest.fn(),
    getPlayersByIds: jest.fn()
  }
}));

jest.mock('../../../../database/repositories/TeamStatsRepository', () => ({
  teamStatsRepository: {
    getTeamStatsForGame: jest.fn(),
    getStartingLineup: jest.fn(),
    getStartingPitcher: jest.fn()
  }
}));

// Mock services to prevent their constructors from loading database dependencies
jest.mock('../../playData/PlayDataService', () => ({
  PlayDataService: {
    getInstance: jest.fn(() => ({
      fetchFirstPlay: jest.fn(),
      fetchPlayData: jest.fn(),
      fetchPlayForBatter: jest.fn()
    }))
  }
}));

jest.mock('../../score/ScoreService', () => ({
  ScoreService: {
    getInstance: jest.fn(() => ({
      determineTeams: jest.fn(),
      computeScoreResult: jest.fn(),
      calculateScore: jest.fn()
    }))
  }
}));

jest.mock('../../commentary/CommentaryService', () => ({
  CommentaryService: {
    getInstance: jest.fn(() => ({
      generatePlayCompletion: jest.fn(),
      generateDetailedPlayCompletion: jest.fn(),
      setAIAdapter: jest.fn()
    }))
  }
}));

jest.mock('../../lineup/LineupService', () => ({
  LineupService: {
    getInstance: jest.fn(() => ({
      updateLineupInfo: jest.fn(),
      processLineupChanges: jest.fn(),
      getNextBatter: jest.fn()
    }))
  }
}));

jest.mock('../../../../core/metrics', () => ({
  baseballMetricsCollector: {
    recordScoreChange: jest.fn(),
    recordDatabaseQuery: jest.fn(),
    recordCommentaryGeneration: jest.fn()
  }
}));

// =============================================================================
// Mock all external dependencies BEFORE importing GamePlaybackService
// =============================================================================

// Mock gameInitialization functions
const mockFetchFirstPlay = jest.fn();
const mockGenerateInitializationCompletion = jest.fn();
const mockInitializeLineupTracking = jest.fn();
const mockConstructInitialGameState = jest.fn();

jest.mock('../../gameInitialization', () => ({
  fetchFirstPlay: (...args: unknown[]) => mockFetchFirstPlay(...args),
  generateInitializationCompletion: (...args: unknown[]) => mockGenerateInitializationCompletion(...args),
  initializeLineupTracking: (...args: unknown[]) => mockInitializeLineupTracking(...args),
  constructInitialGameState: (...args: unknown[]) => mockConstructInitialGameState(...args)
}));

// Mock BaseballStateService
const mockCreateInitialBaseballState = jest.fn();
const mockProcessLineupState = jest.fn();

jest.mock('../../state/BaseballStateService', () => ({
  BaseballStateService: {
    createInitialBaseballState: (...args: unknown[]) => mockCreateInitialBaseballState(...args),
    processLineupState: (...args: unknown[]) => mockProcessLineupState(...args)
  }
}));

// Mock eventTranslation
const mockTranslateEvent = jest.fn();
jest.mock('../../../eventTranslation', () => ({
  translateEvent: (...args: unknown[]) => mockTranslateEvent(...args)
}));

// Mock GameUtils
const mockCreateSimplifiedState = jest.fn();
const mockUpdateNextBatterAndPitcher = jest.fn();
const mockIsHomeTeam = jest.fn();

jest.mock('../../../../utils/GameUtils', () => ({
  createSimplifiedState: (...args: unknown[]) => mockCreateSimplifiedState(...args),
  updateNextBatterAndPitcher: (...args: unknown[]) => mockUpdateNextBatterAndPitcher(...args),
  isHomeTeam: (...args: unknown[]) => mockIsHomeTeam(...args)
}));

// Mock constants
jest.mock('../../../../constants/GameConstants', () => ({
  EXPECTED_EVENT_MAP: {},
  DEFAULT_ANNOUNCER_STYLE: 'classic'
}));

// Mock core dependencies
jest.mock('../../../../core/errors', () => ({
  EventTranslationError: class EventTranslationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'EventTranslationError';
    }
  }
}));

jest.mock('../../../../core/logging', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  },
  contextLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }))
}));

// Import GamePlaybackService AFTER mocks are set up
import { GamePlaybackService } from '../GamePlaybackService';

describe('GamePlaybackService', () => {
  // Test data
  const testGameId = 'CIN201904150';
  const testSessionId = 'test-session-123';

  // Mock service implementations
  let mockPlayDataService: jest.Mocked<IPlayDataService>;
  let mockScoreService: jest.Mocked<IScoreService>;
  let mockCommentaryService: jest.Mocked<ICommentaryService>;
  let mockLineupService: jest.Mocked<ILineupService>;

  // Helper to create mock PlayData
  const createMockPlayData = (overrides: Partial<PlayData> = {}): PlayData => ({
    pn: 1,
    gid: testGameId,
    inning: 1,
    top_bot: 0,
    batteam: 'VIS',
    pitteam: 'HOM',
    batter: 'batter001',
    pitcher: 'pitcher001',
    event: 'S8',
    runs: 0,
    outs_pre: 0,
    outs_post: 1,
    ...overrides
  });

  // Helper to create mock BaseballState
  const createMockBaseballState = (): BaseballState => ({
    gameId: testGameId,
    sessionId: testSessionId,
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      log: [],
      onFirst: '',
      onSecond: '',
      onThird: ''
    },
    home: {
      id: 'HOM',
      displayName: 'Home Team',
      shortName: 'Home',
      currentBatter: null,
      currentPitcher: 'John Pitcher',
      lineup: [],
      stats: { runs: 0, hits: 0, errors: 0, innings: [] }
    },
    visitors: {
      id: 'VIS',
      displayName: 'Visitor Team',
      shortName: 'Visitors',
      currentBatter: 'Joe Batter',
      currentPitcher: 'Jane Pitcher',
      lineup: [],
      stats: { runs: 0, hits: 0, errors: 0, innings: [] }
    },
    currentPlay: 1,
    gameType: 'replay'
  });

  // Helper to create mock SimplifiedBaseballState
  const createMockSimplifiedState = (): SimplifiedBaseballState => ({
    gameId: testGameId,
    sessionId: testSessionId,
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      log: [],
      onFirst: '',
      onSecond: '',
      onThird: ''
    },
    home: {
      id: 'HOM',
      displayName: 'Home Team',
      shortName: 'Home',
      currentBatter: null,
      currentPitcher: 'John Pitcher',
      nextBatter: null,
      nextPitcher: null,
      runs: 0
    },
    visitors: {
      id: 'VIS',
      displayName: 'Visitor Team',
      shortName: 'Visitors',
      currentBatter: 'Joe Batter',
      currentPitcher: null,
      nextBatter: null,
      nextPitcher: null,
      runs: 0
    },
    currentPlay: 1,
    playDescription: undefined,
    eventString: 'S8'
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockPlayDataService = {
      fetchFirstPlay: jest.fn(),
      fetchPlayData: jest.fn(),
      fetchPlayForBatter: jest.fn()
    };

    mockScoreService = {
      determineTeams: jest.fn(),
      computeScoreResult: jest.fn(),
      calculateScore: jest.fn()
    };

    mockCommentaryService = {
      generatePlayCompletion: jest.fn(),
      generateDetailedPlayCompletion: jest.fn(),
      setAIAdapter: jest.fn()
    };

    mockLineupService = {
      updateLineupInfo: jest.fn(),
      processLineupChanges: jest.fn(),
      getNextBatter: jest.fn()
    };
  });

  describe('constructor', () => {
    it('creates instance with default dependencies', () => {
      const service = new GamePlaybackService();
      expect(service).toBeDefined();
    });

    it('creates instance with injected dependencies', () => {
      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });
      expect(service).toBeDefined();
    });
  });

  describe('initializeGame', () => {
    it('initializes game with currentPlay === 0', async () => {
      const firstPlay = createMockPlayData({ pn: 1 });
      const initialState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();

      mockFetchFirstPlay.mockResolvedValue(firstPlay);
      mockGenerateInitializationCompletion.mockResolvedValue(['Welcome to the game!']);
      mockInitializeLineupTracking.mockResolvedValue(undefined);
      mockConstructInitialGameState.mockResolvedValue(initialState);
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      const result = await service.initializeGame(testGameId, testSessionId, { skipLLM: true });

      expect(mockFetchFirstPlay).toHaveBeenCalledWith(testGameId);
      expect(mockGenerateInitializationCompletion).toHaveBeenCalledWith(testGameId, testSessionId, true);
      expect(mockInitializeLineupTracking).toHaveBeenCalledWith(testGameId, testSessionId);
      expect(mockConstructInitialGameState).toHaveBeenCalledWith(
        testGameId,
        testSessionId,
        firstPlay,
        ['Welcome to the game!']
      );
      expect(result.currentPlay).toBe(firstPlay.pn);
      expect(result.eventString).toBe(firstPlay.event);
    });

    it('uses skipLLM option when provided', async () => {
      const firstPlay = createMockPlayData();
      const initialState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();

      mockFetchFirstPlay.mockResolvedValue(firstPlay);
      mockGenerateInitializationCompletion.mockResolvedValue([]);
      mockInitializeLineupTracking.mockResolvedValue(undefined);
      mockConstructInitialGameState.mockResolvedValue(initialState);
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      await service.initializeGame(testGameId, testSessionId, { skipLLM: true });

      expect(mockGenerateInitializationCompletion).toHaveBeenCalledWith(testGameId, testSessionId, true);
    });
  });

  describe('getNextPlay', () => {
    it('delegates to initializeGame when currentPlayIndex === 0', async () => {
      const firstPlay = createMockPlayData();
      const initialState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();

      mockFetchFirstPlay.mockResolvedValue(firstPlay);
      mockGenerateInitializationCompletion.mockResolvedValue([]);
      mockInitializeLineupTracking.mockResolvedValue(undefined);
      mockConstructInitialGameState.mockResolvedValue(initialState);
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      await service.getNextPlay(testGameId, testSessionId, 0, { skipLLM: true });

      expect(mockFetchFirstPlay).toHaveBeenCalledWith(testGameId);
    });

    it('processes regular play when currentPlayIndex > 0', async () => {
      const currentPlayData = createMockPlayData({ pn: 5 });
      const nextPlayData = createMockPlayData({ pn: 6 });
      const baseballState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();
      const scoreResult: ScoreResult = {
        homeScoreBeforePlay: 0,
        visitorScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreAfterPlay: 0
      };

      mockPlayDataService.fetchPlayData.mockResolvedValue({
        currentPlayData,
        nextPlayData
      });
      mockPlayDataService.fetchPlayForBatter.mockResolvedValue(currentPlayData);

      mockCreateInitialBaseballState.mockResolvedValue(baseballState);
      mockProcessLineupState.mockResolvedValue(baseballState);

      mockScoreService.calculateScore.mockResolvedValue(scoreResult);

      mockCommentaryService.generateDetailedPlayCompletion.mockResolvedValue(['Great play!']);

      mockTranslateEvent.mockReturnValue('Single to center field');

      mockCreateSimplifiedState.mockReturnValue(simplifiedState);
      mockIsHomeTeam.mockReturnValue(true);
      mockUpdateNextBatterAndPitcher.mockImplementation(() => {});

      mockLineupService.processLineupChanges.mockResolvedValue(undefined);
      mockLineupService.updateLineupInfo.mockResolvedValue(undefined);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      const result = await service.getNextPlay(testGameId, testSessionId, 5, {
        skipLLM: true,
        announcerStyle: 'enthusiastic'
      });

      // Verify play data was fetched
      expect(mockPlayDataService.fetchPlayData).toHaveBeenCalledWith(testGameId, 5);

      // Verify baseball state was created
      expect(mockCreateInitialBaseballState).toHaveBeenCalledWith(
        testGameId,
        testSessionId,
        5,
        currentPlayData
      );

      // Verify score was calculated
      expect(mockScoreService.calculateScore).toHaveBeenCalledWith(
        testGameId,
        5,
        currentPlayData,
        nextPlayData
      );

      // Verify commentary was generated
      expect(mockCommentaryService.generateDetailedPlayCompletion).toHaveBeenCalledWith(
        baseballState,
        currentPlayData,
        5,
        true,
        testGameId,
        'enthusiastic'
      );

      // Verify event was translated
      expect(mockTranslateEvent).toHaveBeenCalled();

      // Verify lineup changes were processed
      expect(mockLineupService.processLineupChanges).toHaveBeenCalledWith(
        testGameId,
        testSessionId,
        currentPlayData,
        nextPlayData
      );

      // Result should be the simplified state
      expect(result).toBeDefined();
    });

    it('handles lineup change errors gracefully', async () => {
      const currentPlayData = createMockPlayData({ pn: 5 });
      const nextPlayData = createMockPlayData({ pn: 6 });
      const baseballState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();
      const scoreResult: ScoreResult = {
        homeScoreBeforePlay: 0,
        visitorScoreBeforePlay: 0,
        homeScoreAfterPlay: 0,
        visitorScoreAfterPlay: 0
      };

      mockPlayDataService.fetchPlayData.mockResolvedValue({
        currentPlayData,
        nextPlayData
      });
      mockPlayDataService.fetchPlayForBatter.mockResolvedValue(currentPlayData);
      mockCreateInitialBaseballState.mockResolvedValue(baseballState);
      mockProcessLineupState.mockResolvedValue(baseballState);
      mockScoreService.calculateScore.mockResolvedValue(scoreResult);
      mockCommentaryService.generateDetailedPlayCompletion.mockResolvedValue([]);
      mockTranslateEvent.mockReturnValue('Single');
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);
      mockIsHomeTeam.mockReturnValue(true);
      mockUpdateNextBatterAndPitcher.mockImplementation(() => {});

      // Simulate lineup error
      mockLineupService.processLineupChanges.mockRejectedValue(new Error('Lineup error'));

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      // Should not throw, should handle gracefully
      const result = await service.getNextPlay(testGameId, testSessionId, 5, { skipLLM: true });

      expect(result).toBeDefined();
    });

    it('updates scores correctly when home team matches', async () => {
      const currentPlayData = createMockPlayData({ pn: 5 });
      const nextPlayData = createMockPlayData({ pn: 6 });
      const baseballState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();
      const scoreResult: ScoreResult = {
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 1,
        homeScoreAfterPlay: 3,
        visitorScoreAfterPlay: 1
      };

      mockPlayDataService.fetchPlayData.mockResolvedValue({
        currentPlayData,
        nextPlayData
      });
      mockPlayDataService.fetchPlayForBatter.mockResolvedValue(currentPlayData);
      mockCreateInitialBaseballState.mockResolvedValue(baseballState);
      mockProcessLineupState.mockResolvedValue(baseballState);
      mockScoreService.calculateScore.mockResolvedValue(scoreResult);
      mockCommentaryService.generateDetailedPlayCompletion.mockResolvedValue([]);
      mockTranslateEvent.mockReturnValue('Home run');
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);
      mockIsHomeTeam.mockReturnValue(true);
      mockUpdateNextBatterAndPitcher.mockImplementation(() => {});
      mockLineupService.processLineupChanges.mockResolvedValue(undefined);
      mockLineupService.updateLineupInfo.mockResolvedValue(undefined);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      await service.getNextPlay(testGameId, testSessionId, 5, { skipLLM: true });

      // Verify scores were set correctly (home team matches)
      expect(baseballState.home.stats.runs).toBe(3);
      expect(baseballState.visitors.stats.runs).toBe(1);
    });

    it('updates scores correctly when home team does not match', async () => {
      const currentPlayData = createMockPlayData({ pn: 5 });
      const nextPlayData = createMockPlayData({ pn: 6 });
      const baseballState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();
      const scoreResult: ScoreResult = {
        homeScoreBeforePlay: 2,
        visitorScoreBeforePlay: 1,
        homeScoreAfterPlay: 2,
        visitorScoreAfterPlay: 3
      };

      mockPlayDataService.fetchPlayData.mockResolvedValue({
        currentPlayData,
        nextPlayData
      });
      mockPlayDataService.fetchPlayForBatter.mockResolvedValue(currentPlayData);
      mockCreateInitialBaseballState.mockResolvedValue(baseballState);
      mockProcessLineupState.mockResolvedValue(baseballState);
      mockScoreService.calculateScore.mockResolvedValue(scoreResult);
      mockCommentaryService.generateDetailedPlayCompletion.mockResolvedValue([]);
      mockTranslateEvent.mockReturnValue('Hit');
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);
      mockIsHomeTeam.mockReturnValue(false);
      mockUpdateNextBatterAndPitcher.mockImplementation(() => {});
      mockLineupService.processLineupChanges.mockResolvedValue(undefined);
      mockLineupService.updateLineupInfo.mockResolvedValue(undefined);

      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      await service.getNextPlay(testGameId, testSessionId, 5, { skipLLM: true });

      // Verify scores were set correctly (home team does NOT match)
      expect(baseballState.home.stats.runs).toBe(3);
      expect(baseballState.visitors.stats.runs).toBe(2);
    });
  });

  describe('static methods', () => {
    it('getNextPlay static method delegates to singleton', async () => {
      const firstPlay = createMockPlayData();
      const initialState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();

      mockFetchFirstPlay.mockResolvedValue(firstPlay);
      mockGenerateInitializationCompletion.mockResolvedValue([]);
      mockInitializeLineupTracking.mockResolvedValue(undefined);
      mockConstructInitialGameState.mockResolvedValue(initialState);
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);

      const result = await GamePlaybackService.getNextPlay(
        testGameId,
        testSessionId,
        0,
        { skipLLM: true }
      );

      expect(result).toBeDefined();
    });

    it('initializeGame static method delegates to singleton', async () => {
      const firstPlay = createMockPlayData();
      const initialState = createMockBaseballState();
      const simplifiedState = createMockSimplifiedState();

      mockFetchFirstPlay.mockResolvedValue(firstPlay);
      mockGenerateInitializationCompletion.mockResolvedValue([]);
      mockInitializeLineupTracking.mockResolvedValue(undefined);
      mockConstructInitialGameState.mockResolvedValue(initialState);
      mockCreateSimplifiedState.mockReturnValue(simplifiedState);

      const result = await GamePlaybackService.initializeGame(
        testGameId,
        testSessionId,
        { skipLLM: true }
      );

      expect(result).toBeDefined();
    });
  });

  describe('getCurrentGameState', () => {
    it('throws not implemented error', async () => {
      const service = new GamePlaybackService({
        playDataService: mockPlayDataService,
        scoreService: mockScoreService,
        commentaryService: mockCommentaryService,
        lineupService: mockLineupService
      });

      await expect(service.getCurrentGameState(testGameId, testSessionId))
        .rejects.toThrow('getCurrentGameState not yet implemented');
    });
  });
});
