import { BaseballState } from '../../../../../common/types/BaseballTypes';
import { SimplifiedBaseballState } from '../../../../../common/types/SimplifiedBaseballState';
import { PlayData } from '../../../../../common/types/PlayData';
import { generateCompletion } from '../../../services/openai';
import { generateNextPlayPrompt, generatePlayByPlayPrompt } from '../../../services/prompts';
import { translateEvent } from '../../../services/eventTranslation';
import { db } from '../../../config/database';

/**
 * Helper function to get a team's display name from the database
 * @param teamId The team ID
 * @returns The team's display name (city + nickname)
 */
async function getTeamDisplayName(teamId: string): Promise<string> {
  try {
    const team = await db('teams').where({ team: teamId }).first();
    if (team) {
      return `${team.city || ''} ${team.nickname || ''}`.trim();
    }
    return teamId === 'NYA' ? 'New York Yankees' : teamId === 'LAN' ? 'Los Angeles Dodgers' : 'Home Team';
  } catch (error) {
    console.error(`Error getting team display name for ${teamId}:`, error);
    return 'Home Team';
  }
}

/**
 * Helper function to get a team's short name from the database
 * @param teamId The team ID
 * @returns The team's short name (nickname)
 */
async function getTeamShortName(teamId: string): Promise<string> {
  try {
    const team = await db('teams').where({ team: teamId }).first();
    if (team) {
      return team.nickname || '';
    }
    return teamId === 'NYA' ? 'Yankees' : teamId === 'LAN' ? 'Dodgers' : 'Home';
  } catch (error) {
    console.error(`Error getting team short name for ${teamId}:`, error);
    return 'Home';
  }
}

/**
 * Type for announcer styles
 */
export type AnnouncerStyle = 'classic' | 'modern' | 'enthusiastic' | 'poetic';

/**
 * Service for generating play-by-play commentary
 */
export class CommentaryService {
  /**
   * Generates play completion text
   * @param currentState The current baseball state
   * @param nextPlay The next play data
   * @param currentPlay The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @returns Array of commentary lines
   */
  public static async generatePlayCompletion(
    currentState: BaseballState,
    nextPlay: PlayData,
    currentPlay: number,
    skipLLM: boolean,
    gameId: string
  ): Promise<string[]> {
    const prompt = generateNextPlayPrompt(currentState, nextPlay, currentPlay);
    
    const completionText = skipLLM
      ? "This is a dummy response for testing purposes. LLM calls are being skipped."
      : await generateCompletion(prompt, { gameId });
    
    return this.formatCompletion(completionText);
  }

  /**
   * Generates a detailed play-by-play completion using the announcer-specific prompt
   * @param currentState The current baseball state
   * @param nextPlay The next play data
   * @param currentPlay The current play index
   * @param skipLLM Whether to skip LLM calls (for testing)
   * @param gameId The game ID
   * @param announcerStyle The announcer style to use
   * @returns Array of commentary lines
   */
  public static async generateDetailedPlayCompletion(
    currentState: BaseballState,
    currentPlay: PlayData, // Renamed from nextPlay to currentPlay for clarity
    currentPlayIndex: number,
    skipLLM: boolean,
    gameId: string,
    announcerStyle: AnnouncerStyle = 'classic'
  ): Promise<string[]> {
    // Create a simplified baseball state from the current state
    const simplifiedState: SimplifiedBaseballState = {
      gameId: currentState.gameId,
      sessionId: currentState.sessionId,
      game: {
        inning: currentState.game.inning,
        isTopInning: currentState.game.isTopInning,
        outs: currentState.game.outs,
        log: currentState.game.log || [],
        onFirst: currentState.game.onFirst || '',
        onSecond: currentState.game.onSecond || '',
        onThird: currentState.game.onThird || ''
      },
      home: {
        id: currentState.home.id,
        displayName: currentState.home.displayName || await getTeamDisplayName(currentState.home.id),
        shortName: currentState.home.shortName || await getTeamShortName(currentState.home.id),
        currentBatter: currentState.home.currentBatter,
        currentPitcher: currentState.home.currentPitcher,
        nextBatter: null,
        nextPitcher: null,
        runs: currentState.home.stats.runs
      },
      visitors: {
        id: currentState.visitors.id,
        displayName: currentState.visitors.displayName || await getTeamDisplayName(currentState.visitors.id),
        shortName: currentState.visitors.shortName || await getTeamShortName(currentState.visitors.id),
        currentBatter: currentState.visitors.currentBatter,
        currentPitcher: currentState.visitors.currentPitcher,
        nextBatter: null,
        nextPitcher: null,
        runs: currentState.visitors.stats.runs
      },
      currentPlay: currentPlayIndex,
      // Use the current play's event for the play description
      playDescription: translateEvent(currentPlay.event || ''),
      eventString: currentPlay.event
    };
    
    // Log the state for debugging
    console.log('[COMMENTARY] SimplifiedBaseballState team info:', JSON.stringify({
      home: {
        displayName: simplifiedState.home.displayName,
        shortName: simplifiedState.home.shortName,
        runs: simplifiedState.home.runs
      },
      visitors: {
        displayName: simplifiedState.visitors.displayName,
        shortName: simplifiedState.visitors.shortName,
        runs: simplifiedState.visitors.runs
      }
    }, null, 2));
    
    // Generate the detailed prompt
    const prompt = await generatePlayByPlayPrompt(simplifiedState, announcerStyle);
    
    const completionText = skipLLM
      ? "This is a dummy response for testing purposes. LLM calls are being skipped."
      : await generateCompletion(prompt, { gameId, announcerStyle });
    
    return this.formatCompletion(completionText);
  }

  /**
   * Formats the completion text into an array of lines
   * @param completionText The raw completion text
   * @returns Array of formatted lines
   */
  private static formatCompletion(completionText: string): string[] {
    return completionText
      .replace(/([.!?])\s+/g, '$1\n')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map(line => line.trim());
  }
}