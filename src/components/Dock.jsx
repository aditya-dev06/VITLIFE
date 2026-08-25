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
                    top: '-2px',
                    right: '6px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '999px',
                    background: '#25D366',
                    color: '#000000',
                    fontSize: '0.62rem',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(37, 211, 102, 0.4)',
                    zIndex: 10
                  }}
                >
                  {item.badge > 99 ? '99+' : item.badge}
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

