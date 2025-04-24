"use client"

import { useState, useEffect, KeyboardEvent, useRef } from "react"
import "./BaseballGame.css"
import { getFullName, BaseballState, Player, createEmptyBaseballState } from "../../../common/types/BaseballTypes"
import { config } from "../config/config"
import TypedText from "./TypedText"
import Scoreboard from "./Scoreboard"
import LineupPanel from "./LineupPanel"

function BaseballGame() {
  // Get gameId from URL parameters
  const getGameIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('gameId') || '-1';
  };

  // Status bar visibility state
  const [isStatusBarVisible, setIsStatusBarVisible] = useState(false);
  
  // Announcer style state
  const [announcerStyle, setAnnouncerStyle] = useState<'classic' | 'modern' | 'enthusiastic' | 'poetic'>('classic');
  
  // Generate a session ID if not already set
  const [sessionId] = useState(() => {
    // Generate a random session ID
    return `session-${Math.random().toString(36).substring(2, 15)}`;
  });

  // Combined game state object suitable for REST API
  const [gameState, setGameState] = useState<BaseballState>({
    ...createEmptyBaseballState(),
    gameId: getGameIdFromUrl(),
    sessionId: sessionId
  });

  // API endpoints for game state updates
  const initGameEndpoint = `${config.api.baseUrl}${config.api.endpoints.initGame}`;
  const nextPlayEndpoint = `${config.api.baseUrl}${config.api.endpoints.nextPlay}`;
  const gameId = getGameIdFromUrl();

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

  // Reset the game state when the component mounts
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const response = await fetch(`${initGameEndpoint}/${gameId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'session-id': sessionId
          }
        });

        if (!response.ok) {
          throw new Error('Failed to initialize game state');
        }

        const initialState = await response.json();
        setGameState(initialState);
        setRenderedEntryCount(0);
        setIsTypingComplete(false);
      } catch (error) {
        console.error('Error initializing game state:', error);
        // Fallback to initial state if API call fails
        setGameState({
          ...createEmptyBaseballState(),
          gameId: gameId,
          sessionId: sessionId
        });
        setRenderedEntryCount(0);
        setIsTypingComplete(false);
      }
    };

    initializeGame();
  }, []);

  // State to track typing completion
  const [isTypingComplete, setIsTypingComplete] = useState(true);
  
  // State to track how many log entries have been rendered
  const [renderedEntryCount, setRenderedEntryCount] = useState(0);
  
  // Reference to the game log container
  const gameLogRef = useRef<HTMLDivElement>(null);

  // Function to scroll to bottom of game log
  const scrollToBottom = () => {
    if (gameLogRef.current) {
      gameLogRef.current.scrollTop = gameLogRef.current.scrollHeight;
    }
  };

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
    
    // Scroll to bottom after typing is complete
    scrollToBottom();
    
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

  // Scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  // Scroll to bottom when new entries are added
  useEffect(() => {
    scrollToBottom();
  }, [gameState.game.log.length]);

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

  // Function to handle the next play action
  const handleNextPlay = async () => {
    // Don't add new entries while typing is in progress
    if (!isTypingComplete) {
      console.log("Typing not complete, ignoring next play");
      return;
    }
    
    try {
      const response = await fetch(`${nextPlayEndpoint}/${gameId}?currentPlay=${gameState.currentPlay}&announcerStyle=${announcerStyle}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'session-id': sessionId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update game state');
      }

      const updatedState = await response.json();
      
      // Clear the log panel by resetting the game state with new log entries
      setGameState({
        ...updatedState,
        game: {
          ...updatedState.game,
          log: updatedState.game.log || [], // Ensure log is an array
        }
      });
      
      // Reset the rendered entry count to start fresh
      setRenderedEntryCount(0);
      setIsTypingComplete(false);
    } catch (error) {
      console.error('Error updating game state:', error);
      // For development/demo purposes, just add a dummy log entry
      const newLog = [`New play at ${new Date().toLocaleTimeString()}`];
      
      setGameState(prevState => ({
        ...prevState,
        game: {
          ...prevState.game,
          log: newLog
        }
      }));
      setRenderedEntryCount(0);
      setIsTypingComplete(false);
    }
  };

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
          <div className="game-log" ref={gameLogRef}>
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

        {/* Status Bar */}
        {isStatusBarVisible && (
          <div className="status-bar">
            <div className="status-item">
              Game ID: {gameState.gameId ?? 'undefined'}
            </div>
            {/* More status items will be added here later */}
          </div>
        )}
      </div>

      {/* Control Buttons and Announcer Style Selector */}
      <div className="control-panel">
        {/* Announcer Style Selector */}
        <div className="announcer-style-selector">
          <label htmlFor="announcer-style">Announcer Style:</label>
          <select
            id="announcer-style"
            value={announcerStyle}
            onChange={(e) => setAnnouncerStyle(e.target.value as 'classic' | 'modern' | 'enthusiastic' | 'poetic')}
          >
            <option value="classic">Classic (Bob Costas)</option>
            <option value="modern">Modern (Joe Buck)</option>
            <option value="enthusiastic">Enthusiastic (Harry Caray)</option>
            <option value="poetic">Poetic (Vin Scully)</option>
          </select>
        </div>

        {/* Control Buttons */}
        <div className="control-buttons-container">
        <button 
          className="next-play-button" 
          onClick={handleNextPlay}
          title="Press Enter or click to advance to the next play"
        >
          Next Play
        </button>
        <button 
          className="info-button"
          onClick={() => setIsStatusBarVisible(!isStatusBarVisible)}
        >
          INFO
        </button>
        </div>
      </div>
    </div>
  );
}

export default BaseballGame;
