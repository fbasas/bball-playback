import { metricsCollector } from './MetricsCollector';
import { logger } from '../logging';

/**
 * Baseball-specific metrics collector
 */
export class BaseballMetricsCollector {
  private static instance: BaseballMetricsCollector;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): BaseballMetricsCollector {
    if (!BaseballMetricsCollector.instance) {
      BaseballMetricsCollector.instance = new BaseballMetricsCollector();
    }
    return BaseballMetricsCollector.instance;
  }
  
  /**
   * Records a game creation
   * @param gameId The game ID
   * @param metadata Additional metadata
   */
  public recordGameCreation(gameId: string, metadata?: Record<string, any>): void {
    metricsCollector.incrementCounter('baseball.game_count', 1);
    
    logger.debug(`Recorded game creation: ${gameId}`, { gameId, metadata });
  }
  
  /**
   * Records a play
   * @param gameId The game ID
   * @param playType The play type
   * @param metadata Additional metadata
   */
  public recordPlay(gameId: string, playType: string, metadata?: Record<string, any>): void {
    metricsCollector.incrementCounter('baseball.play_count', 1, {
      game_id: gameId,
      type: playType
    });
    
    logger.debug(`Recorded play: ${playType} in game ${gameId}`, { gameId, playType, metadata });
  }
  
  /**
   * Records a substitution
   * @param gameId The game ID
   * @param team The team
   * @param metadata Additional metadata
   */
  public recordSubstitution(gameId: string, team: string, metadata?: Record<string, any>): void {
    metricsCollector.incrementCounter('baseball.substitution_count', 1, {
      game_id: gameId,
      team
    });
    
    logger.debug(`Recorded substitution for team ${team} in game ${gameId}`, { gameId, team, metadata });
  }
  
  /**
   * Records commentary generation time
   * @param gameId The game ID
   * @param provider The AI provider
   * @param durationMs The duration in milliseconds
   * @param metadata Additional metadata
   */
  public recordCommentaryGeneration(
    gameId: string,
    provider: string,
    durationMs: number,
    metadata?: Record<string, any>
  ): void {
    metricsCollector.recordHistogram('baseball.commentary_generation_time', durationMs, {
      game_id: gameId,
      provider
    });
    
    logger.debug(`Recorded commentary generation: ${durationMs}ms using ${provider} for game ${gameId}`, {
      gameId,
      provider,
      durationMs,
      metadata
    });
  }
  
  /**
   * Records a lineup change
   * @param gameId The game ID
   * @param team The team
   * @param metadata Additional metadata
   */
  public recordLineupChange(gameId: string, team: string, metadata?: Record<string, any>): void {
    metricsCollector.incrementCounter('baseball.lineup_change_count', 1, {
      game_id: gameId,
      team
    });
    
    logger.debug(`Recorded lineup change for team ${team} in game ${gameId}`, { gameId, team, metadata });
  }
  
  /**
   * Records a score change
   * @param gameId The game ID
   * @param team The team
   * @param runs The number of runs
   * @param metadata Additional metadata
   */
  public recordScoreChange(gameId: string, team: string, runs: number, metadata?: Record<string, any>): void {
    metricsCollector.incrementCounter('baseball.score_change', runs, {
      game_id: gameId,
      team
    });
    
    logger.debug(`Recorded score change: ${runs} runs for team ${team} in game ${gameId}`, {
      gameId,
      team,
      runs,
      metadata
    });
  }
  
  /**
   * Records an API request for baseball data
   * @param endpoint The API endpoint
   * @param gameId The game ID
   * @param durationMs The duration in milliseconds
   * @param statusCode The HTTP status code
   */
  public recordApiRequest(
    endpoint: string,
    gameId: string,
    durationMs: number,
    statusCode: number
  ): void {
    metricsCollector.recordHistogram('baseball.api_request_duration', durationMs, {
      endpoint,
      game_id: gameId,
      status: statusCode.toString()
    });
    
    metricsCollector.incrementCounter('baseball.api_request_count', 1, {
      endpoint,
      game_id: gameId,
      status: statusCode.toString()
    });
    
    logger.debug(`Recorded API request: ${endpoint} for game ${gameId} (${durationMs}ms, ${statusCode})`, {
      endpoint,
      gameId,
      durationMs,
      statusCode
    });
  }
  
  /**
   * Records a database query for baseball data
   * @param operation The database operation
   * @param table The database table
   * @param durationMs The duration in milliseconds
   * @param rowCount The number of rows affected
   */
  public recordDatabaseQuery(
    operation: string,
    table: string,
    durationMs: number,
    rowCount: number
  ): void {
    metricsCollector.recordHistogram('baseball.db_query_duration', durationMs, {
      operation,
      table
    });
    
    metricsCollector.incrementCounter('baseball.db_query_count', 1, {
      operation,
      table
    });
    
    if (rowCount > 0) {
      metricsCollector.setGauge('baseball.db_row_count', rowCount, {
        operation,
        table
      });
    }
    
    logger.debug(`Recorded database query: ${operation} on ${table} (${durationMs}ms, ${rowCount} rows)`, {
      operation,
      table,
      durationMs,
      rowCount
    });
  }
  
  /**
   * Records a cache hit or miss
   * @param key The cache key
   * @param hit Whether the cache was hit
   * @param durationMs The duration in milliseconds
   */
  public recordCacheAccess(key: string, hit: boolean, durationMs: number): void {
    metricsCollector.incrementCounter('baseball.cache_access', 1, {
      key,
      result: hit ? 'hit' : 'miss'
    });
    
    metricsCollector.recordHistogram('baseball.cache_access_duration', durationMs, {
      key,
      result: hit ? 'hit' : 'miss'
    });
    
    logger.debug(`Recorded cache ${hit ? 'hit' : 'miss'} for key ${key} (${durationMs}ms)`, {
      key,
      hit,
      durationMs
    });
  }
}

// Export a singleton instance
export const baseballMetricsCollector = BaseballMetricsCollector.getInstance();