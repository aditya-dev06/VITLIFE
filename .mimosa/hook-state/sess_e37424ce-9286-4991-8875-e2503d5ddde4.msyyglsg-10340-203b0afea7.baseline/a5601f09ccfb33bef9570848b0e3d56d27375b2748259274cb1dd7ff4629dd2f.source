import { useState, useCallback } from 'react';
import { ToastContext } from '../../hooks/useToast';
import './Toast.css';

let toastId = 0;

const ICONS = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const COLORS = {
  success: '#00a884',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

function Toast({ toast, onDismiss }) {
  return (
    <div
      className="toast-item"
      style={{ borderLeft: `3px solid ${COLORS[toast.type] || COLORS.info}` }}
      onClick={() => onDismiss(toast.id)}
    >
      <span className="toast-icon">{ICONS[toast.type] || ICONS.info}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}>✕</button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 2800) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
