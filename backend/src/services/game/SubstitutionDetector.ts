import { PlayData } from '../../../../common/types/PlayData';
import { SubstitutionResponse, Substitution } from '../../../../common/types/SubstitutionTypes';
import { db } from '../../config/database';

/**
 * Class responsible for detecting substitutions between plays
 */
export class SubstitutionDetector {
  private gameId: string;
  private sessionId: string;
  private currentPlay: PlayData;
  private nextPlay: PlayData;
  private playerCache: Map<string, { first: string; last: string }> = new Map();
  private substitutions: Substitution[] = [];

  constructor(gameId: string, sessionId: string, currentPlay: PlayData, nextPlay: PlayData) {
    this.gameId = gameId;
    this.sessionId = sessionId;
    this.currentPlay = currentPlay;
    this.nextPlay = nextPlay;
  }

  /**
   * Get a player's full name from their ID
   */
  private async getPlayerName(playerId: string): Promise<string> {
    if (!this.playerCache.has(playerId)) {
      const player = await db('allplayers')
        .where({ id: playerId })
        .first();
      if (player) {
        this.playerCache.set(playerId, { 
          first: player.first || '', 
          last: player.last || '' 
        });
      }
    }
    const player = this.playerCache.get(playerId);
    return player ? `${player.first} ${player.last}`.trim() : '';
  }

  /**
   * Detect pitching changes between plays
   */
  private async detectPitchingChange(): Promise<void> {
    // Skip if no change or half-inning change
    if (this.currentPlay.pitcher === this.nextPlay.pitcher || 
        this.currentPlay.batteam !== this.nextPlay.batteam) {
      return;
    }

    const newPitcherName = await this.getPlayerName(this.nextPlay.pitcher);
    const oldPitcherName = await this.getPlayerName(this.currentPlay.pitcher);
    const teamId = this.nextPlay.pitteam;

    this.substitutions.push({
      type: 'PITCHING_CHANGE',
      playerIn: {
        playerId: this.nextPlay.pitcher,
        playerName: newPitcherName,
        teamId,
        position: 'P'
      },
      playerOut: {
        playerId: this.currentPlay.pitcher,
        playerName: oldPitcherName,
        teamId,
        position: 'P'
      },
      description: `Pitching change: ${newPitcherName} replaces ${oldPitcherName}`
    });
  }

  /**
   * Detect pinch hitters between plays
   */
  private async detectPinchHitter(): Promise<void> {
    // Skip if half-inning change
    if (this.currentPlay.batteam !== this.nextPlay.batteam) {
      return;
    }

    // Get the latest lineup state to determine expected batter
    const lineupState = await db('lineup_states')
      .where({ 
        game_id: this.gameId,
        session_id: this.sessionId
      })
      .where('play_index', '<=', this.currentPlay.pn)
      .orderBy('play_index', 'desc')
      .first();
    
    if (!lineupState) {
      return;
    }

    // Get the players for this lineup state
    const players = await db('lineup_players')
      .where({ lineup_state_id: lineupState.id });
    
    // Get batting team players sorted by batting order
    const battingTeamId = this.nextPlay.batteam;
    const battingTeamPlayers = players
      .filter(p => p.team_id === battingTeamId)
      .sort((a, b) => a.batting_order - b.batting_order);
    
    // Find current batter
    const currentBatterIndex = battingTeamPlayers.findIndex(p => p.is_current_batter);
    if (currentBatterIndex === -1) {
      return;
    }
    
    // Calculate expected next batter
    const expectedNextBatterIndex = (currentBatterIndex + 1) % 9;
    const expectedNextBatter = battingTeamPlayers[expectedNextBatterIndex];
    
    // If next batter is not as expected and not already in lineup, it's a pinch hitter
    if (expectedNextBatter && 
        this.nextPlay.batter !== expectedNextBatter.player_id && 
        !battingTeamPlayers.some(p => p.player_id === this.nextPlay.batter)) {
      
      const newBatterName = await this.getPlayerName(this.nextPlay.batter);
      const expectedBatterName = await this.getPlayerName(expectedNextBatter.player_id);
      
      this.substitutions.push({
        type: 'PINCH_HITTER',
        playerIn: {
          playerId: this.nextPlay.batter,
          playerName: newBatterName,
          teamId: battingTeamId,
          position: expectedNextBatter.position
        },
        playerOut: {
          playerId: expectedNextBatter.player_id,
          playerName: expectedBatterName,
          teamId: battingTeamId,
          position: expectedNextBatter.position
        },
        description: `Pinch hitter: ${newBatterName} bats for ${expectedBatterName}`
      });
    }
  }

  /**
   * Detect pinch runners between plays
   */
  private async detectPinchRunner(): Promise<void> {
    // Check for runner changes that aren't explained by play outcomes
    const bases = ['br1_pre', 'br2_pre', 'br3_pre'] as const;
    
    for (const base of bases) {
      const currentRunner = this.currentPlay[base];
      const nextRunner = this.nextPlay[base];
      
      // If there's a runner on the base in both plays but it's a different player
      if (currentRunner && nextRunner && currentRunner !== nextRunner) {
        const newRunnerName = await this.getPlayerName(nextRunner);
        const oldRunnerName = await this.getPlayerName(currentRunner);
        const teamId = this.nextPlay.batteam;
        
        this.substitutions.push({
          type: 'PINCH_RUNNER',
          playerIn: {
            playerId: nextRunner,
            playerName: newRunnerName,
            teamId
          },
          playerOut: {
            playerId: currentRunner,
            playerName: oldRunnerName,
            teamId
          },
          description: `Pinch runner: ${newRunnerName} runs for ${oldRunnerName} at ${base === 'br1_pre' ? 'first' : base === 'br2_pre' ? 'second' : 'third'} base`
        });
      }
    }
  }

  /**
   * Detect all types of substitutions between the current and next play
   */
  public async detectSubstitutions(): Promise<SubstitutionResponse> {
    // Detect all types of substitutions
    await this.detectPitchingChange();
    await this.detectPinchHitter();
    await this.detectPinchRunner();

    // Create the response
    return {
      hasPitchingChange: this.substitutions.some(s => s.type === 'PITCHING_CHANGE'),
      hasPinchHitter: this.substitutions.some(s => s.type === 'PINCH_HITTER'),
      hasPinchRunner: this.substitutions.some(s => s.type === 'PINCH_RUNNER'),
      substitutions: this.substitutions
    };
  }

  /**
   * Static method to create a detector from just the current play
   */
  public static async createFromCurrentPlay(
    gameId: string, 
    sessionId: string, 
    currentPlay: number
  ): Promise<SubstitutionDetector | null> {
    // Fetch current play data
    const currentPlayData = await db('plays')
      .where({ gid: gameId, pn: currentPlay })
      .first();
    
    if (!currentPlayData) {
      return null;
    }
    
    // Fetch next play data
    const nextPlayData = await db('plays')
      .where({ gid: gameId })
      .where('pn', '>', currentPlay)
      .orderBy('pn', 'asc')
      .first();
    
    if (!nextPlayData) {
      return null;
    }
    
    return new SubstitutionDetector(gameId, sessionId, currentPlayData, nextPlayData);
  }
}