import Handlebars from 'handlebars';
import { BaseballState } from '../../../common/types/BaseballTypes';

// Register custom helpers if needed
Handlebars.registerHelper('inningDisplay', (inning: number) => {
  if (inning === 1) return '1st';
  if (inning === 2) return '2nd';
  if (inning === 3) return '3rd';
  return `${inning}th`;
});

// Template for initializing a game
export const initGameTemplate = Handlebars.compile(`
Game {{gameId}} is starting between the {{visitors.displayName}} and the {{home.displayName}}.
The {{visitors.displayName}} are batting first with {{visitors.lineup.[0].firstName}} {{visitors.lineup.[0].lastName}} leading off.
{{home.currentPitcher}} is on the mound for the {{home.displayName}}.

{{#with firstPlay}}
First play details:
{{this}}
{{/with}}
`);

// Template for the next play
export const nextPlayTemplate = Handlebars.compile(`
Game state: {{inningDisplay inning}} inning, {{#if isTopInning}}top{{else}}bottom{{/if}} half with {{outs}} out(s).
{{#if onFirst}}Runner on first: {{onFirst}}. {{/if}}
{{#if onSecond}}Runner on second: {{onSecond}}. {{/if}}
{{#if onThird}}Runner on third: {{onThird}}. {{/if}}

{{batterTeam}} batting with {{batter.firstName}} {{batter.lastName}} at the plate against {{pitcher.firstName}} {{pitcher.lastName}}.

Previous play: {{lastPlayIndex}}
Current play details:
{{playDetails}}

Describe this play in a natural, engaging baseball announcer style. Include relevant details about the current game situation, the players involved, and the outcome of the play.
`);

// Function to generate the init game prompt
export function generateInitGamePrompt(gameState: BaseballState, firstPlay: any): string {
  return initGameTemplate({
    gameId: gameState.gameId,
    visitors: gameState.visitors,
    home: gameState.home,
    firstPlay: JSON.stringify(firstPlay, null, 2)
  });
}

// Function to generate the next play prompt
export function generateNextPlayPrompt(
  gameState: BaseballState, 
  nextPlay: any, 
  lastPlayIndex: number
): string {
  // Determine current batter and pitcher
  const isTopInning = gameState.game.isTopInning;
  const batterTeam = isTopInning ? gameState.visitors.displayName : gameState.home.displayName;
  const pitcherTeam = isTopInning ? gameState.home.displayName : gameState.visitors.displayName;
  
  // Find current batter in lineup
  const battingTeam = isTopInning ? gameState.visitors : gameState.home;
  const currentBatterName = battingTeam.currentBatter;
  const batter = battingTeam.lineup.find(player => 
    `${player.lastName}` === currentBatterName || 
    `${player.firstName} ${player.lastName}` === currentBatterName
  ) || { firstName: '', lastName: currentBatterName || '' };
  
  // Get current pitcher
  const fieldingTeam = isTopInning ? gameState.home : gameState.visitors;
  const pitcherName = fieldingTeam.currentPitcher;
  // Assuming pitcher name format is "FirstName LastName"
  const pitcherParts = pitcherName.split(' ');
  const pitcher = { 
    firstName: pitcherParts.length > 1 ? pitcherParts[0] : '', 
    lastName: pitcherParts.length > 1 ? pitcherParts.slice(1).join(' ') : pitcherName 
  };

  return nextPlayTemplate({
    inning: gameState.game.inning,
    isTopInning: gameState.game.isTopInning,
    outs: gameState.game.outs,
    onFirst: gameState.game.onFirst || '',
    onSecond: gameState.game.onSecond || '',
    onThird: gameState.game.onThird || '',
    batterTeam,
    pitcherTeam,
    batter,
    pitcher,
    lastPlayIndex,
    playDetails: JSON.stringify(nextPlay, null, 2)
  });
}
