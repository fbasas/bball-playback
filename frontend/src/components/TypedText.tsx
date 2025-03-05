import { useState, useEffect } from 'react';
import './TypedText.css';

interface TypedTextProps {
  text: string;
  typingSpeed?: number;
  className?: string;
  onComplete?: () => void;
}

const TypedText = ({ 
  text, 
  typingSpeed = 30, 
  className = '', 
  onComplete 
}: TypedTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Reset when text changes
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, typingSpeed);
      
      return () => clearTimeout(timer);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, typingSpeed, isComplete, onComplete]);

  return (
    <div className={`typed-text ${className}`}>
      {displayedText}
    </div>
  );
};

export default TypedText; 