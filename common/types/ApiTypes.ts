/**
 * Types for API requests and responses
 */

import { BaseballState } from './BaseballTypes';
import { PlayData } from './PlayData';

/**
 * CreateGame endpoint types
 */
export interface CreateGameRequest {
    homeTeamId: string;
    visitingTeamId: string;
}

export interface CreateGameResponse {
    gameId: string;
    sessionId: string;
    gameState: BaseballState;
}

/**
 * GameInfo endpoint types
 */
export interface TeamInfo {
    id: string;
    displayName: string;
    shortName: string;
}

export interface GameInfoResponse {
    gameId: string;
    homeTeam: TeamInfo;
    visitingTeam: TeamInfo;
    plays: PlayData[];
}

/**
 * LineupHistory endpoint types
 */
export interface LineupChange {
    id: number;
    gameId: string;
    sessionId: string;
    playIndex: number;
    timestamp: string;
    changes: string; // JSON string of changes
}

export interface LineupHistoryResponse {
    changes: LineupChange[];
}

/**
 * LineupState endpoint types
 */
export interface LineupPlayer {
    playerId: string;
    teamId: string;
    position: string;
    battingOrder: number;
    isCurrentPitcher: boolean;
    isCurrentBatter: boolean;
}

export interface LineupState {
    id: number;
    gameId: string;
    sessionId: string;
    playIndex: number;
    timestamp: string;
    players: LineupPlayer[];
}
