'use client';

import { motion } from 'motion/react';
import { memo } from 'react';
import './Dock.css';

function Dock({
  items = [],
  outerClassName = ''
}) {
  const activeIndex = items.findIndex(item => item.className?.includes('active'));

  return (
    <div className={`dock-outer ${outerClassName}`}>
      <nav
        className="dock-panel"
        role="navigation"
        aria-label="Mobile Navigation Dock"
      >
        {items.map((item, index) => {
          const isActive = index === (activeIndex !== -1 ? activeIndex : 0);
          return (
            <button
              key={item.id || item.label || index}
              onClick={item.onClick}
              className={`dock-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="dock-active-pill"
                  className="active-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 32,
                    mass: 0.8
                  }}
                />
              )}
              <div className="dock-icon" aria-hidden="true">{item.icon}</div>
              <span className="dock-label-static">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default memo(Dock);

