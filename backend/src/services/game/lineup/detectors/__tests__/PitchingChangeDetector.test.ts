import { detectPitchingChange } from '../PitchingChangeDetector';
import { PlayData } from '../../../../../../../common/types/PlayData';

/**
 * Creates a minimal PlayData object for testing.
 * Only includes fields relevant to pitching change detection.
 */
function createPlayData(overrides: Partial<PlayData> = {}): PlayData {
  return {
    gid: 'TEST001',
    pn: 1,
    inning: 1,
    top_bot: 0, // 0 = top of inning
    outs_pre: 0,
    pitcher: 'pitcher001',
    batter: 'batter001',
    batteam: 'NYA',
    pitteam: 'BOS',
    ...overrides,
  } as PlayData;
}

describe('detectPitchingChange', () => {
  describe('when pitcher changes mid-inning', () => {
    it('should detect a pitching change', () => {
      const currentPlay = createPlayData({ pitcher: 'pitcher001' });
      const nextPlay = createPlayData({ pitcher: 'pitcher002', pn: 2 });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).not.toBeNull();
      expect(result!.newPitcherId).toBe('pitcher002');
      expect(result!.oldPitcherId).toBe('pitcher001');
    });

    it('should return the correct fielding team ID (top of inning)', () => {
      const currentPlay = createPlayData({
        pitcher: 'pitcher001',
        top_bot: 0,
        pitteam: 'BOS',
        batteam: 'NYA',
      });
      const nextPlay = createPlayData({
        pitcher: 'pitcher002',
        top_bot: 0,
        pitteam: 'BOS',
        batteam: 'NYA',
        pn: 2,
      });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).not.toBeNull();
      expect(result!.teamId).toBe('BOS'); // pitteam when top_bot === 0
    });

    it('should return the correct fielding team ID (bottom of inning)', () => {
      const currentPlay = createPlayData({
        pitcher: 'pitcher001',
        top_bot: 1,
        pitteam: 'BOS',
        batteam: 'NYA',
      });
      const nextPlay = createPlayData({
        pitcher: 'pitcher002',
        top_bot: 1,
        pitteam: 'BOS',
        batteam: 'NYA',
        pn: 2,
      });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).not.toBeNull();
      expect(result!.teamId).toBe('NYA'); // batteam when top_bot === 1
    });
  });

  describe('when pitcher does not change', () => {
    it('should return null when same pitcher', () => {
      const currentPlay = createPlayData({ pitcher: 'pitcher001' });
      const nextPlay = createPlayData({ pitcher: 'pitcher001', pn: 2 });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).toBeNull();
    });
  });

  describe('when half-inning change occurs', () => {
    it('should return null even if pitcher changes', () => {
      const currentPlay = createPlayData({
        pitcher: 'pitcher001',
        top_bot: 0,
        pitteam: 'BOS',
      });
      const nextPlay = createPlayData({
        pitcher: 'pitcher002',
        top_bot: 1,
        pitteam: 'NYA',
        pn: 2,
      });

      const result = detectPitchingChange(currentPlay, nextPlay, true);

      expect(result).toBeNull();
    });

    it('should return null when half-inning flag is true regardless of pitcher', () => {
      const currentPlay = createPlayData({ pitcher: 'pitcher001' });
      const nextPlay = createPlayData({ pitcher: 'pitcher001', pn: 2 });

      const result = detectPitchingChange(currentPlay, nextPlay, true);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle numeric pitcher IDs', () => {
      const currentPlay = createPlayData({ pitcher: 12345 as any });
      const nextPlay = createPlayData({ pitcher: 67890 as any, pn: 2 });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).not.toBeNull();
      expect(result!.newPitcherId).toBe('67890');
      expect(result!.oldPitcherId).toBe('12345');
    });

    it('should handle empty string pitcher IDs', () => {
      const currentPlay = createPlayData({ pitcher: '' as any });
      const nextPlay = createPlayData({ pitcher: 'pitcher002', pn: 2 });

      const result = detectPitchingChange(currentPlay, nextPlay, false);

      expect(result).not.toBeNull();
      expect(result!.oldPitcherId).toBe('');
      expect(result!.newPitcherId).toBe('pitcher002');
    });
  });
});
