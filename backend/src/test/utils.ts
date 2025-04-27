/**
 * Test utilities
 * 
 * This file contains helper functions for testing.
 */

import { BaseballState, TeamState, GameState } from '../../../common/types/BaseballTypes';
import { PlayData } from '../../../common/types/PlayData';
import { SimplifiedBaseballState } from '../../../common/types/SimplifiedBaseballState';

/**
 * Creates a mock BaseballState object for testing
 */
export function createMockBaseballState(overrides: Partial<BaseballState> = {}): BaseballState {
  return {
    gameId: 'TEST_GAME_001',
    sessionId: 'TEST_SESSION_001',
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      onFirst: '',
      onSecond: '',
      onThird: '',
      log: []
    },
    home: {
      id: 'HOME_TEAM',
      displayName: 'Home Team',
      shortName: 'HOME',
      currentPitcher: 'PITCHER_001',
      lineup: [],
      stats: {
        innings: [],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: null
    },
    visitors: {
      id: 'AWAY_TEAM',
      displayName: 'Away Team',
      shortName: 'AWAY',
      currentPitcher: 'PITCHER_002',
      lineup: [],
      stats: {
        innings: [],
        runs: 0,
        hits: 0,
        errors: 0
      },
      currentBatter: null
    },
    currentPlay: 0,
    gameType: 'replay',
    ...overrides
  };
}

/**
 * Creates a mock PlayData object for testing
 */
export function createMockPlayData(overrides: Partial<PlayData> = {}): PlayData {
  return {
    gid: 'TEST_GAME_001',
    pn: 1,
    inning: 1,
    top_bot: 0, // 0 for top of inning
    batteam: 'AWAY_TEAM',
    pitteam: 'HOME_TEAM',
    batter: 'BATTER_001',
    pitcher: 'PITCHER_001',
    outs_pre: 0,
    outs_post: 0,
    br1_pre: undefined,
    br2_pre: undefined,
    br3_pre: undefined,
    event: 'S8',
    runs: 0,
    ...overrides
  };
}

/**
 * Creates a mock SimplifiedBaseballState object for testing
 */
export function createMockSimplifiedBaseballState(
  overrides: Partial<SimplifiedBaseballState> = {}
): SimplifiedBaseballState {
  return {
    gameId: 'TEST_GAME_001',
    sessionId: 'TEST_SESSION_001',
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      onFirst: '',
      onSecond: '',
      onThird: '',
      log: []
    },
    home: {
      id: 'HOME_TEAM',
      displayName: 'Home Team',
      shortName: 'HOME',
      currentBatter: null,
      currentPitcher: 'PITCHER_001',
      nextBatter: null,
      nextPitcher: null,
      runs: 0
    },
    visitors: {
      id: 'AWAY_TEAM',
      displayName: 'Away Team',
      shortName: 'AWAY',
      currentBatter: 'BATTER_001',
      currentPitcher: null,
      nextBatter: null,
      nextPitcher: null,
      runs: 0
    },
    currentPlay: 0,
    playDescription: 'Single to center field',
    eventString: 'S8',
    ...overrides
  };
}

/**
 * Creates a mock database row object for testing
 */
export function createMockDbRow<T extends Record<string, any>>(template: T): T {
  return { ...template };
}

/**
 * Creates a mock repository for testing
 */
export function createMockRepository<T>() {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn()
  };
}

/**
 * Creates a mock service for testing
 */
export function createMockService<T>() {
  return {
    findById: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  };
}