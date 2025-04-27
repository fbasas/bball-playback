"use client"

import { BaseballState } from "../types/BaseballTypes"
import "./Scoreboard.css"

interface ScoreboardProps {
  gameState: BaseballState;
  teams: {
    home: {
      id: string;
      displayName: string;
      shortName: string;
    };
    away: {
      id: string;
      displayName: string;
      shortName: string;
    };
  };
  isTopInning: boolean;
  currentInning: number;
  battingTeam: {
    id: string;
    displayName: string;
    shortName: string;
  };
  currentBatter: string;
  currentPitcherName: string;
}

export default function Scoreboard({
  gameState,
  teams,
  isTopInning,
  currentInning,
  battingTeam,
  currentBatter,
  currentPitcherName
}: ScoreboardProps) {
  return (
    <div className="scoreboard">
      {/* Innings row */}
      <div className="innings-row">
        <div className="team-name-spacer"></div>
        <div className="innings-container">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((inning) => (
            <span 
              key={inning} 
              className={`inning-number ${inning === currentInning ? "current-inning" : ""}`}
            >
              {inning}
            </span>
          ))}
        </div>
        <div className="stats-container" data-testid="stats-container">
          {["R", "H", "E"].map((stat) => (
            <span key={stat} className="stat-label">
              {stat}
            </span>
          ))}
        </div>
      </div>

      {/* Teams and scores */}
      <div className="teams-container">
        <div className={`team-row ${battingTeam.id === teams.away.id ? "batting-team" : ""}`}>
          <span className="team-name">{teams.away.displayName}</span>
          <div className="innings-container">
            {gameState.visitors.stats.innings.map((score: number, i: number) => (
              <span key={i} className="score">
                {score}
              </span>
            ))}
          </div>
          <div className="stats-container" data-testid="stats-container">
            <span className="score">{gameState.visitors.stats.runs}</span>
            <span className="score">{gameState.visitors.stats.hits}</span>
            <span className="score">{gameState.visitors.stats.errors}</span>
          </div>
        </div>
        <div className={`team-row ${battingTeam.id === teams.home.id ? "batting-team" : ""}`}>
          <span className="team-name">{teams.home.displayName}</span>
          <div className="innings-container">
            {gameState.home.stats.innings.map((score: number, i: number) => (
              <span key={i} className="score">
                {score}
              </span>
            ))}
          </div>
          <div className="stats-container" data-testid="stats-container">
            <span className="score">{gameState.home.stats.runs}</span>
            <span className="score">{gameState.home.stats.hits}</span>
            <span className="score">{gameState.home.stats.errors}</span>
          </div>
        </div>
      </div>

      <div className="game-info">
        <div className="pitching-and-batting-info">
          <span className="label">Pitching: </span>
          <span className="value">{currentPitcherName}</span>
          <div/>
          <span className="label">Batting : </span>
          <span className="value">{currentBatter}</span>
        </div>

        <div className="inning-and-outs-info">
          <span className="label">Inning: </span>
          <span className="value">{isTopInning ? "TOP" : "BOT"} {currentInning}</span>
          <div/>
          <span className="label">Out: </span>
          <span className="value">{gameState.game.outs}</span>
        </div>

        <div className="base-runners-info">
          <div className="base-runner-row">
            <span className="label">1st: </span>
            <span className="value">{gameState.game.onFirst || "Empty"}</span>
          </div>
          <div className="base-runner-row">
            <span className="label">2nd: </span>
            <span className="value">{gameState.game.onSecond || "Empty"}</span>
          </div>
          <div className="base-runner-row">
            <span className="label">3rd: </span>
            <span className="value">{gameState.game.onThird || "Empty"}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 