import { LineupChangeDetectorRefactored } from '../LineupChangeDetectorRefactored';
import { PlayData } from '../../../../../../common/types/PlayData';
import {
  IPlayerRepository,
  ITeamStatsRepository,
  ILineupTrackingService,
  LineupPlayerData,
  LineupChangeData,
  LineupStateData,
  TeamStatsData,
  PlayerInfo,
} from '../../../interfaces';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function createPlayData(overrides: Partial<PlayData> = {}): PlayData {
  return {
    gid: 'TEST001',
    pn: 1,
    inning: 1,
    top_bot: 0,
    batteam: 'TEAM_A',
    pitteam: 'TEAM_B',
    batter: 'batter1',
    pitcher: 'pitcher1',
    outs_pre: 0,
    outs_post: 0,
    f2: 'f2',
    f3: 'f3',
    f4: 'f4',
    f5: 'f5',
    f6: 'f6',
    f7: 'f7',
    f8: 'f8',
    f9: 'f9',
    ...overrides,
  } as PlayData;
}

function createPlayer(teamId: string, playerId: string, battingOrder: number, extra: Partial<LineupPlayerData> = {}): LineupPlayerData {
  return {
    teamId,
    playerId,
    battingOrder,
    position: battingOrder === 1 ? 'P' : `${battingOrder}`,
    isCurrentBatter: false,
    isCurrentPitcher: false,
    ...extra,
  };
}

function createTeamStats(team: string, playerPrefix: string): TeamStatsData {
  return {
    team,
    start_l1: `${playerPrefix}_l1`,
    start_l2: `${playerPrefix}_l2`,
    start_l3: `${playerPrefix}_l3`,
    start_l4: `${playerPrefix}_l4`,
    start_l5: `${playerPrefix}_l5`,
    start_l6: `${playerPrefix}_l6`,
    start_l7: `${playerPrefix}_l7`,
    start_l8: `${playerPrefix}_l8`,
    start_l9: `${playerPrefix}_l9`,
    start_f1: `${playerPrefix}_l1`, // pitcher is lineup slot 1
  };
}

// ---------------------------------------------------------------------------
// Mock builders
// ---------------------------------------------------------------------------

function createMockPlayerRepository(overrides: Partial<IPlayerRepository> = {}): IPlayerRepository {
  return {
    getPlayerById: jest.fn().mockResolvedValue(null),
    getPlayersByIds: jest.fn().mockResolvedValue(new Map()),
    getPlayerName: jest.fn().mockImplementation(async (id: string) => `Player ${id}`),
    clearCache: jest.fn(),
    ...overrides,
  };
}

function createMockTeamStatsRepository(overrides: Partial<ITeamStatsRepository> = {}): ITeamStatsRepository {
  return {
    getTeamStatsForGame: jest.fn().mockResolvedValue([
      createTeamStats('HOME', 'h'),
      createTeamStats('VISITOR', 'v'),
    ]),
    getStartingLineup: jest.fn().mockResolvedValue({ battingOrder: [], pitcher: null }),
    getStartingPitcher: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

function createMockLineupTracking(overrides: Partial<ILineupTrackingService> = {}): ILineupTrackingService {
  return {
    getLatestLineupState: jest.fn().mockResolvedValue(null),
    saveLineupState: jest.fn().mockResolvedValue(2),
    saveInitialLineup: jest.fn().mockResolvedValue(1),
    ...overrides,
  };
}

// Suppress console.log during tests
beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterAll(() => { jest.restoreAllMocks(); });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LineupChangeDetectorRefactored', () => {
  describe('constructor', () => {
    it('accepts all dependencies and computes isHalfInningChange correctly', () => {
      const currentPlay = createPlayData({ batteam: 'TEAM_A' });
      const nextPlay = createPlayData({ batteam: 'TEAM_B' });

      // Should not throw
      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        createMockLineupTracking(),
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      expect(detector).toBeDefined();
    });
  });

  describe('process() - initial lineup', () => {
    it('initializes lineup when no state exists', async () => {
      const currentPlay = createPlayData({ pn: 1 });
      const nextPlay = createPlayData({ pn: 2 });
      const tracking = createMockLineupTracking();

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      const result = await detector.process();

      expect(result).toBe(1);
      expect(tracking.getLatestLineupState).toHaveBeenCalledWith('GAME1', 'SESSION1');
      expect(tracking.saveInitialLineup).toHaveBeenCalledWith(
        'GAME1', 'SESSION1',
        expect.any(Array),
        expect.any(Array),
        0
      );
    });

    it('throws when team stats are missing', async () => {
      const currentPlay = createPlayData();
      const nextPlay = createPlayData({ pn: 2 });
      const teamStatsRepo = createMockTeamStatsRepository({
        getTeamStatsForGame: jest.fn().mockResolvedValue([]),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        teamStatsRepo,
        createMockLineupTracking(),
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await expect(detector.process()).rejects.toThrow('Team stats not found');
    });

    it('creates correct lineup structure from team stats', async () => {
      const currentPlay = createPlayData();
      const nextPlay = createPlayData({ pn: 2 });
      const tracking = createMockLineupTracking();

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      const call = (tracking.saveInitialLineup as jest.Mock).mock.calls[0];
      const homeLineup: LineupPlayerData[] = call[2];
      const visitorLineup: LineupPlayerData[] = call[3];

      expect(homeLineup).toHaveLength(9);
      expect(visitorLineup).toHaveLength(9);
      expect(homeLineup[0].playerId).toBe('h_l1');
      expect(homeLineup[0].teamId).toBe('HOME');
      expect(visitorLineup[0].playerId).toBe('v_l1');
    });
  });

  describe('process() - no changes detected', () => {
    it('saves updated state even when no lineup changes occur', async () => {
      const currentPlay = createPlayData({ pn: 1, batter: 'b1', pitcher: 'p1' });
      const nextPlay = createPlayData({ pn: 2, batter: 'b2', pitcher: 'p1' });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'b2', 2),
        createPlayer('TEAM_A', 'b3', 3),
        createPlayer('TEAM_B', 'p1', 1, { isCurrentPitcher: true, position: 'P' }),
        createPlayer('TEAM_B', 'f2', 2),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({
          id: 1,
          playIndex: 1,
          players,
        }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      const result = await detector.process();

      expect(result).toBe(2);
      expect(tracking.saveLineupState).toHaveBeenCalledWith(
        expect.objectContaining({ gameId: 'GAME1', playIndex: 2 }),
        expect.any(Array),
        expect.any(Array)
      );
    });
  });

  describe('process() - pitching change', () => {
    it('detects mid-inning pitcher change', async () => {
      // Same half-inning (both top), pitcher changes
      const currentPlay = createPlayData({ pn: 5, pitcher: 'oldP', top_bot: 0, batteam: 'TEAM_A', pitteam: 'TEAM_B' });
      const nextPlay = createPlayData({ pn: 6, pitcher: 'newP', top_bot: 0, batteam: 'TEAM_A', pitteam: 'TEAM_B', batter: 'b1' });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'b2', 2),
        createPlayer('TEAM_B', 'oldP', 1, { isCurrentPitcher: true, position: 'P' }),
        createPlayer('TEAM_B', 'f2', 2),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 5, players }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      // Should have saved with changes
      const saveCall = (tracking.saveLineupState as jest.Mock).mock.calls[0];
      const changes: LineupChangeData[] = saveCall[2];
      expect(changes.some(c => c.changeType === 'PITCHING_CHANGE')).toBe(true);
      const pitchingChange = changes.find(c => c.changeType === 'PITCHING_CHANGE')!;
      expect(pitchingChange.playerInId).toBe('newP');
      expect(pitchingChange.playerOutId).toBe('oldP');
    });
  });

  describe('process() - batter substitution', () => {
    it('detects pinch hitter substitution', async () => {
      const currentPlay = createPlayData({ pn: 5, batter: 'b1', batteam: 'TEAM_A', pitteam: 'TEAM_B', pitcher: 'p1' });
      // Pinch hitter: batter not in existing lineup
      const nextPlay = createPlayData({ pn: 6, batter: 'pinchH', batteam: 'TEAM_A', pitteam: 'TEAM_B', pitcher: 'p1' });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'b2', 2),
        createPlayer('TEAM_A', 'b3', 3),
        createPlayer('TEAM_B', 'p1', 1, { isCurrentPitcher: true, position: 'P' }),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 5, players }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      const saveCall = (tracking.saveLineupState as jest.Mock).mock.calls[0];
      const changes: LineupChangeData[] = saveCall[2];
      expect(changes.some(c => c.changeType === 'SUBSTITUTION')).toBe(true);
      const sub = changes.find(c => c.changeType === 'SUBSTITUTION')!;
      expect(sub.playerInId).toBe('pinchH');
    });
  });

  describe('process() - fielding changes', () => {
    it('detects mid-inning fielding position change', async () => {
      // Same half-inning, fielder at f3 changes
      const currentPlay = createPlayData({ pn: 5, f3: 'old_f3', batteam: 'TEAM_A', pitteam: 'TEAM_B', pitcher: 'p1', batter: 'b1' });
      const nextPlay = createPlayData({ pn: 6, f3: 'new_f3', batteam: 'TEAM_A', pitteam: 'TEAM_B', pitcher: 'p1', batter: 'b2' });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'b2', 2),
        createPlayer('TEAM_B', 'p1', 1, { isCurrentPitcher: true, position: 'P' }),
        createPlayer('TEAM_B', 'old_f3', 3, { position: '3' }),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 5, players }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      const saveCall = (tracking.saveLineupState as jest.Mock).mock.calls[0];
      const changes: LineupChangeData[] = saveCall[2];
      expect(changes.some(c => c.changeType === 'POSITION_CHANGE')).toBe(true);
      const fieldingChange = changes.find(c => c.changeType === 'POSITION_CHANGE')!;
      expect(fieldingChange.playerInId).toBe('new_f3');
      expect(fieldingChange.playerOutId).toBe('old_f3');
    });
  });

  describe('process() - half-inning transition', () => {
    it('skips pitching change detection on half-inning change', async () => {
      // Half-inning change: batteam differs
      const currentPlay = createPlayData({ pn: 10, batteam: 'TEAM_A', pitteam: 'TEAM_B', pitcher: 'pA', batter: 'b1' });
      const nextPlay = createPlayData({ pn: 11, batteam: 'TEAM_B', pitteam: 'TEAM_A', pitcher: 'pB', batter: 'b_other', top_bot: 1 });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'pA', 2, { isCurrentPitcher: true, position: 'P' }),
        createPlayer('TEAM_B', 'b_other', 1),
        createPlayer('TEAM_B', 'pB', 2, { position: 'P' }),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 10, players }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      const saveCall = (tracking.saveLineupState as jest.Mock).mock.calls[0];
      const changes: LineupChangeData[] = saveCall[2];
      // No pitching change should be detected on half-inning transition
      expect(changes.filter(c => c.changeType === 'PITCHING_CHANGE')).toHaveLength(0);
    });
  });

  describe('process() - multiple changes', () => {
    it('detects pitching and fielding changes in same play', async () => {
      const currentPlay = createPlayData({
        pn: 5, pitcher: 'oldP', f3: 'old_f3',
        batteam: 'TEAM_A', pitteam: 'TEAM_B', batter: 'b1',
      });
      const nextPlay = createPlayData({
        pn: 6, pitcher: 'newP', f3: 'new_f3',
        batteam: 'TEAM_A', pitteam: 'TEAM_B', batter: 'b2',
      });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1, { isCurrentBatter: true }),
        createPlayer('TEAM_A', 'b2', 2),
        createPlayer('TEAM_B', 'oldP', 1, { isCurrentPitcher: true, position: 'P' }),
        createPlayer('TEAM_B', 'old_f3', 3, { position: '3' }),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 5, players }),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await detector.process();

      const saveCall = (tracking.saveLineupState as jest.Mock).mock.calls[0];
      const changes: LineupChangeData[] = saveCall[2];
      expect(changes.some(c => c.changeType === 'PITCHING_CHANGE')).toBe(true);
      expect(changes.some(c => c.changeType === 'POSITION_CHANGE')).toBe(true);
    });
  });

  describe('process() - error handling', () => {
    it('propagates repository errors', async () => {
      const currentPlay = createPlayData();
      const nextPlay = createPlayData({ pn: 2 });

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockRejectedValue(new Error('DB connection failed')),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await expect(detector.process()).rejects.toThrow('DB connection failed');
    });

    it('propagates save errors', async () => {
      const currentPlay = createPlayData();
      const nextPlay = createPlayData({ pn: 2 });

      const players: LineupPlayerData[] = [
        createPlayer('TEAM_A', 'b1', 1),
        createPlayer('TEAM_B', 'p1', 1, { isCurrentPitcher: true, position: 'P' }),
      ];

      const tracking = createMockLineupTracking({
        getLatestLineupState: jest.fn().mockResolvedValue({ id: 1, playIndex: 1, players }),
        saveLineupState: jest.fn().mockRejectedValue(new Error('Save failed')),
      });

      const detector = new LineupChangeDetectorRefactored(
        createMockPlayerRepository(),
        createMockTeamStatsRepository(),
        tracking,
        'GAME1', 'SESSION1', currentPlay, nextPlay
      );

      await expect(detector.process()).rejects.toThrow('Save failed');
    });
  });
});
