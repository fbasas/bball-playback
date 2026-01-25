import { BaseService } from '../../BaseService';
import { contextLogger } from '../../../core/logging';
import {
  IGamePlaybackService,
  IPlayDataService,
  IScoreService,
  ICommentaryService,
  ILineupService,
  AnnouncerStyle,
  SimplifiedBaseballState,
  NextPlayOptions
} from '../../interfaces';
import { PlayDataService } from '../playData/PlayDataService';
import { ScoreService } from '../score/ScoreService';
import { CommentaryService } from '../commentary/CommentaryService';
import { LineupService } from '../lineup/LineupService';
import { BaseballStateService } from '../state/BaseballStateService';
import { translateEvent } from '../../eventTranslation';
import {
  fetchFirstPlay,
  generateInitializationCompletion,
  initializeLineupTracking,
  constructInitialGameState
} from '../gameInitialization';
import {
  createSimplifiedState,
  updateNextBatterAndPitcher,
  isHomeTeam
} from '../../../utils/GameUtils';
import {
  EXPECTED_EVENT_MAP,
  DEFAULT_ANNOUNCER_STYLE
} from '../../../constants/GameConstants';
import { EventTranslationError } from '../../../core/errors';

// Re-export NextPlayOptions for convenience
export { NextPlayOptions } from '../../interfaces';

/**
 * Dependencies for GamePlaybackService
 */
export interface GamePlaybackDependencies {
  playDataService?: IPlayDataService;
  scoreService?: IScoreService;
  commentaryService?: ICommentaryService;
  lineupService?: ILineupService;
}

/**
 * GamePlaybackService orchestrates the entire game playback flow.
 *
 * This service extracts all orchestration logic from the nextPlay route handler,
 * making it testable, reusable, and following the dependency injection pattern.
 *
 * Responsibilities:
 * - Initialize a new game session
 * - Advance to the next play
 * - Coordinate between PlayDataService, ScoreService, CommentaryService, etc.
 * - Translate events to human-readable descriptions
 * - Track lineup changes
 */
export class GamePlaybackService extends BaseService implements IGamePlaybackService {
  private static instance: GamePlaybackService;

  private playDataService: IPlayDataService;
  private scoreService: IScoreService;
  private commentaryService: ICommentaryService;
  private lineupService: ILineupService;

  /**
   * Creates a new instance of GamePlaybackService
   * @param dependencies Optional dependencies for dependency injection
   */
  constructor(dependencies: GamePlaybackDependencies = {}) {
    super(dependencies);
    this.playDataService = dependencies.playDataService || PlayDataService.getInstance();
    this.scoreService = dependencies.scoreService || ScoreService.getInstance();
    this.commentaryService = dependencies.commentaryService || CommentaryService.getInstance();
    this.lineupService = dependencies.lineupService || LineupService.getInstance();
  }

  /**
   * Gets the singleton instance (for backward compatibility)
   */
  public static getInstance(): GamePlaybackService {
    if (!GamePlaybackService.instance) {
      GamePlaybackService.instance = new GamePlaybackService();
    }
    return GamePlaybackService.instance;
  }

  /**
   * Initializes a new game session
   * Handles currentPlay === 0 case
   */
  async initializeGame(
    gameId: string,
    sessionId: string,
    options: NextPlayOptions = {}
  ): Promise<SimplifiedBaseballState> {
    const serviceLogger = contextLogger({
      service: 'GamePlaybackService',
      method: 'initializeGame',
      gameId,
      sessionId
    });

    const skipLLM = options.skipLLM ?? false;

    serviceLogger.info('Initializing game', { skipLLM });

    // Fetch the first play
    const firstPlay = await fetchFirstPlay(gameId);

    // Generate initialization text
    const logEntries = await generateInitializationCompletion(gameId, sessionId, skipLLM);

    // Initialize lineup tracking
    await initializeLineupTracking(gameId, sessionId);

    // Construct initial game state
    const gameState = await constructInitialGameState(gameId, sessionId, firstPlay, logEntries);

    // Convert to SimplifiedBaseballState
    const simplifiedState = createSimplifiedState(gameState, firstPlay);

    // Debug log the game state
    serviceLogger.debug('GameState team info (initialization)', {
      home: {
        displayName: gameState.home.displayName,
        shortName: gameState.home.shortName
      },
      visitors: {
        displayName: gameState.visitors.displayName,
        shortName: gameState.visitors.shortName
      }
    });

    // Initialize runs
    simplifiedState.home.runs = 0;
    simplifiedState.visitors.runs = 0;

    // Debug log the simplified state
    serviceLogger.debug('SimplifiedBaseballState team info (initialization)', {
      home: {
        displayName: simplifiedState.home.displayName,
        shortName: simplifiedState.home.shortName,
        runs: simplifiedState.home.runs
      },
      visitors: {
        displayName: simplifiedState.visitors.displayName,
        shortName: simplifiedState.visitors.shortName,
        runs: simplifiedState.visitors.runs
      }
    });

    // Set next batter and pitcher
    simplifiedState.home.nextBatter = gameState.home.currentBatter || null;
    simplifiedState.home.nextPitcher = gameState.home.currentPitcher || null;
    simplifiedState.visitors.nextBatter = gameState.visitors.currentBatter || null;
    simplifiedState.visitors.nextPitcher = gameState.visitors.currentPitcher || null;

    // Set current play
    simplifiedState.currentPlay = firstPlay.pn;

    // No play description for initialization
    simplifiedState.playDescription = undefined;

    // Include event string for the first play
    simplifiedState.eventString = firstPlay.event;

    serviceLogger.info('Game initialized successfully', {
      currentPlay: simplifiedState.currentPlay
    });

    return simplifiedState;
  }

  /**
   * Gets the next play in the game sequence
   * Handles currentPlay > 0 case
   */
  async getNextPlay(
    gameId: string,
    sessionId: string,
    currentPlayIndex: number,
    options: NextPlayOptions = {}
  ): Promise<SimplifiedBaseballState> {
    const serviceLogger = contextLogger({
      service: 'GamePlaybackService',
      method: 'getNextPlay',
      gameId,
      sessionId
    });

    const skipLLM = options.skipLLM ?? false;
    const announcerStyle = options.announcerStyle ?? DEFAULT_ANNOUNCER_STYLE;

    serviceLogger.info('Processing next play request', {
      currentPlayIndex,
      skipLLM,
      announcerStyle
    });

    // Handle initialization (currentPlay === 0)
    if (currentPlayIndex === 0) {
      return this.initializeGame(gameId, sessionId, options);
    }

    // Fetch play data
    const { currentPlayData, nextPlayData } = await this.playDataService.fetchPlayData(
      gameId,
      currentPlayIndex
    );

    // Create initial baseball state
    let currentState = await BaseballStateService.createInitialBaseballState(
      gameId,
      sessionId,
      currentPlayIndex,
      currentPlayData
    );

    // Process lineup state
    currentState = await BaseballStateService.processLineupState(
      gameId,
      sessionId,
      currentPlayIndex,
      currentState,
      currentPlayData,
      nextPlayData
    );

    // Calculate scores
    const scoreResult = await this.scoreService.calculateScore(
      gameId,
      currentPlayIndex,
      currentPlayData,
      nextPlayData
    );

    const {
      homeScoreBeforePlay,
      visitorScoreBeforePlay,
      homeScoreAfterPlay,
      visitorScoreAfterPlay
    } = scoreResult;

    serviceLogger.debug('Score calculation result', {
      homeScoreBeforePlay,
      visitorScoreBeforePlay,
      homeScoreAfterPlay,
      visitorScoreAfterPlay,
      currentPlayIndex,
      currentPlayData: {
        pn: currentPlayData.pn,
        batter: currentPlayData.batter,
        event: currentPlayData.event,
        runs: currentPlayData.runs
      }
    });

    // Update the baseball state with the calculated scores AFTER the play
    serviceLogger.debug('Team IDs', {
      homeStateId: currentState.home.id,
      visitorStateId: currentState.visitors.id,
      nextPlayHomeTeam: isHomeTeam(nextPlayData, currentState.home.id) ? 'Yes' : 'No',
      nextPlayData: {
        batteam: nextPlayData.batteam,
        pitteam: nextPlayData.pitteam,
        top_bot: nextPlayData.top_bot
      }
    });

    // Use the "after" scores
    if (isHomeTeam(nextPlayData, currentState.home.id)) {
      currentState.home.stats.runs = homeScoreAfterPlay;
      currentState.visitors.stats.runs = visitorScoreAfterPlay;
      serviceLogger.debug('Setting scores (home team matches)', {
        homeTeam: currentState.home.id,
        homeScore: homeScoreAfterPlay,
        visitorTeam: currentState.visitors.id,
        visitorScore: visitorScoreAfterPlay
      });
    } else {
      currentState.home.stats.runs = visitorScoreAfterPlay;
      currentState.visitors.stats.runs = homeScoreAfterPlay;
      serviceLogger.debug('Setting scores (home team does not match)', {
        homeTeam: currentState.home.id,
        homeScore: visitorScoreAfterPlay,
        visitorTeam: currentState.visitors.id,
        visitorScore: homeScoreAfterPlay
      });
    }

    // Generate detailed play-by-play commentary
    const logEntries = await this.commentaryService.generateDetailedPlayCompletion(
      currentState,
      currentPlayData,
      currentPlayIndex,
      skipLLM,
      gameId,
      announcerStyle
    );

    // Get the correct event for the current batter
    const currentBatter = currentPlayData.batter;
    const correctPlayForBatter = await this.playDataService.fetchPlayForBatter(
      gameId,
      currentBatter
    );

    // Use the correct event if found, otherwise use the current play's event
    const eventToTranslate = correctPlayForBatter?.event || currentPlayData.event || nextPlayData.event;

    // Generate play description using the event translation service
    let playDescription: string | undefined;
    try {
      if (eventToTranslate) {
        playDescription = translateEvent(eventToTranslate);

        // Double-check that the play description matches the expected event
        if (eventToTranslate in EXPECTED_EVENT_MAP && EXPECTED_EVENT_MAP[eventToTranslate] !== playDescription) {
          playDescription = EXPECTED_EVENT_MAP[eventToTranslate];
        }
      }
    } catch (error) {
      throw new EventTranslationError('Failed to translate event data');
    }

    // Create a simplified response
    const simplifiedState = createSimplifiedState(currentState, nextPlayData, playDescription);

    // Debug log the simplified state
    serviceLogger.debug('SimplifiedBaseballState team info', {
      home: {
        displayName: simplifiedState.home.displayName,
        shortName: simplifiedState.home.shortName,
        runs: simplifiedState.home.runs
      },
      visitors: {
        displayName: simplifiedState.visitors.displayName,
        shortName: simplifiedState.visitors.shortName,
        runs: simplifiedState.visitors.runs
      }
    });

    // Set log entries
    simplifiedState.game.log = logEntries;

    // Update next batter and pitcher
    updateNextBatterAndPitcher(simplifiedState, nextPlayData);

    // Set current play to next play number
    simplifiedState.currentPlay = nextPlayData.pn;

    // Set event string
    simplifiedState.eventString = eventToTranslate || nextPlayData.event || '';

    // Process lineup changes
    try {
      await this.lineupService.processLineupChanges(gameId, sessionId, currentPlayData, nextPlayData);
      await this.lineupService.updateLineupInfo(gameId, sessionId, nextPlayData, simplifiedState);
    } catch (error) {
      // Log the error but don't throw it to avoid breaking the main flow
      serviceLogger.warn('Error processing lineup changes', { error });
    }

    serviceLogger.info('Successfully processed next play', {
      currentPlay: simplifiedState.currentPlay,
      inning: simplifiedState.game.inning,
      isTopInning: simplifiedState.game.isTopInning
    });

    return simplifiedState;
  }

  /**
   * Gets the current game state (stub for future implementation)
   */
  async getCurrentGameState(gameId: string, sessionId: string): Promise<{
    gameId: string;
    sessionId: string;
    currentPlayIndex: number;
    baseballState: SimplifiedBaseballState;
  }> {
    // This would typically retrieve the current state from a session store
    // For now, throw an error as this is not yet implemented
    throw new Error('getCurrentGameState not yet implemented');
  }

  // Static methods for backward compatibility during transition
  public static async getNextPlay(
    gameId: string,
    sessionId: string,
    currentPlayIndex: number,
    options?: NextPlayOptions
  ): Promise<SimplifiedBaseballState> {
    return GamePlaybackService.getInstance().getNextPlay(
      gameId,
      sessionId,
      currentPlayIndex,
      options
    );
  }

  public static async initializeGame(
    gameId: string,
    sessionId: string,
    options?: NextPlayOptions
  ): Promise<SimplifiedBaseballState> {
    return GamePlaybackService.getInstance().initializeGame(
      gameId,
      sessionId,
      options
    );
  }
}
