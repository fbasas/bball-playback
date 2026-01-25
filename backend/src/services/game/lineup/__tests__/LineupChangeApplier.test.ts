import {
  applyPitchingChange,
  applyBatterSubstitution,
  applyFieldingChange,
  applyChangesToPlayers,
  validateCurrentBatters,
  updateCurrentBatterAndPitcher,
  isPitcherInLineup,
  addPitcherToLineup,
  BatterPitcherUpdateContext,
} from '../LineupChangeApplier';
import { LineupPlayerData, LineupChangeData } from '../../lineupTracking';
import { PlayData } from '../../../../../../common/types/PlayData';

/**
 * Creates a lineup player for testing.
 */
function createPlayer(
  playerId: string,
  teamId: string,
  battingOrder: number,
  options: Partial<LineupPlayerData> = {}
): LineupPlayerData {
  return {
    teamId,
    playerId,
    battingOrder,
    position: `${battingOrder}`,
    isCurrentBatter: false,
    isCurrentPitcher: false,
    ...options,
  };
}

/**
 * Creates a standard 9-player lineup for a team.
 */
function createTeamLineup(
  teamId: string,
  currentBatterIndex: number = 0,
  pitcherIndex: number = 0
): LineupPlayerData[] {
  return Array(9)
    .fill(0)
    .map((_, i) =>
      createPlayer(`${teamId}_player${i + 1}`, teamId, i + 1, {
        isCurrentBatter: i === currentBatterIndex,
        isCurrentPitcher: i === pitcherIndex,
        position: i === pitcherIndex ? 'P' : `${i + 1}`,
      })
    );
}

/**
 * Creates a minimal PlayData for testing.
 */
function createPlayData(overrides: Partial<PlayData> = {}): PlayData {
  return {
    gid: 'TEST001',
    pn: 1,
    inning: 1,
    top_bot: 0,
    outs_pre: 0,
    pitcher: 'NYA_player1',
    batter: 'BOS_player1',
    batteam: 'BOS',
    pitteam: 'NYA',
    ...overrides,
  } as PlayData;
}

describe('applyPitchingChange', () => {
  it('should replace the current pitcher with the new pitcher', () => {
    const players = createTeamLineup('NYA', 0, 0);
    const change: LineupChangeData = {
      changeType: 'PITCHING_CHANGE',
      playerInId: 'new_pitcher',
      playerOutId: 'NYA_player1',
      teamId: 'NYA',
      description: 'Pitching change',
    };

    const result = applyPitchingChange(players, change);

    const pitcher = result.find(p => p.isCurrentPitcher);
    expect(pitcher).toBeDefined();
    expect(pitcher!.playerId).toBe('new_pitcher');
  });

  it('should not modify players on other teams', () => {
    const players = [
      ...createTeamLineup('NYA', 0, 0),
      ...createTeamLineup('BOS', 0, 0),
    ];
    const change: LineupChangeData = {
      changeType: 'PITCHING_CHANGE',
      playerInId: 'new_pitcher',
      teamId: 'NYA',
      description: 'Pitching change',
    };

    const result = applyPitchingChange(players, change);

    const bosPitcher = result.find(p => p.teamId === 'BOS' && p.isCurrentPitcher);
    expect(bosPitcher!.playerId).toBe('BOS_player1');
  });

  it('should return immutable result', () => {
    const players = createTeamLineup('NYA', 0, 0);
    const change: LineupChangeData = {
      changeType: 'PITCHING_CHANGE',
      playerInId: 'new_pitcher',
      teamId: 'NYA',
      description: 'Pitching change',
    };

    const result = applyPitchingChange(players, change);

    expect(result).not.toBe(players);
    expect(players[0].playerId).toBe('NYA_player1'); // Original unchanged
  });

  it('should handle missing playerInId', () => {
    const players = createTeamLineup('NYA', 0, 0);
    const change: LineupChangeData = {
      changeType: 'PITCHING_CHANGE',
      teamId: 'NYA',
      description: 'Pitching change',
    };

    const result = applyPitchingChange(players, change);

    const pitcher = result.find(p => p.isCurrentPitcher);
    expect(pitcher!.playerId).toBe('');
  });
});

describe('applyBatterSubstitution', () => {
  it('should replace the batter at the specified batting order', () => {
    const players = createTeamLineup('NYA');
    const change: LineupChangeData = {
      changeType: 'SUBSTITUTION',
      playerInId: 'pinch_hitter',
      playerOutId: 'NYA_player3',
      battingOrderFrom: 3,
      battingOrderTo: 3,
      teamId: 'NYA',
      description: 'Batting substitution',
    };

    const result = applyBatterSubstitution(players, change);

    const newBatter = result.find(p => p.battingOrder === 3);
    expect(newBatter!.playerId).toBe('pinch_hitter');
    expect(newBatter!.isCurrentBatter).toBe(true);
  });

  it('should clear current batter flag from other players on the team', () => {
    const players = createTeamLineup('NYA', 0); // player1 is current batter
    const change: LineupChangeData = {
      changeType: 'SUBSTITUTION',
      playerInId: 'pinch_hitter',
      battingOrderFrom: 3,
      teamId: 'NYA',
      description: 'Batting substitution',
    };

    const result = applyBatterSubstitution(players, change);

    const currentBatters = result.filter(p => p.isCurrentBatter);
    expect(currentBatters).toHaveLength(1);
    expect(currentBatters[0].playerId).toBe('pinch_hitter');
  });

  it('should return unchanged array if batting order not found', () => {
    const players = createTeamLineup('NYA');
    const change: LineupChangeData = {
      changeType: 'SUBSTITUTION',
      playerInId: 'pinch_hitter',
      battingOrderFrom: 99, // Invalid
      teamId: 'NYA',
      description: 'Batting substitution',
    };

    const result = applyBatterSubstitution(players, change);

    expect(result).toEqual(players);
  });

  it('should not affect other teams', () => {
    const players = [
      ...createTeamLineup('NYA', 0),
      ...createTeamLineup('BOS', 2), // BOS player3 is current batter
    ];
    const change: LineupChangeData = {
      changeType: 'SUBSTITUTION',
      playerInId: 'pinch_hitter',
      battingOrderFrom: 3,
      teamId: 'NYA',
      description: 'Batting substitution',
    };

    const result = applyBatterSubstitution(players, change);

    const bosCurrentBatter = result.find(p => p.teamId === 'BOS' && p.isCurrentBatter);
    expect(bosCurrentBatter!.playerId).toBe('BOS_player3');
  });
});

describe('applyFieldingChange', () => {
  it('should replace the fielder at the specified position', () => {
    const players = createTeamLineup('NYA');
    const change: LineupChangeData = {
      changeType: 'POSITION_CHANGE',
      playerInId: 'new_fielder',
      playerOutId: 'NYA_player5',
      positionFrom: '5',
      positionTo: '5',
      teamId: 'NYA',
      description: 'Fielding change',
    };

    const result = applyFieldingChange(players, change);

    const fielder = result.find(p => p.position === '5');
    expect(fielder!.playerId).toBe('new_fielder');
  });

  it('should return unchanged array if position not found', () => {
    const players = createTeamLineup('NYA');
    const change: LineupChangeData = {
      changeType: 'POSITION_CHANGE',
      playerInId: 'new_fielder',
      positionFrom: 'DH', // Not in lineup
      teamId: 'NYA',
      description: 'Fielding change',
    };

    const result = applyFieldingChange(players, change);

    expect(result.map(p => p.playerId)).toEqual(players.map(p => p.playerId));
  });
});

describe('applyChangesToPlayers', () => {
  it('should apply multiple changes in order', () => {
    const players = createTeamLineup('NYA', 0, 0);
    const changes: LineupChangeData[] = [
      {
        changeType: 'PITCHING_CHANGE',
        playerInId: 'new_pitcher',
        teamId: 'NYA',
        description: 'Pitching change',
      },
      {
        changeType: 'SUBSTITUTION',
        playerInId: 'pinch_hitter',
        battingOrderFrom: 5,
        teamId: 'NYA',
        description: 'Batting substitution',
      },
    ];

    const result = applyChangesToPlayers(players, changes);

    expect(result.find(p => p.isCurrentPitcher)!.playerId).toBe('new_pitcher');
    expect(result.find(p => p.battingOrder === 5)!.playerId).toBe('pinch_hitter');
  });

  it('should return unchanged array for empty changes', () => {
    const players = createTeamLineup('NYA');

    const result = applyChangesToPlayers(players, []);

    expect(result).toEqual(players);
  });

  it('should ignore unknown change types', () => {
    const players = createTeamLineup('NYA');
    const changes: LineupChangeData[] = [
      {
        changeType: 'OTHER' as any,
        playerInId: 'someone',
        teamId: 'NYA',
        description: 'Unknown change',
      },
    ];

    const result = applyChangesToPlayers(players, changes);

    expect(result.map(p => p.playerId)).toEqual(players.map(p => p.playerId));
  });

  it('should handle BATTING_ORDER_CHANGE and INITIAL_LINEUP types (no-op)', () => {
    const players = createTeamLineup('NYA');
    const changes: LineupChangeData[] = [
      {
        changeType: 'BATTING_ORDER_CHANGE',
        playerInId: 'someone',
        teamId: 'NYA',
        description: 'Batting order change',
      },
      {
        changeType: 'INITIAL_LINEUP',
        playerInId: 'someone',
        teamId: 'NYA',
        description: 'Initial lineup',
      },
    ];

    const result = applyChangesToPlayers(players, changes);

    // These change types have no handler, so players unchanged
    expect(result.map(p => p.playerId)).toEqual(players.map(p => p.playerId));
  });
});

describe('validateCurrentBatters', () => {
  it('should set first batter when no current batter', () => {
    const players = createTeamLineup('NYA').map(p => ({ ...p, isCurrentBatter: false }));

    const result = validateCurrentBatters(players);

    const currentBatters = result.filter(p => p.isCurrentBatter);
    expect(currentBatters).toHaveLength(1);
    expect(currentBatters[0].battingOrder).toBe(1);
  });

  it('should keep lowest batting order when multiple current batters', () => {
    const players = createTeamLineup('NYA').map((p, i) => ({
      ...p,
      isCurrentBatter: i === 2 || i === 5, // player3 and player6 both marked
    }));

    const result = validateCurrentBatters(players);

    const currentBatters = result.filter(p => p.isCurrentBatter);
    expect(currentBatters).toHaveLength(1);
    expect(currentBatters[0].battingOrder).toBe(3); // Lower batting order kept
  });

  it('should handle multiple teams independently', () => {
    const nyaPlayers = createTeamLineup('NYA').map(p => ({ ...p, isCurrentBatter: false }));
    const bosPlayers = createTeamLineup('BOS').map((p, i) => ({
      ...p,
      isCurrentBatter: i === 0 || i === 1, // Two current batters
    }));

    const result = validateCurrentBatters([...nyaPlayers, ...bosPlayers]);

    const nyaBatters = result.filter(p => p.teamId === 'NYA' && p.isCurrentBatter);
    const bosBatters = result.filter(p => p.teamId === 'BOS' && p.isCurrentBatter);

    expect(nyaBatters).toHaveLength(1);
    expect(bosBatters).toHaveLength(1);
  });

  it('should not change when exactly one current batter per team', () => {
    const players = [
      ...createTeamLineup('NYA', 3),
      ...createTeamLineup('BOS', 5),
    ];

    const result = validateCurrentBatters(players);

    expect(result.find(p => p.teamId === 'NYA' && p.isCurrentBatter)!.battingOrder).toBe(4);
    expect(result.find(p => p.teamId === 'BOS' && p.isCurrentBatter)!.battingOrder).toBe(6);
  });

  it('should handle empty team (no players)', () => {
    const players: LineupPlayerData[] = [];

    const result = validateCurrentBatters(players);

    expect(result).toHaveLength(0);
  });
});

describe('isPitcherInLineup', () => {
  it('should return true when pitcher is in lineup', () => {
    const players = createTeamLineup('NYA');

    expect(isPitcherInLineup(players, 'NYA', 'NYA_player1')).toBe(true);
  });

  it('should return false when pitcher is not in lineup', () => {
    const players = createTeamLineup('NYA');

    expect(isPitcherInLineup(players, 'NYA', 'unknown_pitcher')).toBe(false);
  });

  it('should return false when pitcher is on different team', () => {
    const players = createTeamLineup('NYA');

    expect(isPitcherInLineup(players, 'BOS', 'NYA_player1')).toBe(false);
  });
});

describe('addPitcherToLineup', () => {
  it('should add pitcher with next batting order', () => {
    const players = createTeamLineup('NYA');

    const result = addPitcherToLineup(players, 'NYA', 'new_pitcher');

    expect(result).toHaveLength(10);
    const newPitcher = result.find(p => p.playerId === 'new_pitcher');
    expect(newPitcher).toBeDefined();
    expect(newPitcher!.battingOrder).toBe(10);
    expect(newPitcher!.position).toBe('P');
    expect(newPitcher!.isCurrentPitcher).toBe(true);
    expect(newPitcher!.isCurrentBatter).toBe(false);
  });

  it('should handle empty lineup', () => {
    const result = addPitcherToLineup([], 'NYA', 'new_pitcher');

    expect(result).toHaveLength(1);
    expect(result[0].battingOrder).toBe(1);
  });
});

describe('updateCurrentBatterAndPitcher', () => {
  it('should update pitcher flags for same half-inning', () => {
    const players = [
      ...createTeamLineup('NYA', 0, 0),
      ...createTeamLineup('BOS', 0, 0),
    ];
    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ pn: 1, batteam: 'BOS', pitteam: 'NYA', pitcher: 'NYA_player1' }),
      nextPlay: createPlayData({ pn: 2, batteam: 'BOS', pitteam: 'NYA', pitcher: 'NYA_player2' }),
      currentPlayers: players,
      isHalfInningChange: false,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    const nyaPitcher = result.players.find(p => p.teamId === 'NYA' && p.isCurrentPitcher);
    expect(nyaPitcher!.playerId).toBe('NYA_player2');
  });

  it('should indicate when pitcher needs adding', () => {
    const players = createTeamLineup('NYA', 0, 0);
    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ pitcher: 'NYA_player1', pitteam: 'NYA' }),
      nextPlay: createPlayData({ pitcher: 'unknown_pitcher', pitteam: 'NYA' }),
      currentPlayers: players,
      isHalfInningChange: false,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    expect(result.pitcherNeedsAdding).toBe(true);
    expect(result.pitcherId).toBe('unknown_pitcher');
    expect(result.fieldingTeamId).toBe('NYA');
  });

  it('should update batters for half-inning change', () => {
    const players = [
      ...createTeamLineup('NYA', 2, 0), // NYA player3 is current batter
      ...createTeamLineup('BOS', 4, 0), // BOS player5 is current batter
    ];
    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ batteam: 'BOS', pitteam: 'NYA', batter: 'BOS_player5' }),
      nextPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player3', pitcher: 'BOS_player1' }),
      currentPlayers: players,
      isHalfInningChange: true,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // NYA should have player3 as current batter (from nextPlay.batter)
    const nyaBatter = result.players.find(p => p.teamId === 'NYA' && p.isCurrentBatter);
    expect(nyaBatter!.playerId).toBe('NYA_player3');
  });

  it('should advance batter within same half-inning', () => {
    const players = [
      ...createTeamLineup('NYA', 0, 0), // NYA player1 is current batter
      ...createTeamLineup('BOS', 4, 0),
    ];
    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player1' }),
      nextPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player2', pitcher: 'BOS_player1' }),
      currentPlayers: players,
      isHalfInningChange: false,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // Next batter should be player2 (index 1)
    const nyaBatter = result.players.find(p => p.teamId === 'NYA' && p.isCurrentBatter);
    expect(nyaBatter!.playerId).toBe('NYA_player2');
  });

  it('should handle half-inning change with no current batter on new batting team', () => {
    // NYA has a current batter, but BOS does not
    const nyaPlayers = createTeamLineup('NYA', 2, 0);
    const bosPlayers = createTeamLineup('BOS', -1, 0).map(p => ({ ...p, isCurrentBatter: false }));
    const players = [...nyaPlayers, ...bosPlayers];

    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player3' }),
      nextPlay: createPlayData({ batteam: 'BOS', pitteam: 'NYA', batter: 'BOS_player1', pitcher: 'NYA_player1' }),
      currentPlayers: players,
      isHalfInningChange: true,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // BOS should use the batter from nextPlay
    const bosBatter = result.players.find(p => p.teamId === 'BOS' && p.isCurrentBatter);
    expect(bosBatter!.playerId).toBe('BOS_player1');
  });

  it('should fall back to first batter when no current batter and nextPlay.batter not in lineup', () => {
    const nyaPlayers = createTeamLineup('NYA', 2, 0);
    const bosPlayers = createTeamLineup('BOS', -1, 0).map(p => ({ ...p, isCurrentBatter: false }));
    const players = [...nyaPlayers, ...bosPlayers];

    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player3' }),
      // nextPlay.batter is someone not in the lineup - should fallback
      nextPlay: createPlayData({ batteam: 'BOS', pitteam: 'NYA', batter: 'unknown_batter', pitcher: 'NYA_player1' }),
      currentPlayers: players,
      isHalfInningChange: true,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // BOS should fall back to first batter (batting order 1)
    const bosBatter = result.players.find(p => p.teamId === 'BOS' && p.isCurrentBatter);
    expect(bosBatter!.battingOrder).toBe(1);
  });

  it('should set current batter via validation when fielding team has none', () => {
    const players = [
      ...createTeamLineup('NYA', 0, 0),
      ...createTeamLineup('BOS', -1, 0).map(p => ({ ...p, isCurrentBatter: false })), // No current batter
    ];
    const ctx: BatterPitcherUpdateContext = {
      currentPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player1' }),
      nextPlay: createPlayData({ batteam: 'NYA', pitteam: 'BOS', batter: 'NYA_player2', pitcher: 'BOS_player1' }),
      currentPlayers: players,
      isHalfInningChange: false,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // validateCurrentBatters will set first batter as current when none exists
    const bosCurrentBatters = result.players.filter(p => p.teamId === 'BOS' && p.isCurrentBatter);
    expect(bosCurrentBatters).toHaveLength(1);
    expect(bosCurrentBatters[0].battingOrder).toBe(1);
  });
});
