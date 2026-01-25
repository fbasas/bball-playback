import { PlayData } from '../../../../../common/types/PlayData';
import { LineupPlayerData, LineupChangeData } from '../lineupTracking';

/**
 * Context needed for updating current batter and pitcher.
 * Extracted to avoid passing multiple parameters.
 */
export interface BatterPitcherUpdateContext {
  nextPlay: PlayData;
  currentPlay: PlayData;
  currentPlayers: LineupPlayerData[];
  isHalfInningChange: boolean;
}

/**
 * Applies a pitching change to the player lineup data.
 * Returns a new array with the change applied (immutable).
 *
 * @param players Current lineup players
 * @param change The pitching change to apply
 * @returns New array with the pitching change applied
 */
export function applyPitchingChange(
  players: LineupPlayerData[],
  change: LineupChangeData
): LineupPlayerData[] {
  return players.map(player => {
    if (player.teamId === change.teamId && player.isCurrentPitcher) {
      return {
        ...player,
        playerId: change.playerInId || '',
        isCurrentPitcher: true,
      };
    }
    return player;
  });
}

/**
 * Clears the current batter flag for all players on a team except at a specific index.
 * Returns a new array (immutable).
 *
 * @param players Current lineup players
 * @param teamId The team to update
 * @param exceptIndex The index to exclude from clearing
 * @returns New array with flags cleared
 */
function clearCurrentBatterFlagForTeam(
  players: LineupPlayerData[],
  teamId: string,
  exceptIndex: number
): LineupPlayerData[] {
  return players.map((player, index) => {
    if (index !== exceptIndex && player.teamId === teamId && player.isCurrentBatter) {
      return { ...player, isCurrentBatter: false };
    }
    return player;
  });
}

/**
 * Applies a batter substitution to the player lineup data.
 * Returns a new array with the change applied (immutable).
 *
 * @param players Current lineup players
 * @param change The batter substitution to apply
 * @returns New array with the substitution applied
 */
export function applyBatterSubstitution(
  players: LineupPlayerData[],
  change: LineupChangeData
): LineupPlayerData[] {
  const batterIndex = players.findIndex(
    p => p.teamId === change.teamId && p.battingOrder === change.battingOrderFrom
  );

  if (batterIndex < 0) {
    return players;
  }

  // First, update the new batter
  let newPlayers = players.map((player, index) => {
    if (index === batterIndex) {
      return {
        ...player,
        playerId: change.playerInId || '',
        isCurrentBatter: true,
      };
    }
    return player;
  });

  // Then clear current batter flag for other players on this team
  newPlayers = clearCurrentBatterFlagForTeam(newPlayers, change.teamId, batterIndex);

  return newPlayers;
}

/**
 * Applies a fielding change to the player lineup data.
 * Returns a new array with the change applied (immutable).
 *
 * @param players Current lineup players
 * @param change The fielding change to apply
 * @returns New array with the fielding change applied
 */
export function applyFieldingChange(
  players: LineupPlayerData[],
  change: LineupChangeData
): LineupPlayerData[] {
  return players.map(player => {
    if (player.teamId === change.teamId && player.position === change.positionFrom) {
      return {
        ...player,
        playerId: change.playerInId || '',
      };
    }
    return player;
  });
}

/**
 * Applies all detected changes to the player lineup data.
 * Returns a new array with all changes applied (immutable).
 *
 * @param players Current lineup players
 * @param changes Array of changes to apply
 * @returns New array with all changes applied
 */
export function applyChangesToPlayers(
  players: LineupPlayerData[],
  changes: LineupChangeData[]
): LineupPlayerData[] {
  let result = [...players];

  for (const change of changes) {
    switch (change.changeType) {
      case 'PITCHING_CHANGE':
        result = applyPitchingChange(result, change);
        break;
      case 'SUBSTITUTION':
        result = applyBatterSubstitution(result, change);
        break;
      case 'POSITION_CHANGE':
        result = applyFieldingChange(result, change);
        break;
    }
  }

  return result;
}

/**
 * Handles the case where a team has no current batter.
 * Sets the first player in the batting order as the current batter.
 * Returns the updated players array (immutable).
 */
function handleMissingCurrentBatter(
  players: LineupPlayerData[],
  teamPlayers: LineupPlayerData[],
  teamId: string
): LineupPlayerData[] {
  const sortedPlayers = [...teamPlayers].sort((a, b) => a.battingOrder - b.battingOrder);

  if (sortedPlayers.length === 0) {
    return players;
  }

  const firstPlayerId = sortedPlayers[0].playerId;

  return players.map(player => {
    if (player.playerId === firstPlayerId) {
      return { ...player, isCurrentBatter: true };
    }
    return player;
  });
}

/**
 * Handles the case where a team has multiple current batters.
 * Keeps only the one with the lowest batting order.
 * Returns the updated players array (immutable).
 */
function handleMultipleCurrentBatters(
  players: LineupPlayerData[],
  currentBatters: LineupPlayerData[]
): LineupPlayerData[] {
  const sortedCurrentBatters = [...currentBatters].sort((a, b) => a.battingOrder - b.battingOrder);

  // Keep the first one (lowest batting order), remove flag from others
  const playerIdsToUnset = new Set(
    sortedCurrentBatters.slice(1).map(p => p.playerId)
  );

  return players.map(player => {
    if (playerIdsToUnset.has(player.playerId)) {
      return { ...player, isCurrentBatter: false };
    }
    return player;
  });
}

/**
 * Validates that there is exactly one current batter per team.
 * If not, fixes the issue by selecting the first player in the batting order
 * or keeping only the one with the lowest batting order.
 * Returns a new array (immutable).
 *
 * @param players Current lineup players
 * @returns New array with validated current batters
 */
export function validateCurrentBatters(players: LineupPlayerData[]): LineupPlayerData[] {
  let result = [...players];
  const teams = [...new Set(players.map(p => p.teamId))];

  for (const teamId of teams) {
    const teamPlayers = result.filter(p => p.teamId === teamId);
    const currentBatters = teamPlayers.filter(p => p.isCurrentBatter);

    if (currentBatters.length === 0) {
      result = handleMissingCurrentBatter(result, teamPlayers, teamId);
    } else if (currentBatters.length > 1) {
      result = handleMultipleCurrentBatters(result, currentBatters);
    }
  }

  return result;
}

/**
 * Updates the current pitcher flags based on the next play.
 * Returns a new array (immutable).
 */
function updatePitcherFlags(
  players: LineupPlayerData[],
  fieldingTeamId: string,
  fieldingTeamPitcher: string
): LineupPlayerData[] {
  // Reset all pitcher flags, then set the current pitcher
  return players.map(player => {
    const isCurrentPitcher =
      player.teamId === fieldingTeamId && player.playerId === fieldingTeamPitcher;
    return {
      ...player,
      isCurrentPitcher,
    };
  });
}

/**
 * Checks if a pitcher exists in the lineup for a team.
 */
function isPitcherInLineup(
  players: LineupPlayerData[],
  fieldingTeamId: string,
  pitcherId: string
): boolean {
  return players.some(p => p.teamId === fieldingTeamId && p.playerId === pitcherId);
}

/**
 * Adds a new pitcher to the lineup if they don't exist.
 * Returns a new array (immutable).
 */
function addPitcherToLineup(
  players: LineupPlayerData[],
  fieldingTeamId: string,
  pitcherId: string
): LineupPlayerData[] {
  const fieldingTeamPlayers = players.filter(p => p.teamId === fieldingTeamId);
  const maxBattingOrder = Math.max(...fieldingTeamPlayers.map(p => p.battingOrder), 0);

  return [
    ...players,
    {
      teamId: fieldingTeamId,
      playerId: pitcherId,
      battingOrder: maxBattingOrder + 1,
      position: 'P',
      isCurrentBatter: false,
      isCurrentPitcher: true,
    },
  ];
}

/**
 * Updates current batters for a half-inning change.
 * Returns a new array (immutable).
 */
function updateBattersForHalfInningChange(
  players: LineupPlayerData[],
  ctx: BatterPitcherUpdateContext
): LineupPlayerData[] {
  const battingTeamId = String(ctx.nextPlay.batteam);
  const previousBattingTeam = String(ctx.currentPlay.batteam);

  const previousBattingOrder = ctx.currentPlayers
    .filter(p => p.teamId === previousBattingTeam)
    .sort((a, b) => a.battingOrder - b.battingOrder);

  const currentBatterIndex = previousBattingOrder.findIndex(p => p.isCurrentBatter);
  const nextBatterIndex = (currentBatterIndex + 1) % 9;

  // Find the current batter for the team that was fielding but will now be batting
  const currentFieldingTeamBatter = ctx.currentPlayers.find(
    p => p.teamId === battingTeamId && p.isCurrentBatter
  );

  const nextBatter = String(ctx.nextPlay.batter);

  return players.map(player => {
    if (player.teamId === previousBattingTeam) {
      // Update the previous batting team's current batter
      const willBeCurrentBatter =
        player.playerId === previousBattingOrder[nextBatterIndex]?.playerId;
      return { ...player, isCurrentBatter: willBeCurrentBatter };
    } else if (player.teamId === battingTeamId) {
      // Determine current batter for the new batting team
      let willBeCurrentBatter = false;

      if (player.playerId === nextBatter) {
        // Use the actual batter from the next play data
        willBeCurrentBatter = true;
      } else if (currentFieldingTeamBatter) {
        willBeCurrentBatter = player.playerId === currentFieldingTeamBatter.playerId;
      } else {
        // Start with the first batter in the order
        const battingOrder = ctx.currentPlayers
          .filter(p => p.teamId === battingTeamId)
          .sort((a, b) => a.battingOrder - b.battingOrder);
        const playerBattingOrder = battingOrder.find(p => p.playerId === player.playerId)?.battingOrder;
        willBeCurrentBatter = playerBattingOrder === 1;
      }

      return { ...player, isCurrentBatter: willBeCurrentBatter };
    }
    return player;
  });
}

/**
 * Updates current batters within the same half-inning.
 * Returns a new array (immutable).
 */
function updateBattersWithinHalfInning(
  players: LineupPlayerData[],
  ctx: BatterPitcherUpdateContext
): LineupPlayerData[] {
  const battingTeamId = String(ctx.nextPlay.batteam);
  const fieldingTeamId = String(ctx.nextPlay.pitteam);

  const currentBattingOrder = ctx.currentPlayers
    .filter(p => p.teamId === battingTeamId)
    .sort((a, b) => a.battingOrder - b.battingOrder);

  const fieldingTeamCurrentBatter = ctx.currentPlayers.find(
    p => p.teamId === fieldingTeamId && p.isCurrentBatter
  );

  const currentBatterIndex = currentBattingOrder.findIndex(p => p.isCurrentBatter);
  const nextBatterIndex = (currentBatterIndex + 1) % 9;

  if (currentBatterIndex === -1 || !currentBattingOrder[nextBatterIndex]) {
    return players;
  }

  return players.map(player => {
    if (player.teamId === battingTeamId) {
      const willBeCurrentBatter =
        player.playerId === currentBattingOrder[nextBatterIndex].playerId;
      return { ...player, isCurrentBatter: willBeCurrentBatter };
    } else if (player.teamId === fieldingTeamId) {
      // Preserve the fielding team's current batter
      const willBeCurrentBatter = fieldingTeamCurrentBatter
        ? player.playerId === fieldingTeamCurrentBatter.playerId
        : false;
      return { ...player, isCurrentBatter: willBeCurrentBatter };
    }
    return player;
  });
}

/**
 * Updates current batter and pitcher flags based on play transition.
 * This is a pure function - returns a new array without mutations.
 *
 * Note: This function does NOT add new pitchers to the lineup if they don't exist.
 * That logic requires async player name lookup and should be handled by the caller.
 * Use `isPitcherInLineup` and `addPitcherToLineup` separately if needed.
 *
 * @param ctx Context containing play data and current state
 * @returns New array with updated flags, and whether pitcher needs to be added
 */
export function updateCurrentBatterAndPitcher(
  ctx: BatterPitcherUpdateContext
): { players: LineupPlayerData[]; pitcherNeedsAdding: boolean; pitcherId: string; fieldingTeamId: string } {
  const fieldingTeamId = String(ctx.nextPlay.pitteam);
  const fieldingTeamPitcher = String(ctx.nextPlay.pitcher);

  // Check if pitcher needs to be added
  const pitcherNeedsAdding = !isPitcherInLineup(
    ctx.currentPlayers,
    fieldingTeamId,
    fieldingTeamPitcher
  );

  // Start with current players
  let result = [...ctx.currentPlayers];

  // Update pitcher flags
  result = updatePitcherFlags(result, fieldingTeamId, fieldingTeamPitcher);

  // Update batter flags based on whether it's a half-inning change
  if (ctx.isHalfInningChange) {
    result = updateBattersForHalfInningChange(result, ctx);
  } else {
    result = updateBattersWithinHalfInning(result, ctx);
  }

  // Validate current batters
  result = validateCurrentBatters(result);

  return {
    players: result,
    pitcherNeedsAdding,
    pitcherId: fieldingTeamPitcher,
    fieldingTeamId,
  };
}

// Export helper functions for cases where caller needs to handle pitcher addition
export { isPitcherInLineup, addPitcherToLineup };
