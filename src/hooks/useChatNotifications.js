import { useState, useEffect, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import { soundEffects } from '../utils/soundEffects';

export function useChatNotifications({ user, activeTab, activeChatChannel }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByChannel, setUnreadByChannel] = useState({});
  const [activeNotification, setActiveNotification] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('default');
  const bannerTimeoutRef = useRef(null);
  const pusherInstanceRef = useRef(null);

  // Read initial permission status
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Update browser tab title based on unread count
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const baseTitle = 'VIT Life | Student Hub';
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) 💬 ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }, [unreadCount]);

  // Request browser desktop notification permission
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermissionStatus(perm);
      return perm === 'granted';
    } catch (e) {
      return false;
    }
  }, []);

  // Dismiss current floating notification banner
  const dismissBanner = useCallback(() => {
    setActiveNotification(null);
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
  }, []);

  // Clear unread count for a specific channel or all
  const clearChannelUnread = useCallback((channelId) => {
    if (!channelId) {
      setUnreadCount(0);
      setUnreadByChannel({});
      return;
    }
    setUnreadByChannel(prev => {
      const prevCount = prev[channelId] || 0;
      if (prevCount === 0) return prev;
      const next = { ...prev };
      delete next[channelId];
      setUnreadCount(c => Math.max(0, c - prevCount));
      return next;
    });
  }, []);

  // Handle incoming notification dispatch
  const handleIncomingNotification = useCallback((notif) => {
    if (!notif) return;

    const currentUserName = user?.name || user?.email?.split('@')[0] || '';
    const currentUserReg = (user?.regNo || user?.registrationNumber || user?.email?.split('@')[0] || '').toLowerCase();

    // Ignore messages sent by oneself
    if (notif.author === currentUserName || (notif.authorRegNo && notif.authorRegNo.toLowerCase() === currentUserReg)) {
      return;
    }

    const isCurrentActiveView = activeTab === 'community' && activeChatChannel === notif.channel;

    // If user is currently looking at this active channel, do not show banner or increment unread
    if (isCurrentActiveView && !document.hidden) {
      return;
    }

    // 1. Play signature WhatsApp incoming message chime
    soundEffects.playMessageChime();

    // 2. Increment unread counter
    setUnreadByChannel(prev => ({
      ...prev,
      [notif.channel]: (prev[notif.channel] || 0) + 1
    }));
    setUnreadCount(c => c + 1);

    // 3. Show In-App Floating Top Banner
    setActiveNotification(notif);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 6000);

    // 4. If tab is in background / minimized, fire OS Web Push Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = notif.isDm 
          ? `💬 DM from ${notif.author}` 
          : `💬 #${notif.channel} — ${notif.author}`;
        const body = notif.content || 'Sent an attachment';

        const nativeNotif = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `vitchat-${notif.channel}`,
          renotify: true
        });

        nativeNotif.onclick = () => {
          window.focus();
          nativeNotif.close();
        };
      } catch (e) {}
    }
  }, [user, activeTab, activeChatChannel]);

  // Global Pusher Subscription setup
  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY || 'ad35a515130550297260';
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'ap2';

    if (!pusherKey) return;

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
      forceTLS: true
    });
    pusherInstanceRef.current = pusher;

    const userRegOrId = (user?.regNo || user?.registrationNumber || user?.email?.split('@')[0] || '').toLowerCase();

    // 1. User Personal Direct Notification Channel (DMs, Requests)
    let userChannel = null;
    if (userRegOrId) {
      const safeUserChannelName = `user-${userRegOrId}`.replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 200);
      userChannel = pusher.subscribe(safeUserChannelName);

      userChannel.bind('new_dm', (data) => {
        if (data && data.message) {
          handleIncomingNotification({
            id: data.message.id || 'dm_' + Date.now(),
            author: data.senderName || data.message.author || 'Student',
            authorRegNo: data.senderRegNo || data.message.authorRegNo,
            avatar: (data.senderName || 'S').charAt(0).toUpperCase(),
            content: data.message.content || 'New direct message',
            channel: data.channel,
            isDm: true,
            timestamp: 'Just now'
          });
        }
      });

      userChannel.bind('new_chat_request', (data) => {
        if (data) {
          handleIncomingNotification({
            id: 'req_' + Date.now(),
            author: data.fromName || 'Student',
            authorRegNo: data.fromRegNo,
            avatar: (data.fromName || 'S').charAt(0).toUpperCase(),
            content: `Sent you a private chat request (${data.fromRegNo || ''})`,
            channel: data.channelId || 'requests',
            isDm: true,
            timestamp: 'Just now'
          });
        }
      });

      userChannel.bind('chat_request_accepted', (data) => {
        if (data) {
          handleIncomingNotification({
            id: 'acc_' + Date.now(),
            author: data.acceptedBy || 'Student',
            avatar: (data.acceptedBy || 'S').charAt(0).toUpperCase(),
            content: `Accepted your private chat request! You can now message privately.`,
            channel: data.channelId,
            isDm: true,
            timestamp: 'Just now'
          });
        }
      });
    }

    // 2. Public General Announcements & Mentions
    const generalChannel = pusher.subscribe('chat-general');
    generalChannel.bind('new_message', (data) => {
      if (data && data.message) {
        const isMentioned = userRegOrId && (
          (data.message.content || '').toLowerCase().includes(`@${userRegOrId}`) ||
          (user?.name && (data.message.content || '').toLowerCase().includes(`@${user.name.toLowerCase()}`))
        );
        const isAiResponse = data.message.isAi;

        // If mentioned or vitChat AI responded to user or user is on another tab
        if (isMentioned || isAiResponse || activeTab !== 'community') {
          handleIncomingNotification({
            id: data.message.id,
            author: data.message.author || 'Student',
            authorRegNo: data.message.authorRegNo,
            avatar: data.message.avatar || (data.message.author || 'S').charAt(0).toUpperCase(),
            content: data.message.content,
            channel: 'general',
            isDm: false,
            isAi: Boolean(data.message.isAi),
            timestamp: 'Just now'
          });
        }
      }
    });

    return () => {
      if (userChannel) {
        userChannel.unbind_all();
        const safeUserChannelName = `user-${userRegOrId}`.replace(/[^a-zA-Z0-9\-_]/g, '-').substring(0, 200);
        pusher.unsubscribe(safeUserChannelName);
      }
      generalChannel.unbind_all();
      pusher.unsubscribe('chat-general');
      pusher.disconnect();
      pusherInstanceRef.current = null;
    };
  }, [user, activeTab, handleIncomingNotification]);

  return {
    unreadCount,
    unreadByChannel,
    activeNotification,
    permissionStatus,
    requestPermission,
    dismissBanner,
    clearChannelUnread
  };
}
