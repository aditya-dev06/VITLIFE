import { useState, useEffect, useCallback } from 'react';

export const PENDING_SYNC_KEY = 'profile_pending_sync';

/**
 * Safe localStorage helpers to prevent crashes from quota limits, private mode, or invalid JSON
 */
export const safeGetStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const safeRemoveStorage = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Compute sync status synchronously at 0ms initialization
 */
export const getInitialSyncStatus = () => {
  if (typeof window === 'undefined') return 'synced';
  try {
    const pending = localStorage.getItem(PENDING_SYNC_KEY);
    if (pending) {
      return navigator.onLine ? 'pending' : 'offline';
    }
    return navigator.onLine ? 'synced' : 'offline';
  } catch {
    return 'synced';
  }
};

export function useProfileSync(token) {
  // 0ms offline profile initialization: synchronous state setup
  const [syncStatus, setSyncStatus] = useState(getInitialSyncStatus);

  // Push updates to server, return true on success
  const pushToServer = useCallback(async (updates) => {
    if (!token) return false;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }, [token]);

  // Retry any pending sync
  const retryPendingSync = useCallback(async () => {
    const updates = safeGetStorage(PENDING_SYNC_KEY);
    if (!updates) {
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    const ok = await pushToServer(updates);
    if (ok) {
      safeRemoveStorage(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    } else {
      setSyncStatus('pending');
    }
  }, [pushToServer]);

  // Listen for browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      const pending = safeGetStorage(PENDING_SYNC_KEY);
      if (pending) {
        retryPendingSync();
      } else {
        setSyncStatus('synced');
      }
    };

    const handleOffline = () => {
      const pending = safeGetStorage(PENDING_SYNC_KEY);
      setSyncStatus(pending ? 'pending' : 'offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [retryPendingSync]);

  // On mount: retry pending sync immediately if online
  useEffect(() => {
    const pending = safeGetStorage(PENDING_SYNC_KEY);
    if (!pending) return;

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    retryPendingSync();
  }, [retryPendingSync]);

  /**
   * saveProfileUpdate(updatePayload, userObj, setUser)
   *
   * 1. Writes to localStorage immediately (0ms offline-safe, optimistic UI)
   * 2. Updates React state with immutable copy
   * 3. Tries server sync; queues for retry if offline or fails
   */
  const saveProfileUpdate = useCallback(async (updatePayload, userObj, setUser) => {
    // 1. Immediate 0ms local state and localStorage persistence
    if (setUser) {
      let baseUser = userObj;
      if (!baseUser) {
        baseUser = safeGetStorage('ds_ai_user') || safeGetStorage('ds_guest_user') || {};
      }
      const updatedUser = { ...baseUser, ...updatePayload };
      setUser(updatedUser);
      
      const storageKey = baseUser.isGuest ? 'ds_guest_user' : 'ds_ai_user';
      safeSetStorage(storageKey, updatedUser);
    }

    // Merge new updates into pending queue
    const currentPending = safeGetStorage(PENDING_SYNC_KEY) || {};
    const mergedUpdates = { ...currentPending, ...updatePayload };

    if (!token) {
      // Guest/tokenless session: saved locally 0ms
      safeSetStorage(PENDING_SYNC_KEY, mergedUpdates);
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
      return;
    }

    // 2. If offline, queue for retry
    if (!navigator.onLine) {
      safeSetStorage(PENDING_SYNC_KEY, mergedUpdates);
      setSyncStatus('offline');
      return;
    }

    // 3. Try server sync
    setSyncStatus('syncing');
    const ok = await pushToServer(mergedUpdates);
    if (ok) {
      safeRemoveStorage(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    } else {
      // Server reachable but failed or timed out - queue for retry
      safeSetStorage(PENDING_SYNC_KEY, mergedUpdates);
      setSyncStatus('pending');
    }
  }, [token, pushToServer]);

  return { syncStatus, saveProfileUpdate, retryPendingSync };
}

