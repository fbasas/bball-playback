import { Player } from '../../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../../common/types/PlayData';
import {
  ILineupChangeDetector,
  IPlayerRepository,
  ITeamStatsRepository,
  ILineupTrackingService,
  LineupStateData,
  LineupPlayerData,
  LineupChangeData,
} from '../../interfaces';
import {
  detectPitchingChange,
  detectBatterChange,
  detectFieldingChanges,
  PitchingChange,
  BatterChange,
  FieldingChange,
} from './detectors';
import {
  applyChangesToPlayers,
  updateCurrentBatterAndPitcher,
  addPitcherToLineup,
  BatterPitcherUpdateContext,
} from './LineupChangeApplier';

/**
 * Refactored LineupChangeDetector using dependency injection.
 *
 * This class orchestrates:
 * - Fetching data (via injected repositories)
 * - Detecting changes (via pure functions)
 * - Applying changes (via pure functions)
 * - Persisting state (via injected service)
 */
export class LineupChangeDetectorRefactored implements ILineupChangeDetector {
  private readonly gameId: string;
  private readonly sessionId: string;
  private readonly currentPlay: PlayData;
  private readonly nextPlay: PlayData;
  private readonly isHalfInningChange: boolean;

  private latestState: { id: number; playIndex: number; players: LineupPlayerData[] } | null = null;
  private changes: LineupChangeData[] = [];

  constructor(
    private readonly playerRepository: IPlayerRepository,
    private readonly teamStatsRepository: ITeamStatsRepository,
    private readonly lineupTrackingService: ILineupTrackingService,
    gameId: string,
    sessionId: string,
    currentPlay: PlayData,
    nextPlay: PlayData
  ) {
    this.gameId = gameId;
    this.sessionId = sessionId;
    this.currentPlay = currentPlay;
    this.nextPlay = nextPlay;
    this.isHalfInningChange = currentPlay.batteam !== nextPlay.batteam;
  }

  /**
   * Processes lineup changes and returns the new lineup state ID.
   */
  async process(): Promise<number | null> {
    this.logPlayTransition();

    // Get the latest lineup state
    this.latestState = await this.lineupTrackingService.getLatestLineupState(
      this.gameId,
      this.sessionId
    );

    // If no lineup state exists, initialize it
    if (!this.latestState) {
      return await this.handleInitialLineup();
    }

    // Detect all lineup changes using pure functions
    await this.detectLineupChanges();

    // Save changes if any were detected
    if (this.changes.length > 0) {
      const newPlayers = applyChangesToPlayers(this.latestState.players, this.changes);
      return await this.lineupTrackingService.saveLineupState(
        this.createStateData(),
        newPlayers,
        this.changes
      );
    }

    // Update current batter and pitcher even if no other changes
    const updatedPlayers = await this.updateCurrentBatterAndPitcher();
    return await this.lineupTrackingService.saveLineupState(
      this.createStateData(),
      updatedPlayers,
      []
    );
  }

  private logPlayTransition(): void {
    console.log(
      `[LINEUP] Detecting lineup changes between plays ${this.currentPlay.pn} and ${this.nextPlay.pn}`
    );
    console.log(
      `[LINEUP] Current play: Inning ${this.currentPlay.inning} (${this.currentPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${this.currentPlay.outs_pre}`
    );
    console.log(
      `[LINEUP] Next play: Inning ${this.nextPlay.inning} (${this.nextPlay.top_bot === 0 ? 'Top' : 'Bottom'}), Outs: ${this.nextPlay.outs_pre}`
    );
    console.log(
      `[LINEUP] Current batter: ${this.currentPlay.batter}, Next batter: ${this.nextPlay.batter}`
    );
    console.log(
      `[LINEUP] Current pitcher: ${this.currentPlay.pitcher}, Next pitcher: ${this.nextPlay.pitcher}`
    );
    console.log(`[LINEUP] Half-inning change detected: ${this.isHalfInningChange}`);
  }

  private createStateData(): LineupStateData {
    return {
      gameId: this.gameId,
      sessionId: this.sessionId,
      playIndex: this.nextPlay.pn,
      inning: this.nextPlay.inning || 1,
      isTopInning: this.nextPlay.top_bot === 0,
      outs: this.nextPlay.outs_pre || 0,
    };
  }

  /**
   * Initializes the lineup for a new game.
   */
  private async handleInitialLineup(): Promise<number> {
    console.log(`[LINEUP] No previous lineup state found, initializing lineup`);

    // Get team stats from repository
    const teamStats = await this.teamStatsRepository.getTeamStatsForGame(this.gameId);

    if (!teamStats || teamStats.length !== 2) {
      throw new Error(`Team stats not found for game ID: ${this.gameId}`);
    }

    const [homeTeamData, visitingTeamData] = teamStats;

    // Collect all player IDs to fetch names
    const playerIds = [
      ...Array(9)
        .fill(0)
        .map((_, i) => homeTeamData[`start_l${i + 1}` as keyof typeof homeTeamData] as string),
      homeTeamData.start_f1,
      ...Array(9)
        .fill(0)
        .map((_, i) => visitingTeamData[`start_l${i + 1}` as keyof typeof visitingTeamData] as string),
      visitingTeamData.start_f1,
    ].filter(Boolean);

    // Fetch player info from repository
    const playerMap = await this.playerRepository.getPlayersByIds(playerIds);

    // Create team lineup helper
    const createTeamLineup = (
      teamData: typeof homeTeamData,
      teamId: string
    ): LineupPlayerData[] => {
      return Array(9)
        .fill(0)
        .map((_, i) => {
          const playerId = teamData[`start_l${i + 1}` as keyof typeof teamData] as string;
          if (!playerId) return null;

          return {
            teamId,
            playerId,
            battingOrder: i + 1,
            position: i === 0 ? 'P' : `${i + 1}`,
            isCurrentBatter: false,
            isCurrentPitcher: playerId === teamData.start_f1,
          };
        })
        .filter((p): p is LineupPlayerData => p !== null);
    };

    const homeLineup = createTeamLineup(homeTeamData, homeTeamData.team);
    const visitorLineup = createTeamLineup(visitingTeamData, visitingTeamData.team);

    return await this.lineupTrackingService.saveInitialLineup(
      this.gameId,
      this.sessionId,
      homeLineup,
      visitorLineup,
      0
    );
  }

  /**
   * Detects all lineup changes using pure detection functions.
   */
  private async detectLineupChanges(): Promise<void> {
    if (!this.latestState) return;

    // Detect pitching change
    const pitchingChange = detectPitchingChange(
      this.currentPlay,
      this.nextPlay,
      this.isHalfInningChange
    );
    if (pitchingChange) {
      await this.addPitchingChangeRecord(pitchingChange);
    }

    // Detect batter change
    const battingTeamId = String(this.nextPlay.batteam);
    const currentBattingOrder = this.latestState.players
      .filter(p => p.teamId === battingTeamId)
      .sort((a, b) => a.battingOrder - b.battingOrder);

    const batterChange = detectBatterChange(
      currentBattingOrder,
      String(this.nextPlay.batter),
      battingTeamId
    );
    if (batterChange) {
      await this.addBatterChangeRecord(batterChange);
    }

    // Detect fielding changes
    const fieldingChanges = detectFieldingChanges(
      this.currentPlay,
      this.nextPlay,
      this.isHalfInningChange
    );
    for (const change of fieldingChanges) {
      await this.addFieldingChangeRecord(change);
    }
  }

  /**
   * Converts a PitchingChange to a LineupChangeData record.
   */
  private async addPitchingChangeRecord(change: PitchingChange): Promise<void> {
    const newPitcherName = await this.playerRepository.getPlayerName(change.newPitcherId);
    const oldPitcherName = await this.playerRepository.getPlayerName(change.oldPitcherId);

    console.log(`[LINEUP] Pitcher change detected: ${change.oldPitcherId} -> ${change.newPitcherId}`);

    this.changes.push({
      changeType: 'PITCHING_CHANGE',
      playerInId: change.newPitcherId,
      playerOutId: change.oldPitcherId,
      teamId: change.teamId,
      description: `Pitching change: ${newPitcherName || change.newPitcherId} replaces ${oldPitcherName || change.oldPitcherId}`,
    });
  }

  /**
   * Converts a BatterChange to a LineupChangeData record.
   */
  private async addBatterChangeRecord(change: BatterChange): Promise<void> {
    const newBatterName = await this.playerRepository.getPlayerName(change.newBatterId);
    const oldBatterName = await this.playerRepository.getPlayerName(change.oldBatterId);

    console.log(
      `[LINEUP] Batter substitution detected: Expected ${change.oldBatterId}, Actual ${change.newBatterId}`
    );

    this.changes.push({
      changeType: 'SUBSTITUTION',
      playerInId: change.newBatterId,
      playerOutId: change.oldBatterId,
      battingOrderFrom: change.battingOrder,
      battingOrderTo: change.battingOrder,
      teamId: change.teamId,
      description: `Batting substitution: ${newBatterName || change.newBatterId} replaces ${oldBatterName || change.oldBatterId} in the lineup`,
    });
  }

  /**
   * Converts a FieldingChange to a LineupChangeData record.
   */
  private async addFieldingChangeRecord(change: FieldingChange): Promise<void> {
    const newFielderName = await this.playerRepository.getPlayerName(change.newFielderId);

    console.log(
      `[LINEUP] Fielding change detected at position ${change.position}: ${change.oldFielderId} -> ${change.newFielderId}`
    );

    this.changes.push({
      changeType: 'POSITION_CHANGE',
      playerInId: change.newFielderId,
      playerOutId: change.oldFielderId,
      positionFrom: `${change.position}`,
      positionTo: `${change.position}`,
      teamId: change.teamId,
      description: `Fielding change: ${newFielderName || change.newFielderId} replaces ${change.oldFielderId} at position ${change.position}`,
    });
  }

  /**
   * Updates current batter and pitcher flags using pure functions.
   */
  private async updateCurrentBatterAndPitcher(): Promise<LineupPlayerData[]> {
    if (!this.latestState) return [];

    const ctx: BatterPitcherUpdateContext = {
      nextPlay: this.nextPlay,
      currentPlay: this.currentPlay,
      currentPlayers: this.latestState.players,
      isHalfInningChange: this.isHalfInningChange,
    };

    const result = updateCurrentBatterAndPitcher(ctx);

    // If pitcher needs to be added to the lineup, add them
    if (result.pitcherNeedsAdding) {
      console.log(`[LINEUP] Adding new pitcher ${result.pitcherId} to lineup`);
      return addPitcherToLineup(result.players, result.fieldingTeamId, result.pitcherId);
    }

    return result.players;
  }
}
