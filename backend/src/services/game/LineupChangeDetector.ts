import { db } from '../../config/database';
import { Player } from '../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../common/types/PlayData';
import { LineupStateData, LineupPlayerData, LineupChangeData } from './lineupTracking';
import { getLatestLineupState, saveLineupState, saveInitialLineup } from './lineupTracking';

export class LineupChangeDetector {
  private gameId: string;
  private sessionId: string;
  private currentPlay: PlayData;
  private nextPlay: PlayData;
  private latestState: Awaited<ReturnType<typeof getLatestLineupState>> | null = null;
  private isHalfInningChange: boolean;
  private changes: LineupChangeData[] = [];
  private playerCache: Map<string, { first: string; last: string }> = new Map();

  constructor(gameId: string, sessionId: string, currentPlay: PlayData, nextPlay: PlayData) {
    this.gameId = gameId;
    this.sessionId = sessionId;
    this.currentPlay = currentPlay;
    this.nextPlay = nextPlay;
    this.isHalfInningChange = currentPlay.batteam !== nextPlay.batteam;
  }

  private logPlayTransition() {
    console.log(`[LINEUP] Detecting lineup changes between plays ${this.currentPlay.pn} and ${this.nextPlay.pn}`);
    console.log(`[LINEUP] Current play: Inning ${this.currentPlay.inning} (${this.currentPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${this.currentPlay.outs_pre}`);
    console.log(`[LINEUP] Next play: Inning ${this.nextPlay.inning} (${this.nextPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${this.nextPlay.outs_pre}`);
    console.log(`[LINEUP] Current batter: ${this.currentPlay.batter}, Next batter: ${this.nextPlay.batter}`);
    console.log(`[LINEUP] Current pitcher: ${this.currentPlay.pitcher}, Next pitcher: ${this.nextPlay.pitcher}`);
    console.log(`[LINEUP] Half-inning change detected: ${this.isHalfInningChange}`);
  }

  private async getPlayerName(playerId: string | number): Promise<string> {
    const playerIdStr = String(playerId);
    if (!this.playerCache.has(playerIdStr)) {
      const player = await db('allplayers')
        .where({ id: playerIdStr })
        .first();
      if (player) {
        this.playerCache.set(playerIdStr, { first: player.first || '', last: player.last || '' });
      }
    }
    const player = this.playerCache.get(playerIdStr);
    return player ? `${player.first} ${player.last}`.trim() : '';
  }

  private createStateData(): LineupStateData {
    return {
      gameId: this.gameId,
      sessionId: this.sessionId,
      playIndex: this.nextPlay.pn,
      inning: this.nextPlay.inning || 1,
      isTopInning: this.nextPlay.top_bot === 0,
      outs: this.nextPlay.outs_pre || 0
    };
  }

  private async handleInitialLineup(): Promise<number> {
    console.log(`[LINEUP] No previous lineup state found, initializing lineup`);
    
    const teamstats = await db('teamstats')
      .where({ gid: this.gameId })
      .select('team', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6', 'start_l7', 'start_l8', 'start_l9', 'start_f1');

    if (!teamstats || teamstats.length !== 2) {
      throw new Error(`Team stats not found for game ID: ${this.gameId}`);
    }

    const [homeTeamData, visitingTeamData] = teamstats;

    const playerIds = [
      ...Array(9).fill(0).map((_, i) => homeTeamData[`start_l${i + 1}`]),
      homeTeamData.start_f1,
      ...Array(9).fill(0).map((_, i) => visitingTeamData[`start_l${i + 1}`]),
      visitingTeamData.start_f1,
    ].filter(Boolean);

    const players = await db('allplayers')
      .whereIn('id', playerIds)
      .select('id', 'first', 'last');

    players.forEach(player => {
      this.playerCache.set(player.id, { first: player.first || '', last: player.last || '' });
    });

    const createTeamLineup = (teamData: any): Player[] => {
      return Array(9).fill(0).map((_, i) => {
        const playerId = teamData[`start_l${i + 1}`];
        if (playerId && this.playerCache.has(playerId)) {
          const player = this.playerCache.get(playerId)!;
          return {
            position: i === 0 ? 'P' : `${i + 1}`,
            firstName: player.first,
            lastName: player.last,
            retrosheet_id: playerId
          };
        }
        return null;
      }).filter(Boolean) as Player[];
    };

    const homeLineup = createTeamLineup(homeTeamData);
    const visitingLineup = createTeamLineup(visitingTeamData);

    const getFullPitcherName = (pitcherId: string): string => {
      const player = this.playerCache.get(pitcherId);
      return player ? `${player.first} ${player.last}`.trim() : '';
    };

    return await saveInitialLineup(
      this.gameId,
      this.sessionId,
      {
        id: homeTeamData.team,
        lineup: homeLineup,
        currentPitcher: getFullPitcherName(homeTeamData.start_f1)
      },
      {
        id: visitingTeamData.team,
        lineup: visitingLineup,
        currentPitcher: getFullPitcherName(visitingTeamData.start_f1)
      }
    );
  }

  /**
   * Detects all lineup changes between the current play and next play
   * This method orchestrates the detection of different types of changes
   */
  private async detectLineupChanges(): Promise<void> {
    if (!this.latestState) return;

    await this.detectPitchingChange();
    await this.detectBatterChange();
    await this.detectFieldingChanges();
  }

  /**
   * Detects if there was a pitching change between plays
   * A pitching change is detected when the pitcher ID changes and it's not a half-inning change
   */
  private async detectPitchingChange(): Promise<void> {
    // Skip if pitcher didn't change or if it's a half-inning change (expected pitcher change)
    if (this.currentPlay.pitcher === this.nextPlay.pitcher || this.isHalfInningChange) {
      return;
    }

    console.log(`[LINEUP] Pitcher change detected: ${this.currentPlay.pitcher} -> ${this.nextPlay.pitcher}`);
    
    // Get player names for the change description
    const pitcherName = await this.getPlayerName(this.nextPlay.pitcher);
    const oldPitcherName = await this.getPlayerName(this.currentPlay.pitcher);
    
    // Determine which team the pitcher belongs to
    const teamId = this.nextPlay.top_bot === 0 ? this.nextPlay.pitteam : this.nextPlay.batteam;

    // Record the pitching change
    this.changes.push(this.createPitchingChangeRecord(
      String(this.nextPlay.pitcher),
      String(this.currentPlay.pitcher),
      String(teamId),
      pitcherName,
      oldPitcherName
    ));
  }

  /**
   * Creates a pitching change record with the given information
   */
  private createPitchingChangeRecord(
    newPitcherId: string,
    oldPitcherId: string,
    teamId: string,
    newPitcherName: string,
    oldPitcherName: string
  ): LineupChangeData {
    return {
      changeType: 'PITCHING_CHANGE',
      playerInId: newPitcherId,
      playerOutId: oldPitcherId,
      teamId: teamId,
      description: `Pitching change: ${newPitcherName} replaces ${oldPitcherName}`
    };
  }

  /**
   * Detects if there was a batter substitution between plays
   * A batter substitution is detected when the next batter is different from the expected next batter
   * and the next batter is not already in the lineup
   */
  private async detectBatterChange(): Promise<void> {
    if (!this.latestState) return;

    // Get the current batting order for the team at bat
    const battingTeamId = this.nextPlay.batteam;
    const currentBattingOrder = this.getBattingOrderForTeam(battingTeamId);

    // Find the expected next batter based on the current batter
    const { expectedNextBatter, expectedNextBatterIndex } = this.determineExpectedNextBatter(currentBattingOrder);

    // If we can't determine the expected next batter, skip detection
    if (!expectedNextBatter) {
      console.log(`[LINEUP] No expected next batter found, skipping batter change detection`);
      return;
    }
    
    // If the actual next batter matches what we expect, no substitution occurred
    if (this.nextPlay.batter === expectedNextBatter.playerId) {
      console.log(`[LINEUP] Next batter matches expected: ${expectedNextBatter.playerId}`);
      return;
    }
    
    // Check if the next batter already exists in the lineup (not a substitution)
    if (this.isPlayerAlreadyInLineup(currentBattingOrder, this.nextPlay.batter)) {
      return;
    }

    // At this point, we've detected a substitution
    console.log(`[LINEUP] Batter substitution detected: Expected ${expectedNextBatter.playerId}, Actual ${this.nextPlay.batter}`);
    
    // Get player names for the change description
    const newBatterName = await this.getPlayerName(this.nextPlay.batter);
    const oldBatterName = await this.getPlayerName(expectedNextBatter.playerId);

    // Record the batter substitution
    this.changes.push(this.createBatterSubstitutionRecord(
      String(this.nextPlay.batter),
      expectedNextBatter.playerId,
      expectedNextBatter.battingOrder,
      String(battingTeamId),
      newBatterName,
      oldBatterName
    ));
  }

  /**
   * Gets the batting order for a specific team, sorted by batting order
   */
  private getBattingOrderForTeam(teamId: string): LineupPlayerData[] {
    return this.latestState!.players
      .filter(p => p.teamId === teamId)
      .sort((a, b) => a.battingOrder - b.battingOrder);
  }

  /**
   * Determines the expected next batter based on the current batting order
   */
  private determineExpectedNextBatter(battingOrder: LineupPlayerData[]): {
    expectedNextBatter: LineupPlayerData | undefined,
    expectedNextBatterIndex: number
  } {
    const currentBatterIndex = battingOrder.findIndex(p => p.isCurrentBatter);
    const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
    const expectedNextBatter = battingOrder[expectedNextBatterIndex];
    
    return { expectedNextBatter, expectedNextBatterIndex };
  }

  /**
   * Checks if a player is already in the lineup
   */
  private isPlayerAlreadyInLineup(battingOrder: LineupPlayerData[], playerId: string): boolean {
    const existingPlayerWithSameId = battingOrder.find(p => p.playerId === playerId);
    if (existingPlayerWithSameId) {
      console.log(`[LINEUP] Batter ${playerId} already exists in lineup at position ${existingPlayerWithSameId.battingOrder}, not a substitution`);
      return true;
    }
    return false;
  }

  /**
   * Creates a batter substitution record with the given information
   */
  private createBatterSubstitutionRecord(
    newBatterId: string,
    oldBatterId: string,
    battingOrder: number,
    teamId: string,
    newBatterName: string,
    oldBatterName: string
  ): LineupChangeData {
    return {
      changeType: 'SUBSTITUTION',
      playerInId: newBatterId,
      playerOutId: oldBatterId,
      battingOrderFrom: battingOrder,
      battingOrderTo: battingOrder,
      teamId: teamId,
      description: `Batting substitution: ${newBatterName} replaces ${oldBatterName} in the lineup`
    };
  }

  /**
   * Detects if there were any fielding changes between plays
   * A fielding change is detected when a fielder at a specific position changes
   * and it's not a half-inning change
   */
  private async detectFieldingChanges(): Promise<void> {
    // Skip fielding change detection during half-inning changes
    if (this.isHalfInningChange) return;

    // Check each fielding position (2-9, where 1 is pitcher handled separately)
    for (let i = 2; i <= 9; i++) {
      await this.detectFieldingChangeAtPosition(i);
    }
  }

  /**
   * Detects if there was a fielding change at a specific position
   */
  private async detectFieldingChangeAtPosition(position: number): Promise<void> {
    const fieldKey = `f${position}` as keyof PlayData;
    const currentFielderId = this.currentPlay[fieldKey];
    const nextFielderId = this.nextPlay[fieldKey];

    // Skip if either fielder ID is missing or if they're the same
    if (!currentFielderId || !nextFielderId || currentFielderId === nextFielderId) {
      return;
    }

    console.log(`[LINEUP] Fielding change detected at position ${position}: ${currentFielderId} -> ${nextFielderId}`);
    
    // Get the new fielder's name for the change description
    const fielderName = await this.getPlayerName(nextFielderId);
    
    // Determine which team the fielder belongs to
    const fieldingTeamId = this.nextPlay.top_bot === 0 ? this.nextPlay.pitteam : this.nextPlay.batteam;

    // Record the fielding change
    this.changes.push(this.createFieldingChangeRecord(
      String(nextFielderId),
      String(currentFielderId),
      position,
      String(fieldingTeamId),
      fielderName
    ));
  }

  /**
   * Creates a fielding change record with the given information
   */
  private createFieldingChangeRecord(
    newFielderId: string,
    oldFielderId: string,
    position: number,
    teamId: string,
    newFielderName: string
  ): LineupChangeData {
    return {
      changeType: 'POSITION_CHANGE',
      playerInId: newFielderId,
      playerOutId: oldFielderId,
      positionFrom: `${position}`,
      positionTo: `${position}`,
      teamId: teamId,
      description: `Fielding change: ${newFielderName} replaces ${oldFielderId} at position ${position}`
    };
  }

  /**
   * Applies all detected changes to the player lineup data
   * Returns a new array of player data with the changes applied
   */
  private applyChangesToPlayers(): LineupPlayerData[] {
    if (!this.latestState) return [];
    
    const newPlayers = [...this.latestState.players];
    
    this.changes.forEach(change => {
      switch (change.changeType) {
        case 'PITCHING_CHANGE':
          this.applyPitchingChange(newPlayers, change);
          break;
        case 'SUBSTITUTION':
          this.applyBatterSubstitution(newPlayers, change);
          break;
        case 'POSITION_CHANGE':
          this.applyFieldingChange(newPlayers, change);
          break;
      }
    });
    
    return newPlayers;
  }

  /**
   * Applies a pitching change to the player lineup data
   */
  private applyPitchingChange(players: LineupPlayerData[], change: LineupChangeData): void {
    const pitcherIndex = players.findIndex(p =>
      p.teamId === change.teamId && p.isCurrentPitcher);
    
    if (pitcherIndex >= 0) {
      players[pitcherIndex] = {
        ...players[pitcherIndex],
        playerId: change.playerInId || '',
        isCurrentPitcher: true
      };
    }
  }

  /**
   * Applies a batter substitution to the player lineup data
   */
  private applyBatterSubstitution(players: LineupPlayerData[], change: LineupChangeData): void {
    const batterIndex = players.findIndex(p =>
      p.teamId === change.teamId &&
      p.battingOrder === change.battingOrderFrom);
    
    if (batterIndex >= 0) {
      // Get the current batter for the other team
      const otherTeamId = this.nextPlay.batteam === change.teamId ? this.nextPlay.pitteam : this.nextPlay.batteam;
      const otherTeamCurrentBatter = players.find(p => p.teamId === otherTeamId && p.isCurrentBatter);
      
      players[batterIndex] = {
        ...players[batterIndex],
        playerId: change.playerInId || '',
        isCurrentBatter: true
      };
      
      // Clear current batter flag for other players on this team only
      // This preserves the current batter for the other team
      this.clearCurrentBatterFlagForTeam(players, change.teamId, batterIndex);
    }
  }

  /**
   * Clears the current batter flag for all players on a team except the specified player
   */
  private clearCurrentBatterFlagForTeam(players: LineupPlayerData[], teamId: string, exceptIndex: number): void {
    players.forEach((p, i) => {
      if (i !== exceptIndex && p.teamId === teamId) {
        players[i] = { ...p, isCurrentBatter: false };
      }
    });
  }

  /**
   * Applies a fielding change to the player lineup data
   */
  private applyFieldingChange(players: LineupPlayerData[], change: LineupChangeData): void {
    const fielderIndex = players.findIndex(p =>
      p.teamId === change.teamId &&
      p.position === change.positionFrom);
    
    if (fielderIndex >= 0) {
      players[fielderIndex] = {
        ...players[fielderIndex],
        playerId: change.playerInId || ''
      };
    }
  }

  private async updateCurrentBatterAndPitcher(): Promise<LineupPlayerData[]> {
    if (!this.latestState) return [];
    
    const battingTeamId = this.nextPlay.batteam;
    const fieldingTeamId = this.nextPlay.pitteam;
    const newPlayers = [...this.latestState.players];
    
    // No debug logging in production code
    
    // Update current pitcher for both teams
    const fieldingTeamPitcher = this.nextPlay.pitcher;
    
    // First pass: find if the pitcher exists in the lineup
    let pitcherFoundInFieldingTeam = false;
    
    newPlayers.forEach((player) => {
      if (player.teamId === fieldingTeamId && player.playerId === fieldingTeamPitcher) {
        pitcherFoundInFieldingTeam = true;
      }
    });
    
    // Second pass: reset all pitcher flags
    newPlayers.forEach((player, index) => {
      newPlayers[index] = {
        ...player,
        isCurrentPitcher: false
      };
    });
    
    // Third pass: set the current pitcher for the fielding team
    newPlayers.forEach((player, index) => {
      if (player.teamId === fieldingTeamId && player.playerId === fieldingTeamPitcher) {
        newPlayers[index] = {
          ...newPlayers[index],
          isCurrentPitcher: true
        };
      }
    });
    
    // If the pitcher wasn't found in the lineup, add them
    if (!pitcherFoundInFieldingTeam) {
      // Get the pitcher's name
      const pitcherName = await this.getPlayerName(fieldingTeamPitcher);
      
      // Find the batting order for the new pitcher (use the highest batting order + 1)
      const fieldingTeamPlayers = this.latestState.players.filter(p => p.teamId === fieldingTeamId);
      const maxBattingOrder = Math.max(...fieldingTeamPlayers.map(p => p.battingOrder));
      const newBattingOrder = maxBattingOrder + 1;
      
      // Add the pitcher to the lineup
      newPlayers.push({
        teamId: fieldingTeamId,
        playerId: fieldingTeamPitcher,
        battingOrder: newBattingOrder,
        position: 'P',
        isCurrentBatter: false,
        isCurrentPitcher: true
      });
    }
    
    if (this.isHalfInningChange) {
      const previousBattingTeam = this.currentPlay.batteam;
      const previousBattingOrder = this.latestState.players
        .filter(p => p.teamId === previousBattingTeam)
        .sort((a, b) => a.battingOrder - b.battingOrder);
      
      const currentBattingOrder = this.latestState.players
        .filter(p => p.teamId === battingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder);
      
      const currentBatterIndex = previousBattingOrder.findIndex(p => p.isCurrentBatter);
      const nextBatterIndex = (currentBatterIndex + 1) % 9;
      
      // Find the current batter for the team that was fielding but will now be batting
      const currentFieldingTeamBatter = this.latestState.players
        .find(p => p.teamId === battingTeamId && p.isCurrentBatter);
      
      // Update batters for both teams
      newPlayers.forEach((player, index) => {
        if (player.teamId === previousBattingTeam) {
          // Update the previous batting team's current batter
          const willBeCurrentBatter = player.playerId === previousBattingOrder[nextBatterIndex]?.playerId;
          
          if (this.currentPlay.pn === 3 && this.nextPlay.pn === 4 && willBeCurrentBatter) {
            console.log(`[DEBUG] Play 3->4: Setting player ${player.playerId} as current batter for previous batting team ${previousBattingTeam}`);
          }
          
          newPlayers[index] = {
            ...newPlayers[index],
            isCurrentBatter: willBeCurrentBatter
          };
        } else if (player.teamId === battingTeamId) {
          // If we already have a current batter for this team, keep it
          // Otherwise, start with the first batter in the order
          let willBeCurrentBatter = false;
          
          if (player.playerId === this.nextPlay.batter) {
            // Use the actual batter from the next play data
            willBeCurrentBatter = true;
          } else if (currentFieldingTeamBatter) {
            willBeCurrentBatter = player.playerId === currentFieldingTeamBatter.playerId;
          } else {
            const battingOrder = currentBattingOrder.find(p => p.playerId === player.playerId)?.battingOrder;
            willBeCurrentBatter = battingOrder === 1;
          }
          
          newPlayers[index] = {
            ...newPlayers[index],
            isCurrentBatter: willBeCurrentBatter
          };
        }
      });
      
      console.log(`[LINEUP] Updated current batters for half-inning change`);
      console.log(`[LINEUP] Previous batting team (${previousBattingTeam}) next batter: ${previousBattingOrder[nextBatterIndex]?.playerId}`);
      console.log(`[LINEUP] New batting team (${battingTeamId}) current batter: ${currentFieldingTeamBatter?.playerId || 'starting with first batter'}`);
    } else {
      const currentBattingOrder = this.latestState.players
        .filter(p => p.teamId === battingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder);
      
      // Find the current batter for the fielding team
      const fieldingTeamCurrentBatter = this.latestState.players
        .find(p => p.teamId === fieldingTeamId && p.isCurrentBatter);
      
      const currentBatterIndex = currentBattingOrder.findIndex(p => p.isCurrentBatter);
      const nextBatterIndex = (currentBatterIndex + 1) % 9;
      
      if (currentBatterIndex !== -1 && currentBattingOrder[nextBatterIndex]) {
        console.log(`[LINEUP] Updating current batter from ${currentBattingOrder[currentBatterIndex].playerId} to ${currentBattingOrder[nextBatterIndex].playerId}`);
        
        // Update only the batting team's current batter, preserve the fielding team's current batter
        newPlayers.forEach((player, index) => {
          if (player.teamId === battingTeamId) {
            const willBeCurrentBatter = player.playerId === currentBattingOrder[nextBatterIndex].playerId;
      
            newPlayers[index] = {
              ...player,
              isCurrentBatter: willBeCurrentBatter
            };
          } else if (player.teamId === fieldingTeamId) {
            // Preserve the fielding team's current batter
            const willBeCurrentBatter = fieldingTeamCurrentBatter ? player.playerId === fieldingTeamCurrentBatter.playerId : false;

            newPlayers[index] = {
              ...player,
              isCurrentBatter: willBeCurrentBatter
            };
          }
        });
      }
    }
    
    // Ensure we have exactly one current batter per team
    this.validateCurrentBatters(newPlayers);
    
    return newPlayers;
  }
  
  /**
   * Validates that there is exactly one current batter per team
   * If not, it fixes the issue by selecting the first player in the batting order
   */
  /**
   * Validates that there is exactly one current batter per team
   * If not, it fixes the issue by selecting the first player in the batting order
   * or keeping only the one with the lowest batting order
   */
  private validateCurrentBatters(players: LineupPlayerData[]): void {
    const teams = [...new Set(players.map(p => p.teamId))];
    
    for (const teamId of teams) {
      const teamPlayers = players.filter(p => p.teamId === teamId);
      const currentBatters = teamPlayers.filter(p => p.isCurrentBatter);
      
      if (currentBatters.length === 0) {
        this.handleMissingCurrentBatter(players, teamPlayers, teamId);
      } else if (currentBatters.length > 1) {
        this.handleMultipleCurrentBatters(players, currentBatters, teamId);
      }
    }
  }

  /**
   * Handles the case where a team has no current batter
   * Sets the first player in the batting order as the current batter
   */
  private handleMissingCurrentBatter(
    allPlayers: LineupPlayerData[],
    teamPlayers: LineupPlayerData[],
    teamId: string
  ): void {
    // If no current batter, set the first player in the batting order as current batter
    const sortedPlayers = [...teamPlayers].sort((a, b) => a.battingOrder - b.battingOrder);
    if (sortedPlayers.length > 0) {
      const firstPlayerIndex = allPlayers.findIndex(p => p.playerId === sortedPlayers[0].playerId);
      if (firstPlayerIndex !== -1) {
        allPlayers[firstPlayerIndex] = {
          ...allPlayers[firstPlayerIndex],
          isCurrentBatter: true
        };
        console.log(`[LINEUP] No current batter for team ${teamId}, setting player ${sortedPlayers[0].playerId} as current batter`);
      }
    }
  }

  /**
   * Handles the case where a team has multiple current batters
   * Keeps only the one with the lowest batting order
   */
  private handleMultipleCurrentBatters(
    allPlayers: LineupPlayerData[],
    currentBatters: LineupPlayerData[],
    teamId: string
  ): void {
    // If multiple current batters, keep only the one with the lowest batting order
    const sortedCurrentBatters = [...currentBatters].sort((a, b) => a.battingOrder - b.battingOrder);
    
    // Keep the first one (lowest batting order) and remove the flag from others
    for (let i = 1; i < sortedCurrentBatters.length; i++) {
      const playerIndex = allPlayers.findIndex(p => p.playerId === sortedCurrentBatters[i].playerId);
      if (playerIndex !== -1) {
        allPlayers[playerIndex] = {
          ...allPlayers[playerIndex],
          isCurrentBatter: false
        };
        console.log(`[LINEUP] Multiple current batters for team ${teamId}, removing current batter flag from ${sortedCurrentBatters[i].playerId}`);
      }
    }
  }

  public async process(): Promise<number | null> {
    this.logPlayTransition();
    
    // Get the latest lineup state
    this.latestState = await getLatestLineupState(this.gameId, this.sessionId);
    
    // If no lineup state exists, initialize it
    if (!this.latestState) {
      return await this.handleInitialLineup();
    }

    // Process lineup changes
    await this.detectLineupChanges();
    
    // Save changes if any were detected
    if (this.changes.length > 0) {
      const newPlayers = this.applyChangesToPlayers();
      return await saveLineupState(this.createStateData(), newPlayers, this.changes);
    }
    
    // Update current batter and pitcher even if no other changes
    if (this.latestState) {
      const newPlayers = await this.updateCurrentBatterAndPitcher();
      return await saveLineupState(this.createStateData(), newPlayers, []);
    }

    console.log(`[LINEUP] No lineup state changes needed for this play`);
    return null;
  }
}
