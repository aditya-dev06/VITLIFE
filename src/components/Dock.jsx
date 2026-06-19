'use client';

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { Children, cloneElement, useEffect, useMemo, useRef, useState } from 'react';

import './Dock.css';

function DockItem({ children, className = '', onClick, mouseX, spring, distance, magnification, baseItemSize, label, isActive, parentHovered }) {
  const ref = useRef(null);
  const isHovered = useMotionValue(0);
  const isFirstRender = useRef(true);

  // Auto reset local hover state if the parent coordinates clear out (Infinity)
  useEffect(() => {
    return mouseX.on('change', (val) => {
      if (val === Infinity) {
        isHovered.set(0);
      }
    });
  }, [mouseX, isHovered]);

  // Visual active highlight: trigger height expansion and magnification when tab changes via swiping
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (isActive && ref.current && parentHovered && mouseX) {
      const currentMouseX = mouseX.get();
      // Only execute programmatic hover highlight if there's no active physical interaction
      if (currentMouseX === Infinity) {
        const timer = setTimeout(() => {
          if (!ref.current) return;
          const rect = ref.current.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;

          parentHovered.set(1);
          mouseX.set(centerX);

          setTimeout(() => {
            if (mouseX.get() === centerX) {
              parentHovered.set(0);
              mouseX.set(Infinity);
            }
          }, 500);
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [isActive, mouseX, parentHovered]);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const handleKeyDown = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`dock-item ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
      aria-label={label}
      onKeyDown={handleKeyDown}
      animate={isActive ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      {Children.map(children, child => cloneElement(child, { isHovered }))}
    </motion.div>
  );
}

function DockLabel({ children, className = '', ...rest }) {
  const { isHovered } = rest;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`dock-label ${className}`}
          role="tooltip"
          style={{ x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className = '' }) {
  return <div className={`dock-icon ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  outerClassName = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 68,
  dockHeight = 256,
  baseItemSize = 50
}) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const timeoutRef = useRef(null);

  const resetDock = () => {
    isHovered.set(0);
    mouseX.set(Infinity);
  };

  const startResetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      resetDock();
    }, 1000); // 1-second fail-safe reset for mobile scroll/swipe drift
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  );
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);

  return (
    <motion.div style={{ height, scrollbarWidth: 'none' }} className={`dock-outer ${outerClassName}`}>
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1);
          mouseX.set(pageX);
          startResetTimeout();
        }}
        onMouseLeave={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          resetDock();
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) {
            isHovered.set(1);
            mouseX.set(touch.pageX || touch.clientX);
            startResetTimeout();
          }
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) {
            isHovered.set(1);
            mouseX.set(touch.pageX || touch.clientX);
            startResetTimeout();
          }
        }}
        onTouchEnd={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          resetDock();
        }}
        onTouchCancel={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          resetDock();
        }}
        className={`dock-panel ${className}`}
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        {items.map((item, index) => {
          const isActive = item.className?.includes('active');
          return (
            <DockItem
              key={index}
              onClick={item.onClick}
              className={item.className}
              mouseX={mouseX}
              spring={spring}
              distance={distance}
              magnification={magnification}
              baseItemSize={baseItemSize}
              label={item.label}
              isActive={isActive}
              parentHovered={isHovered}
            >
              <DockIcon>{item.icon}</DockIcon>
              <DockLabel>{item.label}</DockLabel>
            </DockItem>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
