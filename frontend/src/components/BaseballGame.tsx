"use client"

import { useState, useEffect, KeyboardEvent } from "react"
import "./BaseballGame.css"
import { getFullName, BaseballState, Player } from "../types/BaseballTypes"
import { initialBaseballState } from "../data/initialBaseballState"
import TypedText from "./TypedText"

function BaseballGame() {
  // Combined game state object suitable for REST API
  const [gameState, setGameState] = useState<BaseballState>(initialBaseballState);

  // Create a teams object for convenience
  const teams = {
    home: {
      id: gameState.home.id,
      displayName: gameState.home.displayName,
      shortName: gameState.home.shortName
    },
    away: {
      id: gameState.visitors.id,
      displayName: gameState.visitors.displayName,
      shortName: gameState.visitors.shortName
    }
  };

  // Derived values for convenience
  const isTopInning = gameState.game.isTopInning
  const currentInning = gameState.game.inning
  const battingTeam = isTopInning ? teams.away : teams.home
  
  // Get current batter and pitcher full names
  const currentBatterLastName = isTopInning ? 
    gameState.visitors.currentBatter(isTopInning) : 
    gameState.home.currentBatter(isTopInning)
    
  // Find the current batter's full information
  const currentBatterTeam = isTopInning ? gameState.visitors : gameState.home
  const currentBatterInfo = currentBatterTeam.lineup.find(
    (player: Player) => player.lastName === currentBatterLastName
  )
  
  // Get the full name of the current batter if found
  const currentBatter = currentBatterInfo ? 
    getFullName(currentBatterInfo.firstName, currentBatterInfo.lastName) : 
    currentBatterLastName || ""

  // Get the current pitcher's name
  const currentPitcherName = isTopInning ? 
    gameState.home.currentPitcher(isTopInning) : 
    gameState.visitors.currentPitcher(isTopInning)

  // Function to handle the next play action
  const handleNextPlay = () => {
    // Don't add new entries while typing is in progress
    if (!isTypingComplete) return;
    
    // For now, just add a log entry to demonstrate functionality
    const newLog = [...gameState.game.log, `New play at ${new Date().toLocaleTimeString()}`];
    
    setGameState(prevState => ({
      ...prevState,
      game: {
        ...prevState.game,
        log: newLog
      }
    }));
  };

  // State to track the most recent log entry for typing animation
  const [currentLogEntry, setCurrentLogEntry] = useState<string>("");
  const [isTypingComplete, setIsTypingComplete] = useState(true);
  
  // Update the current log entry when the log changes
  useEffect(() => {
    if (gameState.game.log.length > 0) {
      const latestEntry = gameState.game.log[gameState.game.log.length - 1];
      setCurrentLogEntry(latestEntry);
      setIsTypingComplete(false);
    }
  }, [gameState.game.log.length]);

  // Handle typing completion
  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  // Add keyboard event listener for Enter key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent<Document>) => {
      if (event.key === 'Enter') {
        handleNextPlay();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown as any);

    // Clean up
    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [gameState, isTypingComplete]); // Re-add listener when gameState or typing state changes

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
                  {gameState.home.stats.innings.map((score: number, i: number) => (
                    <span key={i} className="score">
                      {score}
                    </span>
                  ))}
                </div>
                <div className="stats-container">
                  <span className="score">{gameState.home.stats.runs}</span>
                  <span className="score">{gameState.home.stats.hits}</span>
                  <span className="score">{gameState.home.stats.errors}</span>
                </div>
              </div>
              <div className={`team-row ${battingTeam.id === teams.away.id ? "batting-team" : ""}`}>
                <span className="team-name">{teams.away.displayName}</span>
                <div className="innings-container">
                  {gameState.visitors.stats.innings.map((score: number, i: number) => (
                    <span key={i} className="score">
                      {score}
                    </span>
                  ))}
                </div>
                <div className="stats-container">
                  <span className="score">{gameState.visitors.stats.runs}</span>
                  <span className="score">{gameState.visitors.stats.hits}</span>
                  <span className="score">{gameState.visitors.stats.errors}</span>
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
            </div>
          </div>

          {/* Right panel - Team Lineups (Blue background) */}
          <div className="lineup-panel">
            <div className="lineup-grid">
              <div className="team-column">
                <div className="lineup-team-name">{teams.home.shortName}</div>
                <div className="player-list">
                  {gameState.home.lineup.map((player: Player, index: number) => (
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
                  {gameState.visitors.lineup.map((player: Player, index: number) => (
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
        <div className="bottom-section">
          <div className="game-log">
            {gameState.game.log.slice(0, -1).map((entry, index) => (
              <div key={index} className="log-entry">
                {entry}
              </div>
            ))}
            {currentLogEntry && (
              <div className="log-entry latest-entry">
                <TypedText 
                  text={currentLogEntry} 
                  typingSpeed={20}
                  className="typed-log-entry"
                  onComplete={handleTypingComplete}
                />
              </div>
            )}
          </div>
        </div>

        {/* Next Play Button */}
        <div className="next-play-container">
          <button 
            className="next-play-button" 
            onClick={handleNextPlay}
            title="Press Enter or click to advance to the next play"
          >
            Next Play
          </button>
        </div>
      </div>
    </div>
  )
}

export default BaseballGame

