import Handlebars from 'handlebars';
import { db } from '../../config/database';

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
export async function generateLineupAnnouncementPrompt(gameId: string): Promise<string> {
  try {
    // Query the database to get game information
    const gameInfo = await db('gameinfo')
      .where({ gid: gameId })
      .first();
    
    if (!gameInfo) {
      throw new Error(`Game information not found for game ID: ${gameId}`);
    }
    
    // Get home team information
    const homeTeam = await db('teams')
      .where({ team: gameInfo.hometeam })
      .first();
    
    // Get visiting team information
    const visitingTeam = await db('teams')
      .where({ team: gameInfo.visteam })
      .first();
    
    // Get home team lineup from teamstats table
    const homeTeamStats = await db('teamstats')
      .where({ 
        gid: gameId,
        team: gameInfo.hometeam
      })
      .first();
    
    // Get visiting team lineup from teamstats table
    const visitingTeamStats = await db('teamstats')
      .where({ 
        gid: gameId,
        team: gameInfo.visteam
      })
      .first();
    
    if (!homeTeamStats || !visitingTeamStats) {
      throw new Error(`Team stats not found for game ID: ${gameId}`);
    }
    
    // Map position codes to position names
    const positionMap: Record<string, string> = {
      '1': 'P', // Pitcher
      '2': 'C', // Catcher
      '3': '1B', // First Base
      '4': '2B', // Second Base
      '5': '3B', // Third Base
      '6': 'SS', // Shortstop
      '7': 'LF', // Left Field
      '8': 'CF', // Center Field
      '9': 'RF', // Right Field
      '10': 'DH' // Designated Hitter
    };
    
    // Map field positions to player IDs for home team
    const homeFieldPositions = new Map<string, string>();
    for (let i = 1; i <= 9; i++) {
      const positionCode = String(i);
      const playerId = homeTeamStats[`start_f${i}`];
      if (playerId) {
        homeFieldPositions.set(playerId, positionCode);
      }
    }
    
    // Map field positions to player IDs for visiting team
    const visitingFieldPositions = new Map<string, string>();
    for (let i = 1; i <= 9; i++) {
      const positionCode = String(i);
      const playerId = visitingTeamStats[`start_f${i}`];
      if (playerId) {
        visitingFieldPositions.set(playerId, positionCode);
      }
    }
    
    // Build home team lineup in batting order
    const homeLineup = [];
    for (let i = 1; i <= 9; i++) {
      const playerId = homeTeamStats[`start_l${i}`];
      
      if (playerId) {
        // Get player information from allplayers table
        const player = await db('allplayers')
          .where({ id: playerId })
          .first();
        
        if (player) {
          // Get the player's field position
          const positionCode = homeFieldPositions.get(playerId);
          const position = positionCode ? (positionMap[positionCode] || positionCode) : 'Unknown';
          
          homeLineup.push({
            battingOrder: i,
            position,
            firstName: player.first || '',
            lastName: player.last || ''
          });
        }
      }
    }
    
    // Build visiting team lineup in batting order
    const visitingLineup = [];
    for (let i = 1; i <= 9; i++) {
      const playerId = visitingTeamStats[`start_l${i}`];
      
      if (playerId) {
        // Get player information from allplayers table
        const player = await db('allplayers')
          .where({ id: playerId })
          .first();
        
        if (player) {
          // Get the player's field position
          const positionCode = visitingFieldPositions.get(playerId);
          const position = positionCode ? (positionMap[positionCode] || positionCode) : 'DH';
          
          visitingLineup.push({
            battingOrder: i,
            position,
            firstName: player.first || '',
            lastName: player.last || ''
          });
        }
      }
    }
    
    // Get home team pitcher (position code 1)
    const homePitcherId = homeTeamStats['start_f1'];
    let homePitcher = homeLineup.find(player => player.position === 'P');
    
    // If pitcher not found in lineup (e.g., in leagues with DH), get pitcher info directly
    if (!homePitcher && homePitcherId) {
      const player = await db('allplayers')
        .where({ id: homePitcherId })
        .first();
      
      if (player) {
        homePitcher = {
          battingOrder: 0, // Pitcher might not be in the batting order (e.g., in leagues with DH)
          position: 'P',
          firstName: player.first || '',
          lastName: player.last || ''
        };
      }
    }
    
    // Get visiting team pitcher (position code 1)
    const visitingPitcherId = visitingTeamStats['start_f1'];
    let visitingPitcher = visitingLineup.find(player => player.position === 'P');
    
    // If pitcher not found in lineup (e.g., in leagues with DH), get pitcher info directly
    if (!visitingPitcher && visitingPitcherId) {
      const player = await db('allplayers')
        .where({ id: visitingPitcherId })
        .first();
      
      if (player) {
        visitingPitcher = {
          battingOrder: 0, // Pitcher might not be in the batting order (e.g., in leagues with DH)
          position: 'P',
          firstName: player.first || '',
          lastName: player.last || ''
        };
      }
    }
    
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
    // Fallback to basic template if database query fails
    return `Announce the starting lineups for a baseball game in an engaging way.`;
  }
}
