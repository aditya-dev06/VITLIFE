'use client';

import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import './Dock.css';

export default function Dock({
  items,
  outerClassName = ''
}) {
  const [currentActiveIndex, setCurrentActiveIndex] = useState(0);
  const [prevActiveIndex, setPrevActiveIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const panelRef = useRef(null);

  const activeIndex = items.findIndex(item => item.className?.includes('active'));

  if (activeIndex !== -1 && activeIndex !== currentActiveIndex) {
    setPrevActiveIndex(currentActiveIndex);
    setCurrentActiveIndex(activeIndex);
  }

  // Calculate coordinates of the active element
  useEffect(() => {
    const updateCoords = () => {
      if (!panelRef.current) return;
      const activeEl = panelRef.current.querySelector('.dock-item.active');
      if (activeEl) {
        setCoords({
          left: activeEl.offsetLeft - 6,
          right: panelRef.current.offsetWidth - (activeEl.offsetLeft + activeEl.offsetWidth) - 6
        });
      }
    };

    updateCoords();
    const timer = setTimeout(updateCoords, 50);

    let resizeObserver = null;
    if (panelRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateCoords();
      });
      resizeObserver.observe(panelRef.current);
    }

    window.addEventListener('resize', updateCoords);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateCoords);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [currentActiveIndex, items]);

  // Mark first render complete once coordinates are initially loaded
  useEffect(() => {
    if (coords && isFirstRender) {
      const timer = setTimeout(() => {
        setIsFirstRender(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [coords, isFirstRender]);

  const isMovingRight = currentActiveIndex > prevActiveIndex;
  const isMovingLeft = currentActiveIndex < prevActiveIndex;

  // OnePlus style asymmetric spring transition
  const pillTransition = isFirstRender ? { duration: 0 } : {
    left: {
      type: 'spring',
      stiffness: isMovingLeft ? 420 : 220,
      damping: isMovingLeft ? 22 : 28,
      mass: isMovingLeft ? 0.6 : 1.2
    },
    right: {
      type: 'spring',
      stiffness: isMovingRight ? 420 : 220,
      damping: isMovingRight ? 22 : 28,
      mass: isMovingRight ? 0.6 : 1.2
    }
  };

  return (
    <div className={`dock-outer ${outerClassName}`}>
      <div
        ref={panelRef}
        className="dock-panel"
        role="toolbar"
        aria-label="Application navigation"
      >
        {/* Dynamic active stretching pill */}
        {coords && (
          <motion.div
            className="active-pill"
            animate={{
              left: coords.left,
              right: coords.right
            }}
            transition={pillTransition}
          />
        )}

        {items.map((item, index) => {
          const isActive = index === currentActiveIndex;
          return (
            <button
              key={index}
              onClick={item.onClick}
              className={`dock-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
            >
              <div className="dock-icon">{item.icon}</div>
              <span className="dock-label-static">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
