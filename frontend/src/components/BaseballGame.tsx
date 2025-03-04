"use client"

import { useState } from "react"
import "./BaseballGame.css"

function BaseballGame() {
  const [gameLog, setGameLog] = useState([
    "Hamilton hits a hard ground ball to the first baseman.",
    "Mize steps on first for the out.",
  ])

  const currentBatter = "Hamilton"
  
  // Define team lineups as arrays of objects
  const heroesLineup = [
    { position: "LF", name: "Hamilton" },
    { position: "1B", name: "Delahanty" },
    { position: "RF", name: "Klein" },
    { position: "CF", name: "Ott" },
    { position: "3B", name: "Hornsby" },
    { position: "C", name: "Hartnett" },
    { position: "SS", name: "Wagner" },
    { position: "2B", name: "Frisch" },
    { position: "P", name: "Brown" }
  ]
  
  const starsLineup = [
    { position: "3B", name: "Robinson" },
    { position: "1B", name: "Mize" },
    { position: "LF", name: "Musial" },
    { position: "CF", name: "Mays" },
    { position: "RF", name: "Aaron" },
    { position: "C", name: "Campanella" },
    { position: "2B", name: "Morgan" },
    { position: "SS", name: "Reese" },
    { position: "P", name: "Gibson" }
  ]

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
                  <span key={inning} className="inning-number">
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
              <div className="team-row">
                <span className="team-name">HEROES</span>
                <div className="innings-container">
                  {Array(9)
                    .fill(0)
                    .map((_, i) => (
                      <span key={i} className="score">
                        0
                      </span>
                    ))}
                </div>
                <div className="stats-container">
                  <span className="score">0</span>
                  <span className="score">0</span>
                  <span className="score">0</span>
                </div>
              </div>
              <div className="team-row">
                <span className="team-name">STARS</span>
                <div className="innings-container">
                  {Array(9)
                    .fill(0)
                    .map((_, i) => (
                      <span key={i} className="score">
                        0
                      </span>
                    ))}
                </div>
                <div className="stats-container">
                  <span className="score">0</span>
                  <span className="score">0</span>
                  <span className="score">0</span>
                </div>
              </div>
            </div>

            <div className="game-info">
              <div className="pitching-info">
                <span className="label">Pitching: </span>
                <span className="value">Bob Gibson</span>
                <span className="out-indicator">OUT 0</span>
              </div>

              <div className="batting-info">
                <span className="label">Batting : </span>
                <span className="value">{currentBatter}</span>
              </div>
            </div>
          </div>

          {/* Right panel - Team Lineups (Blue background) */}
          <div className="lineup-panel">
            <div className="lineup-grid">
              <div className="team-column">
                <div className="lineup-team-name">Heroes</div>
                <div className="player-list">
                  {heroesLineup.map((player, index) => (
                    <div 
                      key={index} 
                      className={`player-row ${currentBatter === player.name ? "current-batter" : ""}`}
                    >
                      <span className="position">{player.position}</span>
                      <span className="player-name">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="team-column">
                <div className="lineup-team-name">Stars</div>
                <div className="player-list">
                  {starsLineup.map((player, index) => (
                    <div key={index} className="player-row">
                      <span className="position">{player.position}</span>
                      <span className="player-name">{player.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - Game Log */}
        <div className="game-log">
          {gameLog.map((log, index) => (
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

