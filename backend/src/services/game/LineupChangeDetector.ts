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

  private async detectLineupChanges(): Promise<void> {
    if (!this.latestState) return;

    await this.detectPitchingChange();
    await this.detectBatterChange();
    await this.detectFieldingChanges();
  }

  private async detectPitchingChange(): Promise<void> {
    if (this.currentPlay.pitcher === this.nextPlay.pitcher || this.isHalfInningChange) {
      return;
    }

    console.log(`[LINEUP] Pitcher change detected: ${this.currentPlay.pitcher} -> ${this.nextPlay.pitcher}`);
    const pitcherName = await this.getPlayerName(this.nextPlay.pitcher);
    const oldPitcherName = await this.getPlayerName(this.currentPlay.pitcher);
    const teamId = this.nextPlay.top_bot === 0 ? this.nextPlay.pitteam : this.nextPlay.batteam;

    this.changes.push({
      changeType: 'PITCHING_CHANGE',
      playerInId: String(this.nextPlay.pitcher),
      playerOutId: String(this.currentPlay.pitcher),
      teamId: String(teamId),
      description: `Pitching change: ${pitcherName} replaces ${oldPitcherName}`
    });
  }

  private async detectBatterChange(): Promise<void> {
    if (!this.latestState) return;

    const battingTeamId = this.nextPlay.batteam;
    const currentBattingOrder = this.latestState.players
      .filter(p => p.teamId === battingTeamId)
      .sort((a, b) => a.battingOrder - b.battingOrder);

    const currentBatterIndex = currentBattingOrder.findIndex(p => p.isCurrentBatter);
    const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
    const expectedNextBatter = currentBattingOrder[expectedNextBatterIndex];

    // Check if the next batter is different from what we expect
    if (!expectedNextBatter) {
      console.log(`[LINEUP] No expected next batter found, skipping batter change detection`);
      return;
    }
    
    // Check if the actual next batter matches what we expect
    if (this.nextPlay.batter === expectedNextBatter.playerId) {
      console.log(`[LINEUP] Next batter matches expected: ${expectedNextBatter.playerId}`);
      return;
    }
    
    // Check if the next batter already exists in the lineup
    const existingPlayerWithSameId = currentBattingOrder.find(p => p.playerId === this.nextPlay.batter);
    if (existingPlayerWithSameId) {
      console.log(`[LINEUP] Batter ${this.nextPlay.batter} already exists in lineup at position ${existingPlayerWithSameId.battingOrder}, not a substitution`);
      return;
    }

    console.log(`[LINEUP] Batter substitution detected: Expected ${expectedNextBatter.playerId}, Actual ${this.nextPlay.batter}`);
    const newBatterName = await this.getPlayerName(this.nextPlay.batter);
    const oldBatterName = await this.getPlayerName(expectedNextBatter.playerId);

    this.changes.push({
      changeType: 'SUBSTITUTION',
      playerInId: String(this.nextPlay.batter),
      playerOutId: expectedNextBatter.playerId,
      battingOrderFrom: expectedNextBatter.battingOrder,
      battingOrderTo: expectedNextBatter.battingOrder,
      teamId: String(battingTeamId),
      description: `Batting substitution: ${newBatterName} replaces ${oldBatterName} in the lineup`
    });
  }

  private async detectFieldingChanges(): Promise<void> {
    if (this.isHalfInningChange) return;

    for (let i = 2; i <= 9; i++) {
      const fieldKey = `f${i}` as keyof PlayData;
      const currentFielderId = this.currentPlay[fieldKey];
      const nextFielderId = this.nextPlay[fieldKey];

      if (!currentFielderId || !nextFielderId || currentFielderId === nextFielderId) {
        continue;
      }

      console.log(`[LINEUP] Fielding change detected at position ${i}: ${currentFielderId} -> ${nextFielderId}`);
      const fielderName = await this.getPlayerName(nextFielderId);
      const fieldingTeamId = this.nextPlay.top_bot === 0 ? this.nextPlay.pitteam : this.nextPlay.batteam;

      this.changes.push({
        changeType: 'POSITION_CHANGE',
        playerInId: String(nextFielderId),
        playerOutId: String(currentFielderId),
        positionFrom: `${i}`,
        positionTo: `${i}`,
        teamId: String(fieldingTeamId),
        description: `Fielding change: ${fielderName} replaces ${currentFielderId} at position ${i}`
      });
    }
  }

  private applyChangesToPlayers(): LineupPlayerData[] {
    if (!this.latestState) return [];
    
    const newPlayers = [...this.latestState.players];
    
    this.changes.forEach(change => {
      if (change.changeType === 'PITCHING_CHANGE') {
        const pitcherIndex = newPlayers.findIndex(p => 
          p.teamId === change.teamId && p.isCurrentPitcher);
        
        if (pitcherIndex >= 0) {
          newPlayers[pitcherIndex] = {
            ...newPlayers[pitcherIndex],
            playerId: change.playerInId || '',
            isCurrentPitcher: true
          };
        }
      } else if (change.changeType === 'SUBSTITUTION') {
        const batterIndex = newPlayers.findIndex(p => 
          p.teamId === change.teamId && 
          p.battingOrder === change.battingOrderFrom);
        
        if (batterIndex >= 0) {
          // Get the current batter for the other team
          const otherTeamId = this.nextPlay.batteam === change.teamId ? this.nextPlay.pitteam : this.nextPlay.batteam;
          const otherTeamCurrentBatter = newPlayers.find(p => p.teamId === otherTeamId && p.isCurrentBatter);
          
          newPlayers[batterIndex] = {
            ...newPlayers[batterIndex],
            playerId: change.playerInId || '',
            isCurrentBatter: true
          };
          
          // Clear current batter flag for other players on this team only
          // This preserves the current batter for the other team
          newPlayers.forEach((p, i) => {
            if (i !== batterIndex && p.teamId === change.teamId) {
              newPlayers[i] = { ...p, isCurrentBatter: false };
            }
          });
        }
      } else if (change.changeType === 'POSITION_CHANGE') {
        const fielderIndex = newPlayers.findIndex(p => 
          p.teamId === change.teamId && 
          p.position === change.positionFrom);
        
        if (fielderIndex >= 0) {
          newPlayers[fielderIndex] = {
            ...newPlayers[fielderIndex],
            playerId: change.playerInId || ''
          };
        }
      }
    });
    
    return newPlayers;
  }

  private async updateCurrentBatter(): Promise<LineupPlayerData[]> {
    if (!this.latestState) return [];
    
    const battingTeamId = this.nextPlay.batteam;
    const fieldingTeamId = this.nextPlay.pitteam;
    const newPlayers = [...this.latestState.players];
    
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
          newPlayers[index] = {
            ...player,
            isCurrentBatter: player.playerId === previousBattingOrder[nextBatterIndex]?.playerId
          };
        } else if (player.teamId === battingTeamId) {
          // If we already have a current batter for this team, keep it
          // Otherwise, start with the first batter in the order
          if (currentFieldingTeamBatter) {
            newPlayers[index] = {
              ...player,
              isCurrentBatter: player.playerId === currentFieldingTeamBatter.playerId
            };
          } else {
            const battingOrder = currentBattingOrder.find(p => p.playerId === player.playerId)?.battingOrder;
            newPlayers[index] = {
              ...player,
              isCurrentBatter: battingOrder === 1
            };
          }
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
            newPlayers[index] = {
              ...player,
              isCurrentBatter: player.playerId === currentBattingOrder[nextBatterIndex].playerId
            };
          } else if (player.teamId === fieldingTeamId) {
            // Preserve the fielding team's current batter
            newPlayers[index] = {
              ...player,
              isCurrentBatter: fieldingTeamCurrentBatter ? player.playerId === fieldingTeamCurrentBatter.playerId : false
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
  private validateCurrentBatters(players: LineupPlayerData[]): void {
    const teams = [...new Set(players.map(p => p.teamId))];
    
    for (const teamId of teams) {
      const teamPlayers = players.filter(p => p.teamId === teamId);
      const currentBatters = teamPlayers.filter(p => p.isCurrentBatter);
      
      if (currentBatters.length === 0) {
        // If no current batter, set the first player in the batting order as current batter
        const sortedPlayers = [...teamPlayers].sort((a, b) => a.battingOrder - b.battingOrder);
        if (sortedPlayers.length > 0) {
          const firstPlayerIndex = players.findIndex(p => p.playerId === sortedPlayers[0].playerId);
          if (firstPlayerIndex !== -1) {
            players[firstPlayerIndex] = {
              ...players[firstPlayerIndex],
              isCurrentBatter: true
            };
            console.log(`[LINEUP] No current batter for team ${teamId}, setting player ${sortedPlayers[0].playerId} as current batter`);
          }
        }
      } else if (currentBatters.length > 1) {
        // If multiple current batters, keep only the one with the lowest batting order
        const sortedCurrentBatters = [...currentBatters].sort((a, b) => a.battingOrder - b.battingOrder);
        
        for (let i = 1; i < sortedCurrentBatters.length; i++) {
          const playerIndex = players.findIndex(p => p.playerId === sortedCurrentBatters[i].playerId);
          if (playerIndex !== -1) {
            players[playerIndex] = {
              ...players[playerIndex],
              isCurrentBatter: false
            };
            console.log(`[LINEUP] Multiple current batters for team ${teamId}, removing current batter flag from ${sortedCurrentBatters[i].playerId}`);
          }
        }
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
    
    // Update current batter even if no other changes
    if (this.latestState) {
      const newPlayers = await this.updateCurrentBatter();
      return await saveLineupState(this.createStateData(), newPlayers, []);
    }

    console.log(`[LINEUP] No lineup state changes needed for this play`);
    return null;
  }
}
