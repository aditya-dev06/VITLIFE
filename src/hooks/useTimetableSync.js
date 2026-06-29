import { useState, useEffect, useCallback } from 'react';

const PENDING_SYNC_KEY = 'profile_pending_sync';

export function useProfileSync(token) {
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'offline' | 'syncing' | 'pending'

  // Push updates to server, return true on success
  const pushToServer = useCallback(async (updates) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
        // Hard 6-second timeout so we don't hang indefinitely
        signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined,
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [token]);

  // Retry any pending sync (called when browser comes back online)
  const retryPendingSync = useCallback(async () => {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;
    try {
      const updates = JSON.parse(raw);
      setSyncStatus('syncing');
      const ok = await pushToServer(updates);
      if (ok) {
        localStorage.removeItem(PENDING_SYNC_KEY);
        setSyncStatus('synced');
      } else {
        setSyncStatus('pending');
      }
    } catch {
      // If parsing fails, remove the corrupted payload to prevent infinite retries
      localStorage.removeItem(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    }
  }, [pushToServer]);

  // Listen for browser coming back online
  useEffect(() => {
    const handle = () => retryPendingSync();
    window.addEventListener('online', handle);
    return () => window.removeEventListener('online', handle);
  }, [retryPendingSync]);

  // On mount: check for any pending profile sync and handle it
  useEffect(() => {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;

    if (!navigator.onLine) {
      Promise.resolve().then(() => setSyncStatus('pending'));
      return;
    }

    try {
      const updates = JSON.parse(raw);
      pushToServer(updates).then((ok) => {
        if (ok) {
          localStorage.removeItem(PENDING_SYNC_KEY);
          setSyncStatus('synced');
        } else {
          setSyncStatus('pending');
        }
      });
    } catch {
      localStorage.removeItem(PENDING_SYNC_KEY);
    }
  }, [pushToServer]);

  /**
   * saveProfileUpdate(updatePayload, userObj, setUser)
   *
   * 1. Writes to localStorage immediately (offline-safe, optimistic UI)
   * 2. Updates React state
   * 3. Tries server sync; queues for retry if offline or fails
   */
  const saveProfileUpdate = useCallback(async (updatePayload, userObj, setUser) => {
    // 1. Update local state immediately
    if (userObj && setUser) {
      const updatedUser = { ...userObj, ...updatePayload };
      setUser(updatedUser);
      const storageKey = userObj.isGuest ? 'ds_guest_user' : 'ds_ai_user';
      localStorage.setItem(storageKey, JSON.stringify(updatedUser));
    }

    if (!token) return;

    // Get current pending updates from localStorage
    let currentPending = {};
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (raw) {
      try {
        currentPending = JSON.parse(raw);
      } catch {
        currentPending = {};
      }
    }

    // Merge new updates into pending queue
    const mergedUpdates = { ...currentPending, ...updatePayload };

    // 2. If offline, queue it
    if (!navigator.onLine) {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(mergedUpdates));
      setSyncStatus('pending');
      return;
    }

    // 3. Try server sync
    setSyncStatus('syncing');
    const ok = await pushToServer(mergedUpdates);
    if (ok) {
      localStorage.removeItem(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    } else {
      // Server reachable but failed (or timed out) — queue for retry
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(mergedUpdates));
      setSyncStatus('pending');
    }
  }, [token, pushToServer]);

  return { syncStatus, saveProfileUpdate };
}
