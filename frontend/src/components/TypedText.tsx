import { useState, useEffect, useRef } from 'react';
import './TypedText.css';

// Global history to persist across renders
const globalHistory: string[] = [];

interface TypedTextProps {
  text: string;
  typingSpeed?: number;
  className?: string;
  onComplete?: () => void;
  clearHistory?: boolean;
  lineDelay?: number;
}

const TypedText = ({ 
  text, 
  typingSpeed = 30, 
  className = '', 
  onComplete,
  clearHistory = false,
  lineDelay = 1000
}: TypedTextProps) => {
  const [displayedText, setDisplayedText] = useState<string>('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Clear history if requested
  useEffect(() => {
    if (clearHistory) {
      globalHistory.length = 0; // Clear the array without reassigning
    }
  }, [clearHistory]);
  
  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentCharIndex(0);
    setIsComplete(false);
  }, [text]);

  // Type the current text character by character
  useEffect(() => {
    if (!text) return;
    
    if (currentCharIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentCharIndex]);
        setCurrentCharIndex(prev => prev + 1);
      }, typingSpeed);
      
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      // When typing is complete, add to history and call onComplete
      setIsComplete(true);
      
      // Only add to history if it's not already there
      if (!globalHistory.includes(text)) {
        globalHistory.push(text);
      }
      
      // Call onComplete callback if provided after the line delay
      if (onComplete) {
        setTimeout(() => {
          onComplete();
        }, lineDelay); // Use lineDelay instead of fixed 100ms
      }
    }
  }, [currentCharIndex, text, typingSpeed, isComplete, onComplete, lineDelay]);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  console.log("Rendering TypedText with text:", text);
  console.log("Global history:", globalHistory);

  return (
    <div 
      ref={containerRef}
      className={`typed-text ${className}`}
    >
      {/* Render history lines */}
      {globalHistory.map((line, index) => (
        <div key={`history-${index}`} className="typed-line">
          {line}
        </div>
      ))}
      
      {/* Render current line being typed */}
      {text && !globalHistory.includes(text) && (
        <div className={`typed-line ${!isComplete ? 'typing' : ''}`}>
          {displayedText}
          {!isComplete && currentCharIndex < text.length && (
            <span className="cursor">|</span>
          )}
        </div>
      )}
    </div>
  );
};

export default TypedText; 