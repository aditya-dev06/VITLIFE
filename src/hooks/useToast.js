import { createContext, useContext, useState, useCallback } from 'react';

export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback when used outside provider
    return {
      showToast: (msg, type = 'info') => {
        // silent no-op
      }
    };
  }
  return ctx;
}
