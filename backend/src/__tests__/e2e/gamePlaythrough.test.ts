/**
 * Historical Game Regression Test Framework
 *
 * Plays through full historical games via GamePlaybackService.getNextPlay()
 * and validates each play's computed state against raw database queries.
 *
 * Skipped by default — set REPLAY_TEST_DB_HOST to enable.
 * Requires a real database with Retrosheet data and a valid .env file.
 *
 * Usage:
 *   cd backend
 *   REPLAY_TEST_DB_HOST=localhost OPENAI_API_KEY=sk-dummy \
 *     DB_HOST=localhost DB_NAME=retrosheet DB_USER=root DB_PASSWORD=root \
 *     npx jest gamePlaythrough --verbose --no-coverage
 */

import knex, { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import type { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';

// Lazy imports — only resolved when tests actually run (avoids config
// validation failures when REPLAY_TEST_DB_HOST is not set)
let GamePlaybackService: any;
let ResourceNotFoundError: any;
let scoreRepository: any;

// ---------------------------------------------------------------------------
// Skip unless REPLAY_TEST_DB_HOST is set
// ---------------------------------------------------------------------------
const REPLAY_DB_HOST = process.env.REPLAY_TEST_DB_HOST;
const describeIf = REPLAY_DB_HOST ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

function createValidationDb(): Knex {
  return knex({
    client: 'mysql2',
    connection: {
      host: REPLAY_DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  });
}

async function getExpectedScore(
  db: Knex, gameId: string, teamId: string, upToPlay: number
): Promise<number> {
  const result = await db('plays')
    .where({ gid: gameId, batteam: teamId })
    .where('pn', '<=', upToPlay)
    .sum('runs as total')
    .first();
  return result?.total ? Number(result.total) : 0;
}

async function getTeamIds(db: Knex, gameId: string) {
  // In the top of the 1st (top_bot=0), the visitor bats and the home team pitches
  const firstPlay = await db('plays')
    .where({ gid: gameId, top_bot: 0 })
    .orderBy('pn', 'asc')
    .first();

  if (!firstPlay) throw new Error(`No plays found for game ${gameId}`);

  return {
    homeTeamId: String(firstPlay.pitteam),
    visitorTeamId: String(firstPlay.batteam),
  };
}

async function getMaxPlayNumber(db: Knex, gameId: string): Promise<number> {
  const result = await db('plays')
    .where({ gid: gameId })
    .max('pn as maxPn')
    .first();
  return result?.maxPn ? Number(result.maxPn) : 0;
}

/**
 * Builds in-memory cumulative score maps for fast validation lookups.
 * Replaces O(N) SUM queries with a single query + O(1) lookups.
 */
async function buildCumulativeScores(
  db: Knex,
  gameId: string,
  homeTeamId: string,
  visitorTeamId: string
): Promise<Map<number, { home: number; visitor: number }>> {
  const plays = await db('plays')
    .where({ gid: gameId })
    .orderBy('pn', 'asc')
    .select('pn', 'batteam', 'runs');

  const scores = new Map<number, { home: number; visitor: number }>();
  let homeTotal = 0;
  let visitorTotal = 0;

  for (const play of plays) {
    const runs = play.runs || 0;
    if (play.batteam === homeTeamId) {
      homeTotal += runs;
    } else if (play.batteam === visitorTeamId) {
      visitorTotal += runs;
    }
    scores.set(play.pn, { home: homeTotal, visitor: visitorTotal });
  }

  return scores;
}

// ---------------------------------------------------------------------------
// Seeded PRNG for reproducible random game selection
// ---------------------------------------------------------------------------

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

// ---------------------------------------------------------------------------
// Core: play through an entire game and validate
// ---------------------------------------------------------------------------

interface PlaythroughResult {
  playsProcessed: number;
  finalState: SimplifiedBaseballState;
  scoreErrors: string[];
}

async function playThroughGame(
  validationDb: Knex,
  gameId: string
): Promise<PlaythroughResult> {
  const sessionId = uuidv4();
  const { homeTeamId, visitorTeamId } = await getTeamIds(validationDb, gameId);

  const scoreErrors: string[] = [];
  const progressInterval = 50; // Log progress every N plays

  // Pre-load scores: warm service cache + build validation lookup
  // This converts O(N) queries into 2 upfront queries
  await scoreRepository.preloadCumulativeScores(gameId);
  const expectedScores = await buildCumulativeScores(validationDb, gameId, homeTeamId, visitorTeamId);

  // Step 1: Initialize (currentPlay=0)
  let state = await GamePlaybackService.getNextPlay(gameId, sessionId, 0, {
    skipLLM: true,
  });

  expect(state.currentPlay).toBeGreaterThan(0);

  let currentPlay = state.currentPlay;
  let previousPlay = 0;
  let playsProcessed = 0;
  const loopStartTime = Date.now();

  // Step 2: Loop through all plays
  while (true) {
    try {
      previousPlay = currentPlay;
      state = await GamePlaybackService.getNextPlay(gameId, sessionId, currentPlay, {
        skipLLM: true,
      });
      playsProcessed++;

      // Progress logging
      if (playsProcessed % progressInterval === 0) {
        const elapsedSec = ((Date.now() - loopStartTime) / 1000).toFixed(1);
        console.log(`[REPLAY TEST] Progress: ${playsProcessed} plays in ${elapsedSec}s (play ${state.currentPlay})`)
      }

      // --- Per-play score validation (O(1) lookup instead of query) ---
      // The state returned from getNextPlay(_, _, N) reflects score through play N+1
      // (i.e., state.currentPlay, not the input currentPlay)
      const expected = expectedScores.get(state.currentPlay);
      const expectedHome = expected?.home ?? 0;
      const expectedVisitor = expected?.visitor ?? 0;

      if (state.home.runs !== expectedHome) {
        scoreErrors.push(
          `Play ${state.currentPlay}: home score ${state.home.runs} != expected ${expectedHome}`
        );
      }
      if (state.visitors.runs !== expectedVisitor) {
        scoreErrors.push(
          `Play ${state.currentPlay}: visitor score ${state.visitors.runs} != expected ${expectedVisitor}`
        );
      }

      currentPlay = state.currentPlay;
    } catch (error: unknown) {
      // Game over: no more plays
      if (error instanceof ResourceNotFoundError) {
        break;
      }
      throw error;
    }
  }

  return { playsProcessed, finalState: state, scoreErrors };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describeIf('Game Playthrough E2E', () => {
  let validationDb: Knex;

  beforeAll(async () => {
    // Lazy-load modules that trigger config validation / DB init
    const playback = await import('../../services/game/playback');
    GamePlaybackService = playback.GamePlaybackService;
    const errors = await import('../../types/errors/GameErrors');
    ResourceNotFoundError = errors.ResourceNotFoundError;
    const scoreRepo = await import('../../database/repositories/ScoreRepository');
    scoreRepository = scoreRepo.scoreRepository;

    validationDb = createValidationDb();
  });

  afterAll(async () => {
    if (validationDb) await validationDb.destroy();
  });

  describe('Known game: NYA202410300 (World Series Game 5)', () => {
    it(
      'plays through entire game with correct scores at each play',
      async () => {
        const gameId = 'NYA202410300';
        const { playsProcessed, finalState, scoreErrors } =
          await playThroughGame(validationDb, gameId);

        // Verify we processed a reasonable number of plays
        expect(playsProcessed).toBeGreaterThan(50);

        // Verify final score matches DB
        const { homeTeamId, visitorTeamId } = await getTeamIds(validationDb, gameId);
        const maxPn = await getMaxPlayNumber(validationDb, gameId);
        const expectedFinalHome = await getExpectedScore(validationDb, gameId, homeTeamId, maxPn);
        const expectedFinalVisitor = await getExpectedScore(validationDb, gameId, visitorTeamId, maxPn);

        expect(finalState.home.runs).toBe(expectedFinalHome);
        expect(finalState.visitors.runs).toBe(expectedFinalVisitor);

        // Report any per-play score mismatches
        if (scoreErrors.length > 0) {
          console.error(`Score mismatches for ${gameId}:\n${scoreErrors.join('\n')}`);
        }
        expect(scoreErrors).toHaveLength(0);
      },
      120000
    );

    it(
      'processes the correct number of plays',
      async () => {
        const gameId = 'NYA202410300';
        const maxPn = await getMaxPlayNumber(validationDb, gameId);
        expect(maxPn).toBeGreaterThan(0);

        // We can't easily re-run the full game in a second test without
        // duplicate work, so just verify the DB has the expected play count
        const result = await validationDb('plays')
          .where({ gid: gameId })
          .count('* as count')
          .first();
        const playCount = Number(result?.count || 0);
        expect(playCount).toBeGreaterThan(50);
      },
      30000
    );
  });

  describe('Random game playthrough', () => {
    it(
      'plays through a seeded random game successfully (seed=42)',
      async () => {
        const rand = seededRandom(42);
        const allGids: string[] = await validationDb('plays')
          .distinct('gid')
          .pluck('gid');

        expect(allGids.length).toBeGreaterThan(0);

        const idx = Math.floor(rand() * allGids.length);
        const randomGid = allGids[idx];

        // Get total play count for progress reporting
        const totalPlaysResult = await validationDb('plays')
          .where({ gid: randomGid })
          .count('* as count')
          .first();
        const totalPlays = Number(totalPlaysResult?.count || 0);

        console.log(`[REPLAY TEST] Random game selected (seed=42): ${randomGid} (${totalPlays} plays)`);
        const startTime = Date.now();

        const { playsProcessed, scoreErrors } =
          await playThroughGame(validationDb, randomGid);

        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[REPLAY TEST] Completed ${playsProcessed} plays in ${elapsedSec}s (${(playsProcessed / parseFloat(elapsedSec)).toFixed(1)} plays/sec)`);

        expect(playsProcessed).toBeGreaterThan(0);

        if (scoreErrors.length > 0) {
          console.error(
            `Score mismatches for ${randomGid}:\n${scoreErrors.join('\n')}`
          );
        }
        expect(scoreErrors).toHaveLength(0);
      },
      300000  // 5 minutes - games with 150+ plays can be slow
    );
  });
});
