import { detectFieldingChanges } from '../FieldingChangeDetector';
import { PlayData } from '../../../../../../../common/types/PlayData';

/**
 * Creates a minimal PlayData object for testing fielding changes.
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
    f2: 'catcher001',
    f3: 'first001',
    f4: 'second001',
    f5: 'third001',
    f6: 'short001',
    f7: 'left001',
    f8: 'center001',
    f9: 'right001',
    ...overrides,
  } as PlayData;
}

describe('detectFieldingChanges', () => {
  describe('when fielder changes mid-inning', () => {
    it('should detect a single fielding change', () => {
      const currentPlay = createPlayData({ f3: 'first001' });
      const nextPlay = createPlayData({ f3: 'first002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].newFielderId).toBe('first002');
      expect(result[0].oldFielderId).toBe('first001');
      expect(result[0].position).toBe(3);
    });

    it('should detect multiple fielding changes', () => {
      const currentPlay = createPlayData({
        f3: 'first001',
        f7: 'left001',
      });
      const nextPlay = createPlayData({
        f3: 'first002',
        f7: 'left002',
        pn: 2,
      });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(2);

      const firstBaseChange = result.find(c => c.position === 3);
      expect(firstBaseChange).toBeDefined();
      expect(firstBaseChange!.newFielderId).toBe('first002');

      const leftFieldChange = result.find(c => c.position === 7);
      expect(leftFieldChange).toBeDefined();
      expect(leftFieldChange!.newFielderId).toBe('left002');
    });

    it('should return the correct fielding team ID (top of inning)', () => {
      const currentPlay = createPlayData({
        f3: 'first001',
        top_bot: 0,
        pitteam: 'BOS',
        batteam: 'NYA',
      });
      const nextPlay = createPlayData({
        f3: 'first002',
        top_bot: 0,
        pitteam: 'BOS',
        batteam: 'NYA',
        pn: 2,
      });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].teamId).toBe('BOS'); // pitteam when top_bot === 0
    });

    it('should return the correct fielding team ID (bottom of inning)', () => {
      const currentPlay = createPlayData({
        f3: 'first001',
        top_bot: 1,
        pitteam: 'BOS',
        batteam: 'NYA',
      });
      const nextPlay = createPlayData({
        f3: 'first002',
        top_bot: 1,
        pitteam: 'BOS',
        batteam: 'NYA',
        pn: 2,
      });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].teamId).toBe('NYA'); // batteam when top_bot === 1
    });
  });

  describe('when no fielding changes occur', () => {
    it('should return empty array when all fielders are the same', () => {
      const currentPlay = createPlayData();
      const nextPlay = createPlayData({ pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(0);
    });
  });

  describe('when half-inning change occurs', () => {
    it('should return empty array even if fielders change', () => {
      const currentPlay = createPlayData({
        f3: 'first001',
        f7: 'left001',
      });
      const nextPlay = createPlayData({
        f3: 'first002',
        f7: 'left002',
        pn: 2,
      });

      const result = detectFieldingChanges(currentPlay, nextPlay, true);

      expect(result).toHaveLength(0);
    });
  });

  describe('checking all fielding positions (2-9)', () => {
    it('should detect changes at catcher (position 2)', () => {
      const currentPlay = createPlayData({ f2: 'catcher001' });
      const nextPlay = createPlayData({ f2: 'catcher002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(2);
    });

    it('should detect changes at first base (position 3)', () => {
      const currentPlay = createPlayData({ f3: 'first001' });
      const nextPlay = createPlayData({ f3: 'first002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(3);
    });

    it('should detect changes at second base (position 4)', () => {
      const currentPlay = createPlayData({ f4: 'second001' });
      const nextPlay = createPlayData({ f4: 'second002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(4);
    });

    it('should detect changes at third base (position 5)', () => {
      const currentPlay = createPlayData({ f5: 'third001' });
      const nextPlay = createPlayData({ f5: 'third002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(5);
    });

    it('should detect changes at shortstop (position 6)', () => {
      const currentPlay = createPlayData({ f6: 'short001' });
      const nextPlay = createPlayData({ f6: 'short002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(6);
    });

    it('should detect changes at left field (position 7)', () => {
      const currentPlay = createPlayData({ f7: 'left001' });
      const nextPlay = createPlayData({ f7: 'left002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(7);
    });

    it('should detect changes at center field (position 8)', () => {
      const currentPlay = createPlayData({ f8: 'center001' });
      const nextPlay = createPlayData({ f8: 'center002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(8);
    });

    it('should detect changes at right field (position 9)', () => {
      const currentPlay = createPlayData({ f9: 'right001' });
      const nextPlay = createPlayData({ f9: 'right002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].position).toBe(9);
    });
  });

  describe('edge cases', () => {
    it('should handle missing fielder in current play', () => {
      const currentPlay = createPlayData({ f3: undefined as any });
      const nextPlay = createPlayData({ f3: 'first002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      // Should not detect change when current fielder is missing
      const firstBaseChange = result.find(c => c.position === 3);
      expect(firstBaseChange).toBeUndefined();
    });

    it('should handle missing fielder in next play', () => {
      const currentPlay = createPlayData({ f3: 'first001' });
      const nextPlay = createPlayData({ f3: undefined as any, pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      // Should not detect change when next fielder is missing
      const firstBaseChange = result.find(c => c.position === 3);
      expect(firstBaseChange).toBeUndefined();
    });

    it('should handle empty string fielder IDs', () => {
      const currentPlay = createPlayData({ f3: '' as any });
      const nextPlay = createPlayData({ f3: 'first002', pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      // Empty string should be treated as missing
      const firstBaseChange = result.find(c => c.position === 3);
      expect(firstBaseChange).toBeUndefined();
    });

    it('should handle numeric fielder IDs', () => {
      const currentPlay = createPlayData({ f3: 12345 as any });
      const nextPlay = createPlayData({ f3: 67890 as any, pn: 2 });

      const result = detectFieldingChanges(currentPlay, nextPlay, false);

      expect(result).toHaveLength(1);
      expect(result[0].newFielderId).toBe('67890');
      expect(result[0].oldFielderId).toBe('12345');
    });
  });
});
