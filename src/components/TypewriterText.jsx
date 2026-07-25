import { useState, useEffect } from 'react';
import './TypewriterText.css';

export default function TypewriterText({ 
  words = ['LIFE', 'BHOPAL'], 
  typingSpeed = 120, 
  erasingSpeed = 60, 
  newWordDelay = 2000, 
  className = '',
  hideCursorAfterFinish = true,
  cursorHideDelay = 1800
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    let timer;
    let cursorTimer;
    const activeWord = words[currentWordIndex] || '';

    // Keep cursor visible while typing or erasing
    setShowCursor(true);

    if (isDeleting) {
      if (currentText === '') {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }, 200); // 200ms delay after erase finishes
      } else {
        timer = setTimeout(() => {
          setCurrentText(prev => prev.slice(0, -1));
        }, erasingSpeed);
      }
    } else {
      if (currentText === activeWord) {
        // Word typing finished! Hide cursor after delay so it is not distracting
        if (hideCursorAfterFinish) {
          cursorTimer = setTimeout(() => {
            setShowCursor(false);
          }, cursorHideDelay);
        }

        if (words.length > 1) {
          timer = setTimeout(() => {
            setIsDeleting(true);
          }, newWordDelay);
        }
      } else {
        timer = setTimeout(() => {
          setCurrentText(activeWord.slice(0, currentText.length + 1));
        }, typingSpeed);
      }
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(cursorTimer);
    };
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, erasingSpeed, newWordDelay, hideCursorAfterFinish, cursorHideDelay]);

  return (
    <span className={`typewriter-container ${className}`}>
      <span className="typewriter-text">{currentText}</span>
      <span className={`typewriter-cursor ${showCursor ? 'visible' : 'hidden'}`}></span>
    </span>
  );
}
