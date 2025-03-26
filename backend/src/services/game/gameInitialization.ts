import { BaseballState, createEmptyBaseballState, Player } from '../../../../common/types/BaseballTypes';
import { PlayData } from '../../../../common/types/PlayData';
import { db } from '../../config/database';
import { generateCompletion } from '../../services/openai';
import { generateInitGamePrompt } from '../../services/prompts';
import { getLineupData } from '../../services/game/getLineupData';
import { saveInitialLineup } from '../../services/game/lineupTracking';

/**
 * Fetches the first play for a game
 */
export const fetchFirstPlay = async (gameId: string): Promise<PlayData> => {
    const firstPlay = await db('plays')
        .where({ gid: gameId })
        .orderBy('pn', 'asc')
        .first();
    
    if (!firstPlay) {
        throw new Error('No plays found for the specified game ID');
    }
    
    return firstPlay;
};

/**
 * Generates initialization text for a game
 */
export const generateInitializationCompletion = async (
    gameId: string, 
    sessionId: string, 
    skipLLM: boolean
): Promise<string[]> => {
    // Create a prompt using our template
    const prompt = await generateInitGamePrompt({
        ...createEmptyBaseballState(),
        gameId: gameId,
        sessionId: sessionId
    });

    // Generate completion text
    let completionText;
    
    if (skipLLM) {
        // Skip LLM call and use dummy text for testing
        console.log('Skipping LLM call and using dummy response');
        completionText = "This is a dummy response for testing purposes. LLM calls are being skipped.";
    } else {
        // Send the prompt to OpenAI with game ID
        completionText = await generateCompletion(prompt, gameId);
    }

    // Split the completion text by sentence endings to create an array of log entries
    return completionText
        .replace(/([.!?])\s+/g, '$1\n') // Add newlines after sentence endings
        .split('\n')
        .filter(line => line.trim() !== '') // Remove empty lines
        .map(line => line.trim());          // Trim whitespace
};

/**
 * Initializes lineup tracking for a game
 */
export const initializeLineupTracking = async (gameId: string, sessionId: string): Promise<void> => {
    try {
        // Get team stats for the game
        const teamstats = await db('teamstats')
            .where({ gid: gameId })
            .select('team', 'start_l1', 'start_l2', 'start_l3', 'start_l4', 'start_l5', 'start_l6', 'start_l7', 'start_l8', 'start_l9', 'start_f1');
        
        if (!teamstats || teamstats.length !== 2) {
            throw new Error(`Team stats not found for game ID: ${gameId}`);
        }
        
        // Get game info to determine home and visiting teams
        const gameInfo = await db('gameinfo')
            .where({ gid: gameId })
            .first();
        
        if (!gameInfo) {
            throw new Error(`Game information not found for game ID: ${gameId}`);
        }
        
        // Determine which team is home and which is visiting
        const homeTeamData = teamstats.find(t => t.team === gameInfo.hometeam);
        const visitingTeamData = teamstats.find(t => t.team === gameInfo.visteam);
        
        if (!homeTeamData || !visitingTeamData) {
            throw new Error(`Could not determine home and visiting teams for game ID: ${gameId}`);
        }
        
        // Get lineup data for UI display
        const lineupData = await getLineupData(gameId);
        
        // Get player IDs from teamstats
        const homePlayerIds = [
            homeTeamData.start_l1, homeTeamData.start_l2, homeTeamData.start_l3,
            homeTeamData.start_l4, homeTeamData.start_l5, homeTeamData.start_l6,
            homeTeamData.start_l7, homeTeamData.start_l8, homeTeamData.start_l9
        ].filter(Boolean);
        
        const visitingPlayerIds = [
            visitingTeamData.start_l1, visitingTeamData.start_l2, visitingTeamData.start_l3,
            visitingTeamData.start_l4, visitingTeamData.start_l5, visitingTeamData.start_l6,
            visitingTeamData.start_l7, visitingTeamData.start_l8, visitingTeamData.start_l9
        ].filter(Boolean);
        
        // Get player details from allplayers table
        const allPlayerIds = [...homePlayerIds, ...visitingPlayerIds];
        const players = await db('allplayers')
            .whereIn('id', allPlayerIds)
            .select('id', 'first', 'last');
        
        // Create player lookup map
        const playerMap = new Map();
        players.forEach(player => {
            playerMap.set(player.id, {
                firstName: player.first || '',
                lastName: player.last || ''
            });
        });
        
        // Create home team lineup with retrosheet_id
        const homeLineup = homePlayerIds.map((playerId, index) => {
            const player = playerMap.get(playerId);
            if (!player) return null;
            
            return {
                position: lineupData.homeTeam.lineup[index]?.position || 'DH',
                firstName: player.firstName,
                lastName: player.lastName,
                retrosheet_id: playerId
            };
        }).filter(Boolean) as Player[];
        
        // Create visiting team lineup with retrosheet_id
        const visitingLineup = visitingPlayerIds.map((playerId, index) => {
            const player = playerMap.get(playerId);
            if (!player) return null;
            
            return {
                position: lineupData.visitingTeam.lineup[index]?.position || 'DH',
                firstName: player.firstName,
                lastName: player.lastName,
                retrosheet_id: playerId
            };
        }).filter(Boolean) as Player[];
        
        // Initialize lineup tracking
        await saveInitialLineup(
            gameId,
            sessionId,
            {
                id: lineupData.homeTeam.id,
                lineup: homeLineup,
                currentPitcher: lineupData.homeTeam.currentPitcher
            },
            {
                id: lineupData.visitingTeam.id,
                lineup: visitingLineup,
                currentPitcher: lineupData.visitingTeam.currentPitcher
            }
        );
        
        console.log('Lineup tracking initialized successfully');
    } catch (error) {
        console.error('Error initializing lineup tracking:', error);
        // Continue even if lineup tracking initialization fails
    }
};

/**
 * Constructs the initial game state
 */
export const constructInitialGameState = async (
    gameId: string, 
    sessionId: string, 
    firstPlay: PlayData, 
    logEntries: string[]
): Promise<BaseballState> => {
    // Get the lineup data for the game
    const lineupData = await getLineupData(gameId);
    
    // Return a modified version of the initial state with full game data
    return {
        ...createEmptyBaseballState(),
        gameId: gameId,
        sessionId: sessionId,
        game: {
            ...createEmptyBaseballState().game,
            log: logEntries,
            // Add runners on bases from the first play
            onFirst: firstPlay.br1_pre || "",
            onSecond: firstPlay.br2_pre || "",
            onThird: firstPlay.br3_pre || ""
        },
        home: {
            ...createEmptyBaseballState().home,
            id: lineupData.homeTeam.id,
            displayName: lineupData.homeTeam.displayName,
            shortName: lineupData.homeTeam.shortName,
            currentPitcher: lineupData.homeTeam.currentPitcher,
            lineup: lineupData.homeTeam.lineup,
            // Set current batter to null initially for home team
            // It will be set in the frontend based on the current inning
            currentBatter: null
        },
        visitors: {
            ...createEmptyBaseballState().visitors,
            id: lineupData.visitingTeam.id,
            displayName: lineupData.visitingTeam.displayName,
            shortName: lineupData.visitingTeam.shortName,
            currentPitcher: lineupData.visitingTeam.currentPitcher,
            lineup: lineupData.visitingTeam.lineup,
            // Set the first batter in the lineup as the current batter for visitors
            // since the game starts with the visiting team batting
            currentBatter: lineupData.visitingTeam.lineup.length > 0 ? 
                `${lineupData.visitingTeam.lineup[0].firstName} ${lineupData.visitingTeam.lineup[0].lastName}`.trim() : 
                null
        },
        currentPlay: firstPlay.pn,
        gameType: 'replay'
    };
};