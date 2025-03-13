import Handlebars from 'handlebars';
import { LineupData } from '../game/getLineupData';

// Template for lineup announcements
export const lineupAnnouncementTemplate = Handlebars.compile(`
Announce the starting lineups in an engaging baseball announcer style. Make sure to mention each player's position and batting order.

Home Team Lineup ({{homeTeam.nickname}}):
{{#each homeLineup}}
{{battingOrder}}. {{position}} - {{firstName}} {{lastName}}
{{/each}}
Starting Pitcher: {{homePitcher.firstName}} {{homePitcher.lastName}}

Visiting Team Lineup ({{visitingTeam.nickname}}):
{{#each visitingLineup}}
{{battingOrder}}. {{position}} - {{firstName}} {{lastName}}
{{/each}}
Starting Pitcher: {{visitingPitcher.firstName}} {{visitingPitcher.lastName}}
`
);

// Function to generate the lineup announcement prompt
export function generateLineupAnnouncementPrompt(lineupData: LineupData): string {
  try {
    // Format the lineup data for the template
    const homeLineup = lineupData.homeTeam.lineup.map((player, index) => ({
      battingOrder: index + 1,
      position: player.position,
      firstName: player.firstName,
      lastName: player.lastName
    }));

    const visitingLineup = lineupData.visitingTeam.lineup.map((player, index) => ({
      battingOrder: index + 1,
      position: player.position,
      firstName: player.firstName,
      lastName: player.lastName
    }));

    // Find the pitchers
    const homePitcher = lineupData.homeTeam.lineup.find(player => player.position === 'P') || {
      position: 'P',
      firstName: '',
      lastName: ''
    };

    const visitingPitcher = lineupData.visitingTeam.lineup.find(player => player.position === 'P') || {
      position: 'P',
      firstName: '',
      lastName: ''
    };

    // Format the team data
    const homeTeam = {
      team: lineupData.homeTeam.id,
      name: lineupData.homeTeam.displayName,
      nickname: lineupData.homeTeam.shortName
    };

    const visitingTeam = {
      team: lineupData.visitingTeam.id,
      name: lineupData.visitingTeam.displayName,
      nickname: lineupData.visitingTeam.shortName
    };

    return lineupAnnouncementTemplate({
      homeTeam,
      visitingTeam,
      homeLineup,
      visitingLineup,
      homePitcher,
      visitingPitcher
    });
  } catch (error) {
    console.error('Error generating lineup announcement prompt:', error);
    // Fallback to basic template if there's an error
    return `Announce the starting lineups for a baseball game in an engaging way.`;
  }
}
