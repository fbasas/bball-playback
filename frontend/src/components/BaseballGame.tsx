"use client"

import { useState, useEffect, KeyboardEvent } from "react"
import "./BaseballGame.css"
import { getFullName, BaseballState, Player } from "../types/BaseballTypes"
import { initialBaseballState } from "../data/initialBaseballState"
import TypedText from "./TypedText"
import Scoreboard from "./Scoreboard"
import LineupPanel from "./LineupPanel"

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
    gameState.visitors.currentBatter : 
    gameState.home.currentBatter
    
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
    gameState.home.currentPitcher : 
    gameState.visitors.currentPitcher

  // Function to handle the next play action
  const handleNextPlay = () => {
    // Don't add new entries while typing is in progress
    if (!isTypingComplete) {
      console.log("Typing not complete, ignoring next play");
      return;
    }
    
    console.log("Adding new log entry");
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

  // State to track typing completion
  const [isTypingComplete, setIsTypingComplete] = useState(true);
  
  // State to track how many log entries have been rendered
  const [renderedEntryCount, setRenderedEntryCount] = useState(0);
  
  // Reset the game state when the component mounts
  useEffect(() => {
    // Initialize with initial state
    setGameState(initialBaseballState);
    // Start with no entries rendered
    setRenderedEntryCount(0);
    // Start with typing NOT complete so first entry can begin
    setIsTypingComplete(false);
  }, []);

  // Reset typing state when the log changes
  useEffect(() => {
    if (gameState.game.log.length > 0) {
      // If no entries have been rendered yet, start with the first one
      if (renderedEntryCount === 0) {
        setIsTypingComplete(false);
        setRenderedEntryCount(1);
      }
      // If a new entry was added and we're ready for it
      else if (gameState.game.log.length > renderedEntryCount && isTypingComplete) {
        setIsTypingComplete(false);
        setRenderedEntryCount(prev => prev + 1);
      }
    }
  }, [gameState.game.log.length, renderedEntryCount, isTypingComplete]);

  // Handle typing completion for the current entry
  const handleEntryTypingComplete = () => {
    console.log("Entry typing complete, renderedEntryCount:", renderedEntryCount, "log length:", gameState.game.log.length);
    
    // If there are more entries to show, increment the rendered count and keep typing not complete
    if (renderedEntryCount < gameState.game.log.length) {
      console.log("Moving to next entry");
      setIsTypingComplete(false);
      setRenderedEntryCount(prev => prev + 1);
    } else {
      // All entries have been shown and typed
      console.log("All entries shown, setting isTypingComplete to true");
      setIsTypingComplete(true);
    }
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
          <Scoreboard
            gameState={gameState}
            teams={teams}
            isTopInning={isTopInning}
            currentInning={currentInning}
            battingTeam={battingTeam}
            currentBatter={currentBatter}
            currentPitcherName={currentPitcherName}
          />

          {/* Right panel - Team Lineups (Blue background) */}
          <LineupPanel
            teams={teams}
            gameState={gameState}
            isTopInning={isTopInning}
            currentBatterLastName={currentBatterLastName}
          />
        </div>

        {/* Bottom section - Game Log */}
        <div className="bottom-section">
          <div className="game-log">
            {renderedEntryCount > 0 && gameState.game.log.length > 0 && (
              <TypedText 
                text={gameState.game.log[renderedEntryCount - 1]} 
                typingSpeed={20}
                className="typed-log-entry"
                onComplete={handleEntryTypingComplete}
                clearHistory={false}
                lineDelay={1000}
              />
            )}
          </div>
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
  );
}

export default BaseballGame;

