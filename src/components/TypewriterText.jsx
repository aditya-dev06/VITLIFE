import { useState, useEffect } from 'react';
import './TypewriterText.css';

export default function TypewriterText({ 
  words = ['LIFE', 'BHOPAL'], 
  typingSpeed = 120, 
  erasingSpeed = 60, 
  newWordDelay = 2000, 
  className = '' 
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const activeWord = words[currentWordIndex] || '';

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

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, currentWordIndex, words, typingSpeed, erasingSpeed, newWordDelay]);

  return (
    <span className={`typewriter-container ${className}`}>
      <span className="typewriter-text">{currentText}</span>
      <span className="typewriter-cursor"></span>
    </span>
  );
}
