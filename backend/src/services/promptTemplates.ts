import Handlebars from 'handlebars';
import { BaseballState } from '../../../common/types/BaseballTypes';
import { db } from '../config/database';

// Register custom helpers if needed
Handlebars.registerHelper('inningDisplay', (inning: number) => {
  if (inning === 1) return '1st';
  if (inning === 2) return '2nd';
  if (inning === 3) return '3rd';
  return `${inning}th`;
});

// Template for initializing a game
export const initGameTemplate = Handlebars.compile(`
Describe the setting of a baseball game.

Game Information:
- Date: {{gameDate}}
- Time: {{gameTime}}
- Stadium: {{stadiumName}} in {{stadiumCity}}, {{stadiumState}}
- Home Team: {{homeTeam.city}} {{homeTeam.nickname}}
- Visiting Team: {{visitingTeam.city}} {{visitingTeam.nickname}}
- Weather: {{weather}}
- Temperature: {{temperature}}{{#if temperature}}°F{{/if}}
- Wind: {{windDirection}} at {{windSpeed}} mph
- Sky: {{sky}}
- Field Conditions: {{fieldConditions}}
- Attendance: {{attendance}}
{{#if umpireHome}}
- Umpires: Home Plate - {{umpireHome}}, First Base - {{umpire1b}}, Second Base - {{umpire2b}}, Third Base - {{umpire3b}}
{{/if}}

Describe the scene as the teams take the field. Include details about the stadium, the weather conditions, the teams, and the atmosphere. Set the stage for the game that's about to begin. Do not include any play-by-play action yet - this is just setting the scene before the first pitch.
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
export async function generateInitGamePrompt(gameState: BaseballState): Promise<string> {
  try {
    // Query the database to get game information
    const gameInfo = await db('gameinfo')
      .where({ gid: gameState.gameId })
      .first();
    
    if (!gameInfo) {
      throw new Error(`Game information not found for game ID: ${gameState.gameId}`);
    }
    
    // Get home team information
    const homeTeam = await db('teams')
      .where({ team: gameInfo.hometeam })
      .first();
    
    // Get visiting team information
    const visitingTeam = await db('teams')
      .where({ team: gameInfo.visteam })
      .first();
    
    // Get stadium information
    const stadium = await db('ballparks')
      .where({ site: gameInfo.site })
      .first();
    
    // Get umpire information
    const homeUmpire = gameInfo.umphome ? await db('umpires')
      .where({ id: gameInfo.umphome })
      .first() : null;
    
    const firstBaseUmpire = gameInfo.ump1b ? await db('umpires')
      .where({ id: gameInfo.ump1b })
      .first() : null;
    
    const secondBaseUmpire = gameInfo.ump2b ? await db('umpires')
      .where({ id: gameInfo.ump2b })
      .first() : null;
    
    const thirdBaseUmpire = gameInfo.ump3b ? await db('umpires')
      .where({ id: gameInfo.ump3b })
      .first() : null;
    
    // Format the date and time
    const gameDate = new Date(gameInfo.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const gameTime = gameInfo.starttime 
      ? new Date(`1970-01-01T${gameInfo.starttime}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : (gameInfo.daynight === 'D' ? 'Afternoon' : 'Evening');
    
    // Format weather information
    const weather = [
      gameInfo.sky ? `${gameInfo.sky} skies` : '',
      gameInfo.precip ? `with ${gameInfo.precip}` : ''
    ].filter(Boolean).join(' ') || 'Information not available';
    
    return initGameTemplate({
      gameDate,
      gameTime,
      stadiumName: stadium?.name || 'Unknown Stadium',
      stadiumCity: stadium?.city || gameInfo.site,
      stadiumState: stadium?.state || '',
      homeTeam,
      visitingTeam,
      weather,
      temperature: gameInfo.temp || '',
      windDirection: gameInfo.winddir || 'N/A',
      windSpeed: gameInfo.windspeed || 'N/A',
      sky: gameInfo.sky || 'N/A',
      fieldConditions: gameInfo.fieldcond || 'N/A',
      attendance: gameInfo.attendance?.toLocaleString() || 'N/A',
      umpireHome: homeUmpire ? `${homeUmpire.firstname} ${homeUmpire.lastname}`.trim() : '',
      umpire1b: firstBaseUmpire ? `${firstBaseUmpire.firstname} ${firstBaseUmpire.lastname}`.trim() : '',
      umpire2b: secondBaseUmpire ? `${secondBaseUmpire.firstname} ${secondBaseUmpire.lastname}`.trim() : '',
      umpire3b: thirdBaseUmpire ? `${thirdBaseUmpire.firstname} ${thirdBaseUmpire.lastname}`.trim() : ''
    });
  } catch (error) {
    console.error('Error generating init game prompt:', error);
    // Fallback to basic template if database query fails
    return `Describe the setting of a baseball game in an engaging way.`;
  }
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
