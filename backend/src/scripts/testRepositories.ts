/**
 * Test script for the repository pattern and caching implementation
 * 
 * This script demonstrates the use of repositories and caching by:
 * 1. Fetching player data using the PlayerRepository
 * 2. Fetching play data using the PlayRepository
 * 3. Calculating scores using the ScoreRepository
 * 4. Measuring performance improvements with caching
 * 
 * Run with: npm run ts-node src/scripts/testRepositories.ts
 */

import { playerRepository } from '../database/repositories/PlayerRepository';
import { playRepository } from '../database/repositories/PlayRepository';
import { scoreRepository } from '../database/repositories/ScoreRepository';
import { gameRepository } from '../database/repositories/GameRepository';
import { logger } from '../core/logging';

// Test game ID (NYA201904030)
const GAME_ID = 'NYA201904030';

/**
 * Measures the execution time of a function
 * @param fn The function to measure
 * @param name The name of the function for logging
 * @returns The result of the function
 */
async function measureExecutionTime<T>(fn: () => Promise<T>, name: string): Promise<T> {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  logger.info(`${name} execution time: ${end - start}ms`);
  return result;
}

/**
 * Main test function
 */
async function runTest() {
  try {
    logger.info('Starting repository and caching test...');
    
    // Test PlayerRepository
    logger.info('Testing PlayerRepository...');
    
    // First call (no cache)
    const player1 = await measureExecutionTime(
      () => playerRepository.getPlayerById('aaroh101'),
      'PlayerRepository.getPlayerById (no cache)'
    );
    logger.info(`Player: ${player1?.fullName}`);
    
    // Second call (with cache)
    const player2 = await measureExecutionTime(
      () => playerRepository.getPlayerById('aaroh101'),
      'PlayerRepository.getPlayerById (with cache)'
    );
    logger.info(`Player: ${player2?.fullName}`);
    
    // Test PlayRepository
    logger.info('Testing PlayRepository...');
    
    // First call (no cache)
    const firstPlay = await measureExecutionTime(
      () => playRepository.fetchFirstPlay(GAME_ID),
      'PlayRepository.fetchFirstPlay (no cache)'
    );
    logger.info(`First play: ${firstPlay.pn}, Inning: ${firstPlay.inning}, Top/Bot: ${firstPlay.top_bot}`);
    
    // Second call (with cache)
    const firstPlayCached = await measureExecutionTime(
      () => playRepository.fetchFirstPlay(GAME_ID),
      'PlayRepository.fetchFirstPlay (with cache)'
    );
    logger.info(`First play (cached): ${firstPlayCached.pn}, Inning: ${firstPlayCached.inning}, Top/Bot: ${firstPlayCached.top_bot}`);
    
    // Test fetching play data
    const playData = await measureExecutionTime(
      () => playRepository.fetchPlayData(GAME_ID, 1),
      'PlayRepository.fetchPlayData (no cache)'
    );
    logger.info(`Current play: ${playData.currentPlayData.pn}, Next play: ${playData.nextPlayData.pn}`);
    
    // Second call (with cache)
    const playDataCached = await measureExecutionTime(
      () => playRepository.fetchPlayData(GAME_ID, 1),
      'PlayRepository.fetchPlayData (with cache)'
    );
    logger.info(`Current play (cached): ${playDataCached.currentPlayData.pn}, Next play: ${playDataCached.nextPlayData.pn}`);
    
    // Test ScoreRepository
    logger.info('Testing ScoreRepository...');
    
    // Standard calculation (no cache)
    const score1 = await measureExecutionTime(
      () => scoreRepository.calculateScore(
        GAME_ID,
        2,
        playDataCached.currentPlayData,
        playDataCached.nextPlayData
      ),
      'ScoreRepository.calculateScore (no cache)'
    );
    logger.info(`Score before play - Home: ${score1.homeScoreBeforePlay}, Visitors: ${score1.visitorScoreBeforePlay}`);
    logger.info(`Score after play - Home: ${score1.homeScoreAfterPlay}, Visitors: ${score1.visitorScoreAfterPlay}`);
    
    // Standard calculation (with cache)
    const score2 = await measureExecutionTime(
      () => scoreRepository.calculateScore(
        GAME_ID,
        2,
        playDataCached.currentPlayData,
        playDataCached.nextPlayData
      ),
      'ScoreRepository.calculateScore (with cache)'
    );
    logger.info(`Score before play (cached) - Home: ${score2.homeScoreBeforePlay}, Visitors: ${score2.visitorScoreBeforePlay}`);
    
    // Optimized calculation (no cache)
    const score3 = await measureExecutionTime(
      () => scoreRepository.calculateScoreOptimized(
        GAME_ID,
        2,
        playDataCached.currentPlayData,
        playDataCached.nextPlayData
      ),
      'ScoreRepository.calculateScoreOptimized (no cache)'
    );
    logger.info(`Score before play (optimized) - Home: ${score3.homeScoreBeforePlay}, Visitors: ${score3.visitorScoreBeforePlay}`);
    
    // Optimized calculation (with cache)
    const score4 = await measureExecutionTime(
      () => scoreRepository.calculateScoreOptimized(
        GAME_ID,
        2,
        playDataCached.currentPlayData,
        playDataCached.nextPlayData
      ),
      'ScoreRepository.calculateScoreOptimized (with cache)'
    );
    logger.info(`Score before play (optimized, cached) - Home: ${score4.homeScoreBeforePlay}, Visitors: ${score4.visitorScoreBeforePlay}`);
    
    // Test GameRepository
    logger.info('Testing GameRepository...');
    
    // Get team display name (no cache)
    const teamName1 = await measureExecutionTime(
      () => gameRepository.getTeamDisplayName('NYA'),
      'GameRepository.getTeamDisplayName (no cache)'
    );
    logger.info(`Team name: ${teamName1}`);
    
    // Get team display name (with cache)
    const teamName2 = await measureExecutionTime(
      () => gameRepository.getTeamDisplayName('NYA'),
      'GameRepository.getTeamDisplayName (with cache)'
    );
    logger.info(`Team name (cached): ${teamName2}`);
    
    logger.info('Repository and caching test completed successfully!');
  } catch (error) {
    logger.error('Error in repository test:', error);
  }
}

// Run the test
runTest();