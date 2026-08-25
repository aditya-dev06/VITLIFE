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
              {item.badge > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '4px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 5px',
                    borderRadius: '999px',
                    background: '#25D366',
                    color: '#000000',
                    fontSize: '0.66rem',
                    fontWeight: '900',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    boxShadow: '0 0 10px rgba(37, 211, 102, 0.75), 0 2px 5px rgba(0,0,0,0.5)',
                    border: '1.5px solid rgba(17, 24, 39, 0.9)',
                    zIndex: 10,
                    lineHeight: 1
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: '#044c20',
                      display: 'inline-block'
                    }}
                  />
                  <span>{item.badge > 99 ? '99+' : item.badge}</span>
                </span>
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

