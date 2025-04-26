import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';
import Handlebars from 'handlebars';
import { getLineupStateForPlay } from '../game/lineupTracking';
import { PlayerService } from '../game/player/PlayerService';

/**
 * Announcer profile for play-by-play commentary
 */
interface AnnouncerProfile {
  name: string;
  style: string;
  catchphrases: string[];
  era: string;
}

/**
 * Extended baseball state with additional data needed for play-by-play
 */
interface ExtendedBaseballState {
  announcer: AnnouncerProfile;
  before: {
    inning: number;
    isTopInning: boolean;
    outs: number;
    onFirst: string;
    onSecond: string;
    onThird: string;
    homeRuns: number;
    visitorsRuns: number;
    currentBatter: string | null;
    currentPitcher: string | null;
  };
  after: {
    inning: number;
    isTopInning: boolean;
    outs: number;
    onFirst: string;
    onSecond: string;
    onThird: string;
    homeRuns: number;
    visitorsRuns: number;
    nextBatter: string | null;
    currentPitcher: string | null;
  };
  home: {
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number;
    lineup: Array<{
      name: string;
      position: string;
      battingOrder: number;
    }>;
  };
  visitors: {
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number;
    lineup: Array<{
      name: string;
      position: string;
      battingOrder: number;
    }>;
  };
  currentPlay: number;
  playDescription?: string;
  eventString?: string;
  log: string[];
}

/**
 * Default announcer profiles that can be used
 */
const DEFAULT_ANNOUNCERS: Record<string, AnnouncerProfile> = {
  'classic': {
    name: 'Bob Costas',
    style: 'Professional, precise, knowledgeable, balanced',
    catchphrases: [
      'How about that!', 
      'He\'s done it again!', 
      'That\'s one for the highlight reel'
    ],
    era: '1980s-2010s'
  },
  'modern': {
    name: 'Joe Buck',
    style: 'Energetic, concise, dramatic, modern',
    catchphrases: [
      'Back at the wall...', 
      'We will see you tomorrow night!', 
      'Unbelievable!'
    ],
    era: '1990s-Present'
  },
  'enthusiastic': {
    name: 'Harry Caray',
    style: 'Enthusiastic, folksy, passionate, fan-like',
    catchphrases: [
      'Holy Cow!', 
      'It might be, it could be, it IS! A home run!', 
      'Cubs win! Cubs win!'
    ],
    era: '1940s-1990s'
  },
  'poetic': {
    name: 'Vin Scully',
    style: 'Eloquent, poetic, storytelling, detailed, conversational',
    catchphrases: [
      'Pull up a chair and spend the afternoon', 
      'In a year that has been so improbable, the impossible has happened!', 
      'It\'s time for Dodger baseball!'
    ],
    era: '1950s-2010s'
  }
};

/**
 * Register Handlebars helpers
 */
function registerHandlebarsHelpers() {
  // Helper to check if a value is truthy
  Handlebars.registerHelper('if', function(this: any, conditional, options) {
    if (conditional) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });

  // Helper to check if a value is falsy
  Handlebars.registerHelper('unless', function(this: any, conditional, options) {
    if (!conditional) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  });
}

/**
 * Generate a play-by-play commentary prompt for OpenAI based on the baseball state before and after a play
 *
 * @param afterState - The baseball state after the play
 * @param beforeState - The baseball state before the play (optional, will use afterState as fallback)
 * @param announcerType - The type of announcer to use (classic, modern, enthusiastic, poetic)
 * @returns A prompt string to send to OpenAI for play-by-play commentary generation
 */
export async function generatePlayByPlayPrompt(
  afterState: SimplifiedBaseballState,
  beforeState: SimplifiedBaseballState | null = null,
  announcerType: keyof typeof DEFAULT_ANNOUNCERS = 'classic'
): Promise<string> {
  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Debug log the input state
  console.log('[PROMPT] Input baseball state (after):', JSON.stringify({
    gameId: afterState.gameId,
    home: {
      displayName: afterState.home.displayName,
      shortName: afterState.home.shortName,
      runs: afterState.home.runs
    },
    visitors: {
      displayName: afterState.visitors.displayName,
      shortName: afterState.visitors.shortName,
      runs: afterState.visitors.runs
    }
  }, null, 2));

  // If beforeState is not provided, use afterState as a fallback
  const stateBeforePlay = beforeState || afterState;

  // Create extended state with defaults for missing data
  const extendedState: ExtendedBaseballState = {
    announcer: DEFAULT_ANNOUNCERS[announcerType],
    before: {
      inning: stateBeforePlay.game.inning,
      isTopInning: stateBeforePlay.game.isTopInning,
      outs: stateBeforePlay.game.outs,
      onFirst: stateBeforePlay.game.onFirst || '',
      onSecond: stateBeforePlay.game.onSecond || '',
      onThird: stateBeforePlay.game.onThird || '',
      homeRuns: stateBeforePlay.home.runs,
      visitorsRuns: stateBeforePlay.visitors.runs,
      currentBatter: stateBeforePlay.game.isTopInning ?
        stateBeforePlay.visitors.currentBatter :
        stateBeforePlay.home.currentBatter,
      currentPitcher: stateBeforePlay.game.isTopInning ?
        stateBeforePlay.home.currentPitcher :
        stateBeforePlay.visitors.currentPitcher
    },
    after: {
      inning: afterState.game.inning,
      isTopInning: afterState.game.isTopInning,
      outs: afterState.game.outs,
      onFirst: afterState.game.onFirst || '',
      onSecond: afterState.game.onSecond || '',
      onThird: afterState.game.onThird || '',
      homeRuns: afterState.home.runs,
      visitorsRuns: afterState.visitors.runs,
      nextBatter: afterState.game.isTopInning ?
        afterState.visitors.nextBatter :
        afterState.home.nextBatter,
      currentPitcher: afterState.game.isTopInning ?
        afterState.home.currentPitcher :
        afterState.visitors.currentPitcher
    },
    home: {
      displayName: afterState.home.displayName,
      shortName: afterState.home.shortName,
      currentBatter: afterState.home.currentBatter,
      currentPitcher: afterState.home.currentPitcher,
      nextBatter: afterState.home.nextBatter,
      nextPitcher: afterState.home.nextPitcher,
      runs: afterState.home.runs,
      lineup: [] // Will be populated below
    },
    visitors: {
      displayName: afterState.visitors.displayName,
      shortName: afterState.visitors.shortName,
      currentBatter: afterState.visitors.currentBatter,
      currentPitcher: afterState.visitors.currentPitcher,
      nextBatter: afterState.visitors.nextBatter,
      nextPitcher: afterState.visitors.nextPitcher,
      runs: afterState.visitors.runs,
      lineup: [] // Will be populated below
    },
    currentPlay: afterState.currentPlay,
    playDescription: afterState.playDescription || 'Unknown play',
    eventString: afterState.eventString || '',
    log: afterState.game.log || []
  };

  // Debug log the extended state
  console.log('[PROMPT] Extended state team info:', JSON.stringify({
    home: {
      displayName: extendedState.home.displayName,
      shortName: extendedState.home.shortName,
      runs: extendedState.home.runs
    },
    visitors: {
      displayName: extendedState.visitors.displayName,
      shortName: extendedState.visitors.shortName,
      runs: extendedState.visitors.runs
    }
  }, null, 2));

  try {
    // Get the lineup state for the current play
    const lineupState = await getLineupStateForPlay(
      afterState.gameId,
      afterState.sessionId,
      afterState.currentPlay
    );

    if (lineupState) {
      // Get player names
      const playerIds = lineupState.players.map(p => p.playerId);
      const playerMap = await PlayerService.getPlayersByIds(playerIds);

      // Get home and visiting team players
      const homeTeamPlayers = lineupState.players.filter(p => p.teamId === afterState.home.id);
      const visitingTeamPlayers = lineupState.players.filter(p => p.teamId === afterState.visitors.id);

      // Populate home team lineup
      extendedState.home.lineup = homeTeamPlayers
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map(player => {
          const playerInfo = playerMap.get(player.playerId);
          return {
            name: playerInfo ? playerInfo.fullName : player.playerId,
            position: player.position,
            battingOrder: player.battingOrder
          };
        });

      // Populate visiting team lineup
      extendedState.visitors.lineup = visitingTeamPlayers
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map(player => {
          const playerInfo = playerMap.get(player.playerId);
          return {
            name: playerInfo ? playerInfo.fullName : player.playerId,
            position: player.position,
            battingOrder: player.battingOrder
          };
        });
    }
  } catch (error) {
    console.error('Error fetching lineup information:', error);
    // Continue with empty lineups if there's an error
  }

  // Template for the play-by-play prompt
  const promptTemplate = Handlebars.compile(`
You are an experienced baseball announcer providing play-by-play commentary for a baseball game. Use the following game state information to create an engaging, natural-sounding description of the current play in the style of the specified announcer.

# Announcer
- Name: {{announcer.name}}
- Style: {{announcer.style}}
- Catchphrases: {{#each announcer.catchphrases}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Era: {{announcer.era}}

# State Before Play
- Inning: {{before.inning}}, {{#if before.isTopInning}}Top{{else}}Bottom{{/if}} half
- Outs: {{before.outs}}
- Runners: {{#if before.onFirst}}Runner on first ({{before.onFirst}}){{/if}}{{#if before.onSecond}}{{#if before.onFirst}}, {{/if}}Runner on second ({{before.onSecond}}){{/if}}{{#if before.onThird}}{{#if before.onFirst}}{{#if before.onSecond}}, {{else}}, {{/if}}{{else}}{{#if before.onSecond}}, {{/if}}{{/if}}Runner on third ({{before.onThird}}){{/if}}{{#unless before.onFirst}}{{#unless before.onSecond}}{{#unless before.onThird}}Bases empty{{/unless}}{{/unless}}{{/unless}}
- Score: {{home.displayName}} {{before.homeRuns}}, {{visitors.displayName}} {{before.visitorsRuns}}
- Batter: {{before.currentBatter}} ({{#if before.isTopInning}}{{visitors.displayName}}{{else}}{{home.displayName}}{{/if}})
- Pitcher: {{before.currentPitcher}} ({{#if before.isTopInning}}{{home.displayName}}{{else}}{{visitors.displayName}}{{/if}})

# State After Play
- Inning: {{after.inning}}, {{#if after.isTopInning}}Top{{else}}Bottom{{/if}} half
- Outs: {{after.outs}}
- Runners: {{#if after.onFirst}}Runner on first ({{after.onFirst}}){{/if}}{{#if after.onSecond}}{{#if after.onFirst}}, {{/if}}Runner on second ({{after.onSecond}}){{/if}}{{#if after.onThird}}{{#if after.onFirst}}{{#if after.onSecond}}, {{else}}, {{/if}}{{else}}{{#if after.onSecond}}, {{/if}}{{/if}}Runner on third ({{after.onThird}}){{/if}}{{#unless after.onFirst}}{{#unless after.onSecond}}{{#unless after.onThird}}Bases empty{{/unless}}{{/unless}}{{/unless}}
- Score: {{home.displayName}} {{after.homeRuns}}, {{visitors.displayName}} {{after.visitorsRuns}}
- Next batter: {{after.nextBatter}} ({{#if after.isTopInning}}{{visitors.displayName}}{{else}}{{home.displayName}}{{/if}})
- Pitcher: {{after.currentPitcher}} ({{#if after.isTopInning}}{{home.displayName}}{{else}}{{visitors.displayName}}{{/if}})

# Team Lineups
## {{home.displayName}} Lineup:
{{#each home.lineup}}
- {{battingOrder}}. {{name}} ({{position}})
{{/each}}

## {{visitors.displayName}} Lineup:
{{#each visitors.lineup}}
- {{battingOrder}}. {{name}} ({{position}})
{{/each}}

# Play Result
- Play description: {{playDescription}}
- Event code: {{eventString}}

Provide a play-by-play commentary that authentically captures the specified announcer's unique style, catchphrases, and era. Start by describing the state before the play (inning, score, outs, runners, batter, pitcher), then describe the action of the play, and finally mention the state after the play. Do not include any introductory text or phrases like "Here's the play-by-play" or "Let me describe what happened."

Mention the players involved by name and the outcome. Use varied language and authentic baseball terminology that would be appropriate for the announcer's era. Do not simply repeat the play description verbatim. Elaborate on what happened, add color commentary, and make it sound like a real baseball broadcast. Consider the context of the game situation when describing the play. If appropriate for the announcer, incorporate one of their catchphrases naturally into the commentary.
`);

  // Generate the prompt
  return promptTemplate(extendedState).trim();
}

/**
 * Example usage:
 *
 * // Get the baseball states from the next play endpoint
 * const afterState = await fetchNextPlay(gameId, currentPlay);
 * const beforeState = await fetchPreviousState(gameId, currentPlay);
 *
 * // Generate the play-by-play prompt with both states
 * const prompt = generatePlayByPlayPrompt(afterState, beforeState, 'poetic');
 *
 * // Send the prompt to OpenAI
 * const playByPlay = await generateCompletion(prompt, gameId);
 */