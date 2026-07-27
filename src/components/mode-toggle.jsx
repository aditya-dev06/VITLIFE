import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './theme-provider';
import './mode-toggle.css';

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mode-toggle" ref={menuRef}>
      <button
        className="mode-toggle-trigger"
        onClick={() => setOpen(o => !o)}
        title="Toggle theme"
        aria-label="Toggle color theme menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Sun className="mode-toggle-icon mode-toggle-icon--sun" size={18} aria-hidden="true" />
        <Moon className="mode-toggle-icon mode-toggle-icon--moon" size={18} aria-hidden="true" />
      </button>

      {open && (
        <div className="mode-toggle-dropdown" role="menu" aria-label="Select theme option">
          <button
            role="menuitem"
            className={`mode-toggle-item ${theme === 'light' ? 'active' : ''}`}
            onClick={() => { setTheme('light'); setOpen(false); }}
          >
            <Sun size={15} aria-hidden="true" /> Light
          </button>
          <button
            role="menuitem"
            className={`mode-toggle-item ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => { setTheme('dark'); setOpen(false); }}
          >
            <Moon size={15} aria-hidden="true" /> Dark
          </button>
          <button
            role="menuitem"
            className={`mode-toggle-item ${theme === 'system' ? 'active' : ''}`}
            onClick={() => { setTheme('system'); setOpen(false); }}
          >
            <Monitor size={15} aria-hidden="true" /> System
          </button>
        </div>
      )}
    </div>
  );
}
