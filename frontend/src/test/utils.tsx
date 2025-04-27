import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Custom render function that includes providers if needed
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, { ...options });
}

/**
 * Mock API response for a game
 */
export const mockGameResponse = {
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
  gameType: 'replay'
};

/**
 * Mock API response for a play
 */
export const mockPlayResponse = {
  currentPlayData: {
    gid: 'TEST_GAME_001',
    pn: 1,
    inning: 1,
    top_bot: 0,
    batteam: 'AWAY_TEAM',
    pitteam: 'HOME_TEAM',
    batter: 'BATTER_001',
    pitcher: 'PITCHER_001',
    outs_pre: 0,
    outs_post: 1,
    event: 'S8',
    runs: 0
  },
  nextPlayData: {
    gid: 'TEST_GAME_001',
    pn: 2,
    inning: 1,
    top_bot: 0,
    batteam: 'AWAY_TEAM',
    pitteam: 'HOME_TEAM',
    batter: 'BATTER_002',
    pitcher: 'PITCHER_001',
    outs_pre: 1,
    outs_post: 2,
    event: 'K',
    runs: 0
  }
};

/**
 * Setup mock fetch responses
 */
export function setupMockFetch() {
  // Reset fetch mock
  vi.mocked(fetch).mockReset();

  // Mock fetch for game initialization
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/game/init')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGameResponse)
      } as Response);
    }
    
    if (url.includes('/api/game/next')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockPlayResponse)
      } as Response);
    }
    
    if (url.includes('/api/game/createGame')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          gameId: 'TEST_GAME_001',
          sessionId: 'TEST_SESSION_001',
          gameState: mockGameResponse
        })
      } as Response);
    }
    
    // Default response for unhandled URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    } as Response);
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };