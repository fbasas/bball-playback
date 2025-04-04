import { SimplifiedBaseballState } from '../../../../common/types/SimplifiedBaseballState';
import Handlebars from 'handlebars';

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
  game: {
    inning: number;
    isTopInning: boolean;
    outs: number;
    onFirst: string;
    onSecond: string;
    onThird: string;
    log: string[];
  };
  home: {
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number;
  };
  visitors: {
    displayName: string;
    shortName: string;
    currentBatter: string | null;
    currentPitcher: string | null;
    nextBatter: string | null;
    nextPitcher: string | null;
    runs: number;
  };
  currentPlay: number;
  playDescription?: string;
  eventString?: string;
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
 * Generate a play-by-play commentary prompt for OpenAI based on the current baseball state
 * 
 * @param baseballState - The current baseball state from the next play endpoint
 * @param announcerType - The type of announcer to use (classic, modern, enthusiastic, poetic)
 * @returns A prompt string to send to OpenAI for play-by-play commentary generation
 */
export function generatePlayByPlayPrompt(
  baseballState: SimplifiedBaseballState, 
  announcerType: keyof typeof DEFAULT_ANNOUNCERS = 'classic'
): string {
  // Register Handlebars helpers
  registerHandlebarsHelpers();

  // Create extended state with defaults for missing data
  const extendedState: ExtendedBaseballState = {
    announcer: DEFAULT_ANNOUNCERS[announcerType],
    game: {
      inning: baseballState.game.inning,
      isTopInning: baseballState.game.isTopInning,
      outs: baseballState.game.outs,
      onFirst: baseballState.game.onFirst || '',
      onSecond: baseballState.game.onSecond || '',
      onThird: baseballState.game.onThird || '',
      log: baseballState.game.log || []
    },
    home: {
      displayName: baseballState.home.displayName,
      shortName: baseballState.home.shortName,
      currentBatter: baseballState.home.currentBatter,
      currentPitcher: baseballState.home.currentPitcher,
      nextBatter: baseballState.home.nextBatter,
      nextPitcher: baseballState.home.nextPitcher,
      runs: 0 // Default value, not in the current API response
    },
    visitors: {
      displayName: baseballState.visitors.displayName,
      shortName: baseballState.visitors.shortName,
      currentBatter: baseballState.visitors.currentBatter,
      currentPitcher: baseballState.visitors.currentPitcher,
      nextBatter: baseballState.visitors.nextBatter,
      nextPitcher: baseballState.visitors.nextPitcher,
      runs: 0 // Default value, not in the current API response
    },
    currentPlay: baseballState.currentPlay,
    playDescription: baseballState.playDescription || 'Unknown play',
    eventString: baseballState.eventString || ''
  };

  // Template for the play-by-play prompt
  const promptTemplate = Handlebars.compile(`
You are an experienced baseball announcer providing play-by-play commentary for a baseball game. Use the following game state information to create an engaging, natural-sounding description of the current play in the style of the specified announcer.

# Announcer
- Name: {{announcer.name}}
- Style: {{announcer.style}}
- Catchphrases: {{#each announcer.catchphrases}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- Era: {{announcer.era}}

# Game Situation
- Inning: {{game.inning}}, {{#if game.isTopInning}}Top{{else}}Bottom{{/if}} half
- Outs: {{game.outs}}
- Runners: {{#if game.onFirst}}Runner on first ({{game.onFirst}}){{/if}}{{#if game.onSecond}}{{#if game.onFirst}}, {{/if}}Runner on second ({{game.onSecond}}){{/if}}{{#if game.onThird}}{{#if game.onFirst}}{{#if game.onSecond}}, {{else}}, {{/if}}{{else}}{{#if game.onSecond}}, {{/if}}{{/if}}Runner on third ({{game.onThird}}){{/if}}{{#unless game.onFirst}}{{#unless game.onSecond}}{{#unless game.onThird}}Bases empty{{/unless}}{{/unless}}{{/unless}}
- Score: {{home.displayName}} {{home.runs}}, {{visitors.displayName}} {{visitors.runs}}

# Current Matchup
- At bat: {{#if game.isTopInning}}{{visitors.currentBatter}} ({{visitors.displayName}}){{else}}{{home.currentBatter}} ({{home.displayName}}){{/if}}
- Pitching: {{#if game.isTopInning}}{{home.currentPitcher}} ({{home.displayName}}){{else}}{{visitors.currentPitcher}} ({{visitors.displayName}}){{/if}}

# Play Result
- Play description: {{playDescription}}
- Event code: {{eventString}}

Provide a play-by-play commentary that authentically captures the specified announcer's unique style, catchphrases, and era. Start immediately with describing the current situation (inning, score, outs, runners) and then the action of the play. Do not include any introductory text or phrases like "Here's the play-by-play" or "Let me describe what happened."

Mention the players involved by name and the outcome. Use varied language and authentic baseball terminology that would be appropriate for the announcer's era. Do not simply repeat the play description verbatim. Elaborate on what happened, add color commentary, and make it sound like a real baseball broadcast. Consider the context of the game situation when describing the play. If appropriate for the announcer, incorporate one of their catchphrases naturally into the commentary.
`);

  // Generate the prompt
  return promptTemplate(extendedState).trim();
}

/**
 * Example usage:
 * 
 * // Get the baseball state from the next play endpoint
 * const baseballState = await fetchNextPlay(gameId, currentPlay);
 * 
 * // Generate the play-by-play prompt
 * const prompt = generatePlayByPlayPrompt(baseballState, 'poetic');
 * 
 * // Send the prompt to OpenAI
 * const playByPlay = await generateCompletion(prompt, gameId);
 */