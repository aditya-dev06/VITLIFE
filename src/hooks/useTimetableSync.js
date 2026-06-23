/**
 * useTimetableSync
 *
 * Handles offline-first timetable persistence:
 *  - Saves immediately to localStorage (always works offline)
 *  - Tries to sync to server; if it fails, stores a pending payload
 *  - On `window.online` event, retries any pending sync automatically
 *  - Exposes `syncStatus`: 'synced' | 'offline' | 'syncing' | 'pending'
 */
import { useState, useEffect, useCallback } from 'react';

const PENDING_SYNC_KEY = 'timetable_pending_sync';

export function useTimetableSync(token) {
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'offline' | 'syncing' | 'pending'

  // Push timetable to server, return true on success
  const pushToServer = useCallback(async (timetable) => {
    if (!token) return false;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ timetable }),
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
    const { timetable } = JSON.parse(raw);
    setSyncStatus('syncing');
    const ok = await pushToServer(timetable);
    if (ok) {
      localStorage.removeItem(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    } else {
      setSyncStatus('pending');
    }
  }, [pushToServer]);

  // Listen for browser coming back online
  useEffect(() => {
    const handle = () => retryPendingSync();
    window.addEventListener('online', handle);
    return () => window.removeEventListener('online', handle);
  }, [retryPendingSync]);

  // On mount: check for any pending timetable sync and handle it
  useEffect(() => {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return;

    if (!navigator.onLine) {
      // Defer setState out of synchronous effect body
      Promise.resolve().then(() => setSyncStatus('pending'));
      return;
    }

    const { timetable } = JSON.parse(raw);
    // pushToServer is async — setState only called inside .then()
    pushToServer(timetable).then((ok) => {
      if (ok) {
        localStorage.removeItem(PENDING_SYNC_KEY);
        setSyncStatus('synced');
      } else {
        setSyncStatus('pending');
      }
    });
  }, [pushToServer]);

  /**
   * saveTimetable(timetable, userObj, setUser)
   *
   * 1. Writes to localStorage immediately (offline-safe)
   * 2. Updates React state
   * 3. Tries server sync; queues for retry if offline
   */
  const saveTimetable = useCallback(async (newTimetable, userObj, setUser) => {
    // 1. Persist locally (always)
    if (userObj) {
      const updatedUser = { ...userObj, timetable: newTimetable };
      setUser(updatedUser);
      localStorage.setItem('ds_ai_user', JSON.stringify(updatedUser));
    }

    if (!token) return;

    // 2. If offline, queue it
    if (!navigator.onLine) {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ timetable: newTimetable }));
      setSyncStatus('pending');
      return;
    }

    // 3. Try server sync
    setSyncStatus('syncing');
    const ok = await pushToServer(newTimetable);
    if (ok) {
      localStorage.removeItem(PENDING_SYNC_KEY);
      setSyncStatus('synced');
    } else {
      // Server reachable but failed (or timed out) — queue for retry
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify({ timetable: newTimetable }));
      setSyncStatus('pending');
    }
  }, [token, pushToServer]);

  return { syncStatus, saveTimetable };
}
