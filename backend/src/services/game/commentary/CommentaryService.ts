import { BaseballState } from '../../../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../../../common/types/SimplifiedBaseballState';
import { PlayData } from '../../../../../common/types/PlayData';
import { generateNextPlayPrompt, generatePlayByPlayPrompt } from '../../../services/prompts';
import { translateEvent } from '../../../services/eventTranslation';
import { gameRepository } from '../../../database/repositories/GameRepository';
import { PlayerService } from '../player/PlayerService';
import { BaseService } from '../../BaseService';
import { PlayerUtils } from '../../../utils/PlayerUtils';
import { AIServiceAdapter, getAIAdapter } from './adapters';
import { baseballMetricsCollector } from '../../../core/metrics';
import { logger } from '../../../core/logging';

/**
 * Type for announcer styles
 */
export type AnnouncerStyle = 'classic' | 'modern' | 'enthusiastic' | 'poetic';

/**
 * Service for generating play-by-play commentary
 */
export class CommentaryService extends BaseService {
  // Singleton instance for backward compatibility during transition
  private static instance: CommentaryService;
  private playerService: PlayerService;
  private aiAdapter: AIServiceAdapter;

  /**
   * Creates a new instance of the CommentaryService
   * @param dependencies Optional dependencies to inject
   */
  constructor(dependencies: Record<string, any> = {}) {
    super(dependencies);
    this.playerService = dependencies.playerService || PlayerService.getInstance();
    this.aiAdapter = dependencies.aiAdapter || getAIAdapter();
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): CommentaryService {
    if (!CommentaryService.instance) {
      CommentaryService.instance = new CommentaryService({
        playerService: PlayerService.getInstance(),
        aiAdapter: getAIAdapter()
      });
    }
    return CommentaryService.instance;
  }

  /**
   * Sets the AI adapter to use for generating completions
   * @param adapterName The name of the adapter to use
   */
  public setAIAdapter(adapterName: string): void {
    this.aiAdapter = getAIAdapter(adapterName);
  }

  /**
   * Generates play completion text
   * @param currentState The current baseball state
   * @param nextPlay The next play data
   * @param currentPlay The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @returns Array of commentary lines
   */
  public async generatePlayCompletion(
    currentState: BaseballState,
    nextPlay: PlayData,
    currentPlay: number,
    skipLLM: boolean,
    gameId: string
  ): Promise<string[]> {
    const prompt = generateNextPlayPrompt(currentState, nextPlay, currentPlay);
    
    const startTime = performance.now();
    let completionText: string;
    
    try {
      if (skipLLM) {
        completionText = "This is a dummy response for testing purposes. LLM calls are being skipped.";
      } else {
        completionText = await this.aiAdapter.generateCompletion(prompt, { gameId });
      }
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Record metrics for commentary generation
      baseballMetricsCollector.recordCommentaryGeneration(
        gameId,
        this.aiAdapter.getProviderName(),
        durationMs,
        { playIndex: currentPlay, type: 'basic' }
      );
      
      logger.debug(`Generated play commentary in ${durationMs.toFixed(2)}ms`, {
        gameId,
        playIndex: currentPlay,
        provider: this.aiAdapter.getProviderName(),
        durationMs
      });
    } catch (error) {
      logger.error('Error generating play commentary', {
        gameId,
        playIndex: currentPlay,
        error
      });
      
      // Return a fallback response
      completionText = "The announcer pauses briefly.";
    }
    
    return this.formatCompletion(completionText);
  }

  /**
   * Generates a detailed play-by-play completion using the announcer-specific prompt
   * @param currentState The current baseball state
   * @param nextPlay The next play data
   * @param currentPlay The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @param announcerStyle The announcer style to use
   * @returns Array of commentary lines
   */
  public async generateDetailedPlayCompletion(
    currentState: BaseballState,
    currentPlay: PlayData, // Renamed from nextPlay to currentPlay for clarity
    currentPlayIndex: number,
    skipLLM: boolean,
    gameId: string,
    announcerStyle: AnnouncerStyle = 'classic'
  ): Promise<string[]> {
    // Create a simplified baseball state for AFTER the play (current state)
    const afterState: SimplifiedBaseballState = {
      gameId: currentState.gameId,
      sessionId: currentState.sessionId,
      game: {
        inning: currentState.game.inning,
        isTopInning: currentState.game.isTopInning,
        outs: currentState.game.outs,
        log: currentState.game.log || [],
        onFirst: currentState.game.onFirst || '',
        onSecond: currentState.game.onSecond || '',
        onThird: currentState.game.onThird || ''
      },
      home: {
        id: currentState.home.id,
        displayName: currentState.home.displayName || await gameRepository.getTeamDisplayName(currentState.home.id),
        shortName: currentState.home.shortName || await gameRepository.getTeamShortName(currentState.home.id),
        currentBatter: currentState.home.currentBatter,
        currentPitcher: currentState.home.currentPitcher,
        nextBatter: null,
        nextPitcher: null,
        runs: currentState.home.stats.runs
      },
      visitors: {
        id: currentState.visitors.id,
        displayName: currentState.visitors.displayName || await gameRepository.getTeamDisplayName(currentState.visitors.id),
        shortName: currentState.visitors.shortName || await gameRepository.getTeamShortName(currentState.visitors.id),
        currentBatter: currentState.visitors.currentBatter,
        currentPitcher: currentState.visitors.currentPitcher,
        nextBatter: null,
        nextPitcher: null,
        runs: currentState.visitors.stats.runs
      },
      currentPlay: currentPlayIndex,
      // Use the current play's event for the play description
      playDescription: translateEvent(currentPlay.event || ''),
      eventString: currentPlay.event
    };
    
    // Create a simplified baseball state for BEFORE the play
    // We'll use the pre-play data from the currentPlay object
    const beforeState: SimplifiedBaseballState = {
      ...afterState,
      game: {
        ...afterState.game,
        inning: currentPlay.inning,
        isTopInning: currentPlay.top_bot === 0,
        outs: currentPlay.outs_pre,
        onFirst: currentPlay.br1_pre ? await this.getPlayerName(currentPlay.br1_pre) : '',
        onSecond: currentPlay.br2_pre ? await this.getPlayerName(currentPlay.br2_pre) : '',
        onThird: currentPlay.br3_pre ? await this.getPlayerName(currentPlay.br3_pre) : ''
      },
      home: {
        ...afterState.home,
        // Use the correct pre-play scores from the currentState
        // The currentState already has the correct pre-play scores from ScoreService
        runs: currentState.home.stats.runs
      },
      visitors: {
        ...afterState.visitors,
        // Use the correct pre-play scores from the currentState
        // The currentState already has the correct pre-play scores from ScoreService
        runs: currentState.visitors.stats.runs
      }
    };
    
    // Set the current batter in the before state
    if (currentPlay.batter) {
      const batterName = await this.getPlayerName(currentPlay.batter);
      if (currentPlay.top_bot === 0) {
        beforeState.visitors.currentBatter = batterName;
      } else {
        beforeState.home.currentBatter = batterName;
      }
    }
    
    // Set the current pitcher in the before state
    if (currentPlay.pitcher) {
      const pitcherName = await this.getPlayerName(currentPlay.pitcher);
      if (currentPlay.top_bot === 0) {
        beforeState.home.currentPitcher = pitcherName;
      } else {
        beforeState.visitors.currentPitcher = pitcherName;
      }
    }
    
    // Log the states for debugging
    console.log('[COMMENTARY] Current state team info (pre-play scores):', JSON.stringify({
      home: {
        displayName: currentState.home.displayName,
        shortName: currentState.home.shortName,
        runs: currentState.home.stats.runs
      },
      visitors: {
        displayName: currentState.visitors.displayName,
        shortName: currentState.visitors.shortName,
        runs: currentState.visitors.stats.runs
      }
    }, null, 2));
    
    console.log('[COMMENTARY] Before state team info:', JSON.stringify({
      home: {
        displayName: beforeState.home.displayName,
        shortName: beforeState.home.shortName,
        runs: beforeState.home.runs
      },
      visitors: {
        displayName: beforeState.visitors.displayName,
        shortName: beforeState.visitors.shortName,
        runs: beforeState.visitors.runs
      }
    }, null, 2));
    
    console.log('[COMMENTARY] After state team info:', JSON.stringify({
      home: {
        displayName: afterState.home.displayName,
        shortName: afterState.home.shortName,
        runs: afterState.home.runs
      },
      visitors: {
        displayName: afterState.visitors.displayName,
        shortName: afterState.visitors.shortName,
        runs: afterState.visitors.runs
      }
    }, null, 2));
    
    // Generate the detailed prompt with both before and after states
    const prompt = await generatePlayByPlayPrompt(afterState, beforeState, announcerStyle);
    
    const startTime = performance.now();
    let completionText: string;
    
    try {
      if (skipLLM) {
        completionText = "This is a dummy response for testing purposes. LLM calls are being skipped.";
      } else {
        completionText = await this.aiAdapter.generateCompletion(prompt, { gameId, announcerStyle });
      }
      
      const endTime = performance.now();
      const durationMs = endTime - startTime;
      
      // Record metrics for detailed commentary generation
      baseballMetricsCollector.recordCommentaryGeneration(
        gameId,
        this.aiAdapter.getProviderName(),
        durationMs,
        {
          playIndex: currentPlayIndex,
          type: 'detailed',
          announcerStyle
        }
      );
      
      logger.debug(`Generated detailed play commentary in ${durationMs.toFixed(2)}ms`, {
        gameId,
        playIndex: currentPlayIndex,
        provider: this.aiAdapter.getProviderName(),
        announcerStyle,
        durationMs
      });
    } catch (error) {
      logger.error('Error generating detailed play commentary', {
        gameId,
        playIndex: currentPlayIndex,
        announcerStyle,
        error
      });
      
      // Return a fallback response
      completionText = "The announcer pauses briefly to collect their thoughts.";
    }
    
    return this.formatCompletion(completionText);
  }

  /**
   * Formats the completion text into an array of lines
   * @param completionText The raw completion text
   * @returns Array of formatted lines
   */
  private formatCompletion(completionText: string): string[] {
    return completionText
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());
  }
  
  /**
   * Helper method to get a player's full name from their ID
   * @param playerId The player ID
   * @returns The player's full name
   */
  private async getPlayerName(playerId: string): Promise<string> {
    const playerName = await this.playerService.getPlayerName(playerId);
    return playerName || playerId;
  }

  // Static methods for backward compatibility during transition
  public static async generatePlayCompletion(
    currentState: BaseballState,
    nextPlay: PlayData,
    currentPlay: number,
    skipLLM: boolean,
    gameId: string
  ): Promise<string[]> {
    return CommentaryService.getInstance().generatePlayCompletion(
      currentState, nextPlay, currentPlay, skipLLM, gameId
    );
  }

  public static async generateDetailedPlayCompletion(
    currentState: BaseballState,
    currentPlay: PlayData,
    currentPlayIndex: number,
    skipLLM: boolean,
    gameId: string,
    announcerStyle: AnnouncerStyle = 'classic'
  ): Promise<string[]> {
    return CommentaryService.getInstance().generateDetailedPlayCompletion(
      currentState, currentPlay, currentPlayIndex, skipLLM, gameId, announcerStyle
    );
  }

  private static async getPlayerName(playerId: string): Promise<string> {
    return PlayerUtils.getPlayerName(playerId);
  }
}