import { useState, useRef, useEffect, createContext, useContext, forwardRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './DropdownMenu.css';

const DropdownMenuContext = createContext({
  open: false,
  setOpen: () => {},
  toggle: () => {},
  triggerRect: null
});

export const DropdownMenu = ({ children, open: controlledOpen, onOpenChange }) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = useCallback((val) => {
    if (!isControlled) setUncontrolledOpen(val);
    if (onOpenChange) onOpenChange(val);
  }, [isControlled, onOpenChange]);

  const toggle = useCallback((rect) => {
    if (rect) setTriggerRect(rect);
    setOpen(!open);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) return;

    const handleGlobalClose = (e) => {
      if (e && e.target && e.target.closest && e.target.closest('.dropdown-menu-content')) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        setOpen(false);
      }
    };

    // Close on any click/pointerdown outside
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handleGlobalClose);
      document.addEventListener('click', handleGlobalClose);
    }, 10);

    window.addEventListener('scroll', handleGlobalClose, true);
    window.addEventListener('resize', handleGlobalClose);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handleGlobalClose);
      document.removeEventListener('click', handleGlobalClose);
      window.removeEventListener('scroll', handleGlobalClose, true);
      window.removeEventListener('resize', handleGlobalClose);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open, setOpen]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, toggle, triggerRect, setTriggerRect }}>
      {children}
    </DropdownMenuContext.Provider>
  );
};

export const DropdownMenuTrigger = forwardRef(({ className = '', children, showChevron = true, onClick, ...props }, ref) => {
  const { open, toggle } = useContext(DropdownMenuContext);
  const localRef = useRef(null);
  const buttonRef = ref || localRef;

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`dropdown-menu-trigger ${className}`}
      data-state={open ? 'open' : 'closed'}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        toggle(rect);
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {children}
      {showChevron && (
        <svg
          className="dropdown-menu-chevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

/**
 * DropdownMenuContent — Smart-positioned dropdown
 * Opens UPWARD automatically when there's not enough space below.
 * Measures real rendered height after mount before finalising position.
 */
export const DropdownMenuContent = forwardRef(({ className = '', align = 'end', side = 'bottom', style = {}, children, ...props }, ref) => {
  const { open, setOpen, triggerRect } = useContext(DropdownMenuContext);
  const contentRef = useRef(null);
  const [position, setPosition] = useState(null);

  // After the menu renders in the DOM, measure it and set the final position
  useEffect(() => {
    if (!open || !triggerRect || !contentRef.current) return;

    const el = contentRef.current;
    const menuH = el.offsetHeight || 280;
    const menuW = el.offsetWidth || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const MARGIN = 8; // px gap from trigger + screen edge

    let spaceBelow = vh - triggerRect.bottom - MARGIN;
    let spaceAbove = triggerRect.top - MARGIN;
    
    let top, bottom;
    let openUp = false;
    let computedMaxHeight = 400; // default max height

    if (menuH <= spaceBelow) {
      // Fits perfectly below
      top = triggerRect.bottom + MARGIN;
      computedMaxHeight = spaceBelow;
    } else if (menuH <= spaceAbove) {
      // Fits perfectly above
      bottom = vh - triggerRect.top + MARGIN;
      openUp = true;
      computedMaxHeight = spaceAbove;
    } else {
      // Doesn't fit perfectly on either side, pick side with more space
      if (spaceAbove > spaceBelow) {
        bottom = vh - triggerRect.top + MARGIN;
        openUp = true;
        computedMaxHeight = spaceAbove;
      } else {
        top = triggerRect.bottom + MARGIN;
        computedMaxHeight = spaceBelow;
      }
    }

    let left, right;
    if (align === 'end') {
      right = Math.max(MARGIN, vw - triggerRect.right);
    } else {
      left = Math.max(MARGIN, Math.min(triggerRect.left, vw - menuW - MARGIN));
    }

    const maxHeight = Math.max(150, computedMaxHeight);

    setPosition({ top, bottom, left, right, maxHeight, openUp });
  }, [open, triggerRect, align]);

  if (!open) return null;

  // Initial off-screen render to allow measurement
  const baseStyle = {
    position: 'fixed',
    zIndex: 99999,
    visibility: position ? 'visible' : 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    ...style,
  };

  if (position) {
    if (position.top !== undefined) baseStyle.top = `${position.top}px`;
    if (position.bottom !== undefined) baseStyle.bottom = `${position.bottom}px`;
    if (position.left !== undefined) baseStyle.left = `${position.left}px`;
    if (position.right !== undefined) baseStyle.right = `${position.right}px`;
    if (position.maxHeight !== undefined) {
      baseStyle.maxHeight = `${position.maxHeight}px`;
      baseStyle.overflowY = 'auto';
    }
  } else if (triggerRect) {
    // Offscreen pre-render for measurement
    baseStyle.top = '-9999px';
    baseStyle.left = '-9999px';
  }

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99998, cursor: 'default' }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          setOpen(false);
        }}
      />
      <div
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={`dropdown-menu-content align-${align} side-${side} ${position?.openUp ? 'opens-up' : 'opens-down'} ${className}`}
        style={baseStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </>,
    document.body
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuGroup = forwardRef(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={`dropdown-menu-group ${className}`} {...props}>
    {children}
  </div>
));
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

export const DropdownMenuItem = forwardRef(({ className = '', variant = 'default', icon, children, shortcut, onClick, ...props }, ref) => {
  const { setOpen } = useContext(DropdownMenuContext);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    }
    setOpen(false);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`dropdown-menu-item variant-${variant} ${className}`}
      onPointerDown={handlePointerDown}
      onMouseDown={handlePointerDown}
      onClick={handleClick}
      {...props}
    >
      <div className="dropdown-menu-item-content">
        {icon && <span className="dropdown-menu-icon">{icon}</span>}
        <span>{children}</span>
      </div>
      {shortcut && <span className="dropdown-menu-shortcut">{shortcut}</span>}
    </button>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel = forwardRef(({ className = '', children, ...props }, ref) => (
  <div ref={ref} className={`dropdown-menu-label ${className}`} {...props}>
    {children}
  </div>
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = forwardRef(({ className = '', ...props }, ref) => (
  <div ref={ref} className={`dropdown-menu-separator ${className}`} {...props} />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuShortcut = ({ children }) => (
  <span className="dropdown-menu-shortcut">{children}</span>
);
