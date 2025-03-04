"use client"

import { useState } from "react"
import "./BaseballGame.css"

function BaseballGame() {
  // Team definitions
  const teams = {
    home: {
      id: "heroes",
      displayName: "HEROES",
      shortName: "Heroes"
    },
    away: {
      id: "stars",
      displayName: "STARS",
      shortName: "Stars"
    }
  }

  // Combined game state object suitable for REST API
  const [gameState, setGameState] = useState({
    game: {
      inning: 1,
      isTopInning: true,
      outs: 0,
      log: [
        "Hamilton hits a hard ground ball to the first baseman.",
        "Mize steps on first for the out.",
      ]
    },
    teams: {
      [teams.home.id]: {
        currentPitcher: (isTopInning: boolean) => !isTopInning ? "Bob Gibson" : "Mordecai Brown",
        lineup: [
          { position: "LF", firstName: "Billy", lastName: "Hamilton" },
          { position: "1B", firstName: "Ed", lastName: "Delahanty" },
          { position: "RF", firstName: "Chuck", lastName: "Klein" },
          { position: "CF", firstName: "Mel", lastName: "Ott" },
          { position: "3B", firstName: "Rogers", lastName: "Hornsby" },
          { position: "C", firstName: "Gabby", lastName: "Hartnett" },
          { position: "SS", firstName: "Honus", lastName: "Wagner" },
          { position: "2B", firstName: "Frankie", lastName: "Frisch" },
          { position: "P", firstName: "Mordecai", lastName: "Brown" }
        ],
        stats: {
          innings: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          runs: 0,
          hits: 0,
          errors: 0
        },
        currentBatter: (isTopInning: boolean) => isTopInning ? null : "Hamilton"
      },
      [teams.away.id]: {
        currentPitcher: (isTopInning: boolean) => isTopInning ? "Mordecai Brown" : "Bob Gibson",
        lineup: [
          { position: "3B", firstName: "Brooks", lastName: "Robinson" },
          { position: "1B", firstName: "Johnny", lastName: "Mize" },
          { position: "LF", firstName: "Stan", lastName: "Musial" },
          { position: "CF", firstName: "Willie", lastName: "Mays" },
          { position: "RF", firstName: "Hank", lastName: "Aaron" },
          { position: "C", firstName: "Roy", lastName: "Campanella" },
          { position: "2B", firstName: "Joe", lastName: "Morgan" },
          { position: "SS", firstName: "Pee Wee", lastName: "Reese" },
          { position: "P", firstName: "Bob", lastName: "Gibson" }
        ],
        stats: {
          innings: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          runs: 0,
          hits: 0,
          errors: 0
        },
        currentBatter: (isTopInning: boolean) => isTopInning ? "Hamilton" : null
      }
    }
  })

  // Helper function to get full name
  const getFullName = (firstName: string, lastName: string) => `${firstName} ${lastName}`

  // Derived values for convenience
  const isTopInning = gameState.game.isTopInning
  const currentInning = gameState.game.inning
  const battingTeam = isTopInning ? teams.away : teams.home
  const fieldingTeam = isTopInning ? teams.home : teams.away
  
  // Get current batter and pitcher full names
  const currentBatterLastName = isTopInning ? 
    gameState.teams[teams.away.id].currentBatter(isTopInning) : 
    gameState.teams[teams.home.id].currentBatter(isTopInning)
    
  // Find the current batter's full information
  const currentBatterTeamId = isTopInning ? teams.away.id : teams.home.id
  const currentBatterInfo = gameState.teams[currentBatterTeamId].lineup.find(
    player => player.lastName === currentBatterLastName
  )
  
  // Get the full name of the current batter if found
  const currentBatter = currentBatterInfo ? 
    getFullName(currentBatterInfo.firstName, currentBatterInfo.lastName) : 
    currentBatterLastName || ""
  
  // Get the current pitcher's name
  const currentPitcherName = isTopInning ? 
    gameState.teams[teams.home.id].currentPitcher(isTopInning) : 
    gameState.teams[teams.away.id].currentPitcher(isTopInning)

  return (
    <div className="game-container">
      {/* Main game container with green border */}
      <div className="game-board">
        {/* Top section with scoreboard and lineups */}
        <div className="top-section">
          {/* Left panel - Scoreboard (Red background) */}
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
              <div className="stats-container">
                {["R", "H", "E"].map((stat) => (
                  <span key={stat} className="stat-label">
                    {stat}
                  </span>
                ))}
              </div>
            </div>

            {/* Teams and scores */}
            <div className="teams-container">
              <div className={`team-row ${battingTeam.id === teams.home.id ? "batting-team" : ""}`}>
                <span className="team-name">{teams.home.displayName}</span>
                <div className="innings-container">
                  {gameState.teams[teams.home.id].stats.innings.map((score, i) => (
                    <span key={i} className="score">
                      {score}
                    </span>
                  ))}
                </div>
                <div className="stats-container">
                  <span className="score">{gameState.teams[teams.home.id].stats.runs}</span>
                  <span className="score">{gameState.teams[teams.home.id].stats.hits}</span>
                  <span className="score">{gameState.teams[teams.home.id].stats.errors}</span>
                </div>
              </div>
              <div className={`team-row ${battingTeam.id === teams.away.id ? "batting-team" : ""}`}>
                <span className="team-name">{teams.away.displayName}</span>
                <div className="innings-container">
                  {gameState.teams[teams.away.id].stats.innings.map((score, i) => (
                    <span key={i} className="score">
                      {score}
                    </span>
                  ))}
                </div>
                <div className="stats-container">
                  <span className="score">{gameState.teams[teams.away.id].stats.runs}</span>
                  <span className="score">{gameState.teams[teams.away.id].stats.hits}</span>
                  <span className="score">{gameState.teams[teams.away.id].stats.errors}</span>
                </div>
              </div>
            </div>

            <div className="game-info">
              <div className="pitching-info">
                <span className="label">Pitching: </span>
                <span className="value">{currentPitcherName}</span>
                <span className="out-indicator">OUT {gameState.game.outs}</span>
              </div>

              <div className="batting-info">
                <span className="label">Batting : </span>
                <span className="value">{currentBatter}</span>
                <span className="inning-indicator">{isTopInning ? "TOP" : "BOT"} {currentInning}</span>
              </div>
            </div>
          </div>

          {/* Right panel - Team Lineups (Blue background) */}
          <div className="lineup-panel">
            <div className="lineup-grid">
              <div className="team-column">
                <div className="lineup-team-name">{teams.home.shortName}</div>
                <div className="player-list">
                  {gameState.teams[teams.home.id].lineup.map((player, index) => (
                    <div 
                      key={index} 
                      className={`player-row ${currentBatterLastName === player.lastName ? "current-batter" : ""}`}
                    >
                      <span className="position">{player.position}</span>
                      <span className="player-name">{player.lastName}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="team-column">
                <div className="lineup-team-name">{teams.away.shortName}</div>
                <div className="player-list">
                  {gameState.teams[teams.away.id].lineup.map((player, index) => (
                    <div 
                      key={index}
                      className={`player-row ${currentBatterLastName === player.lastName ? "current-batter" : ""}`}
                    >
                      <span className="position">{player.position}</span>
                      <span className="player-name">{player.lastName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - Game Log */}
        <div className="game-log">
          {gameState.game.log.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BaseballGame

