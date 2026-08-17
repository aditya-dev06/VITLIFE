import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useProfileSync } from './hooks/useTimetableSync';
import TypewriterText from './components/TypewriterText';
import Dock from './components/Dock';
import { motion, AnimatePresence } from 'motion/react';

import AppSidebar from './components/AppSidebar';
import FullPageLoader from './components/FullPageLoader';
import { useTheme } from './components/theme-provider';
import ErrorBoundary from './components/ErrorBoundary';
import { cachedFetch } from './utils/apiClient';
import { getSynchronousHardwareDeviceId } from './utils/deviceFingerprint';

const safeLazy = (importFn) =>
  lazy(() =>
    importFn().catch((err) => {
      console.warn('[Auto-Recovery] Dynamic chunk failed to load after update, auto-refreshing assets:', err);
      const lastReload = sessionStorage.getItem('ds_chunk_reload_time');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem('ds_chunk_reload_time', String(now));
        window.location.reload();
      }
      return new Promise(() => {});
    })
  );

const Dashboard = safeLazy(() => import('./components/Dashboard'));
const Hyperspeed = safeLazy(() => import('./components/Hyperspeed'));
import { DARK_HYPERSPEED_OPTIONS, LIGHT_HYPERSPEED_OPTIONS } from './utils/hyperspeedOptions';
const Opportunities = safeLazy(() => import('./components/Opportunities'));
const CampusLife = safeLazy(() => import('./components/CampusLife'));
const TimetablePage = safeLazy(() => import('./components/TimetablePage'));
const VITBhopalGuide = safeLazy(() => import('./components/VITBhopalGuide'));
const Auth = safeLazy(() => import('./components/Auth'));
const TermsAndConditions = safeLazy(() => import('./components/TermsAndConditions'));
const PrivacyPolicy = safeLazy(() => import('./components/PrivacyPolicy'));
const CommunityPage = safeLazy(() => import('./components/CommunityPage'));
const MarketplacePage = safeLazy(() => import('./components/MarketplacePage'));
const FacultyDirectory = safeLazy(() => import('./components/FacultyDirectory'));
const FeedbackModal = safeLazy(() => import('./components/FeedbackModal'));
const EditProfileModal = safeLazy(() => import('./components/EditProfileModal'));

// Global fetch interceptor to catch 401/403 responses and trigger logouts (HMR-safe)
if (!window.fetch.__isWrapped) {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    let requestToken = null;
    
    // Inject x-device-fingerprint into all API requests
    const urlStr = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
    if (urlStr.includes('/api/')) {
      const fp = getSynchronousHardwareDeviceId();
      if (!args[1]) args[1] = {};
      if (!args[1].headers) args[1].headers = {};
      
      if (args[1].headers instanceof Headers) {
        args[1].headers.set('x-device-fingerprint', fp);
      } else {
        args[1].headers['x-device-fingerprint'] = fp;
      }
    }

    if (args[1] && args[1].headers) {
      const headers = args[1].headers;
      let authHeader = null;
      if (typeof headers.get === 'function') {
        authHeader = headers.get('Authorization') || headers.get('authorization');
      } else {
        authHeader = headers['Authorization'] || headers['authorization'];
      }
      if (authHeader && authHeader.startsWith('Bearer ')) {
        requestToken = authHeader.split(' ')[1];
      }
    }

    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
      const isPublicRoute = url && (
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/verify') ||
        url.includes('/api/auth/resend-code') ||
        url.includes('/api/auth/forgot-password') ||
        url.includes('/api/auth/reset-password') ||
        url.includes('/api/health/smtp')
      );
      if (!isPublicRoute) {
        const currentToken = localStorage.getItem('ds_ai_token');
        if (requestToken && requestToken === currentToken) {
          window.dispatchEvent(new CustomEvent('session-expired'));
        }
      }
    }
    return response;
  };
  window.fetch.__isWrapped = true;
}

// Default Initial Skills Database
const INITIAL_SKILLS = [];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('ds_ai_token'));
  const [user, setUser] = useState(() => {
    try {
      const storedToken = localStorage.getItem('ds_ai_token');
      if (storedToken) {
        const cachedUser = localStorage.getItem('ds_ai_user');
        return cachedUser ? JSON.parse(cachedUser) : null;
      }
      const cachedGuest = localStorage.getItem('ds_guest_user');
      return cachedGuest ? JSON.parse(cachedGuest) : null;
    } catch (e) {
      return null;
    }
  });
  // Offline-first profile sync
  const { syncStatus: profileSyncStatus, saveProfileUpdate } = useProfileSync(token);
  const [showEditProfile, setShowEditProfile] = useState(false);
  
  const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hyperspeedOptions = useMemo(() => (
    theme === 'light' ? LIGHT_HYPERSPEED_OPTIONS : DARK_HYPERSPEED_OPTIONS
  ), [theme]);
  const [xpPoints, setXpPoints] = useState(() => user?.xpPoints || 0);
  const [skills, setSkills] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(() => !user && !!token);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const headerRef = useRef(null);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const { theme, setTheme } = useTheme();
  const [installPrompt, setInstallPrompt] = useState(null); // PWA install prompt
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [guideVisible, setGuideVisible] = useState(false);
  const [eventsLocked, setEventsLocked] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    cachedFetch('/api/settings/guide-visible')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.visible === 'boolean') {
          setGuideVisible(data.visible);
        }
      })
      .catch(err => console.error('Failed to load guide visibility:', err));

    cachedFetch('/api/settings/events-locked')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.locked === 'boolean') {
          setEventsLocked(data.locked);
        }
      })
      .catch(err => console.error('Failed to load events lock status:', err));
  }, []);

  const handleToggleGuideVisibility = async () => {
    try {
      const nextVisible = !guideVisible;
      const res = await fetch('/api/settings/guide-visible', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ visible: nextVisible })
      });
      const data = await res.json();
      if (res.ok) {
        setGuideVisible(nextVisible);
      } else {
        alert(data.error || 'Failed to update visibility');
      }
    } catch (err) {
      console.error('Failed to update guide visibility:', err);
    }
  };

  const handleToggleEventsLock = async () => {
    const nextLocked = !eventsLocked;
    // Optimistic UI update
    setEventsLocked(nextLocked);
    try {
      const res = await fetch('/api/settings/events-locked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ locked: nextLocked })
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert on failure
        setEventsLocked(!nextLocked);
        alert(data.error || 'Failed to update lock status');
      }
    } catch (err) {
      console.error('Failed to update events lock:', err);
      // Revert on error
      setEventsLocked(!nextLocked);
      alert('Network error updating lock status.');
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = useCallback(async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  }, [installPrompt]);


  useEffect(() => {
    let ticking = false;
    let rafId = null;
    const handleScroll = () => {
      if (!ticking) {
        rafId = window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const isScrolled = currentY > 20;
          setScrolled(prev => prev !== isScrolled ? isScrolled : prev);

          if (currentY <= 20) {
            setNavHidden(prev => prev ? false : prev);
          } else if (currentY > lastScrollY.current + 8 && currentY > 60) {
            setNavHidden(prev => !prev ? true : prev);
          } else if (currentY < lastScrollY.current - 8) {
            setNavHidden(prev => prev ? false : prev);
          }
          lastScrollY.current = currentY;

          // Update scroll progress via DOM ref (no React re-render)
          const el = document.querySelector('.main-content');
          if (el && headerRef.current) {
            const scrollTop = el.scrollTop || currentY;
            const maxScroll = (el.scrollHeight || document.body.scrollHeight) - window.innerHeight;
            const progress = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0;
            headerRef.current.style.setProperty('--scroll-progress', progress);
          }
          ticking = false;
          rafId = null;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    const tagName = e.target.tagName.toLowerCase();
    if (
      tagName === 'input' || 
      tagName === 'textarea' || 
      tagName === 'select' || 
      tagName === 'button' || 
      e.target.closest('.course-grid') || 
      e.target.closest('.segmented-control') ||
      e.target.closest('.filter-sheet-categories') ||
      e.target.closest('.quick-list')
    ) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === 0 || touchStartY.current === 0) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 75) {
      const tabs = [];
      if (user) {
        tabs.push('dashboard', 'timetable', 'community', 'opportunities');
        if (guideVisible || user.role === 'admin') {
          tabs.push('guide');
        }
        tabs.push('campus');
      } else {
        tabs.push('dashboard', 'community', 'opportunities');
        if (guideVisible) {
          tabs.push('guide');
        }
      }

      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex !== -1) {
        if (diffX > 0 && currentIndex < tabs.length - 1) {
          handleTabClick(tabs[currentIndex + 1]);
        } else if (diffX < 0 && currentIndex > 0) {
          handleTabClick(tabs[currentIndex - 1]);
        }
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
  };



  // Global History & Phone Back Gesture Manager
  useEffect(() => {
    if (!window.history.state) {
      try {
        window.history.replaceState({ tab: 'dashboard' }, '', '#dashboard');
      } catch (e) {}
    }

    const handleGlobalPopState = (e) => {
      // 1. Close global modals if open
      if (showEditProfile) {
        setShowEditProfile(false);
        return;
      }
      if (showFeedback) {
        setShowFeedback(false);
        return;
      }
      if (showAboutUs) {
        setShowAboutUs(false);
        return;
      }
      if (showMobileProfileSheet) {
        setShowMobileProfileSheet(false);
        return;
      }

      // 2. Tab history pop navigation (only if not on community/chats where CommunityPage handles its own view stack)
      if (activeTab !== 'community' && activeTab !== 'chats') {
        const state = e.state;
        if (state && state.tab) {
          setActiveTab(state.tab);
        } else if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handleGlobalPopState);
    return () => window.removeEventListener('popstate', handleGlobalPopState);
  }, [showEditProfile, showFeedback, showAboutUs, showMobileProfileSheet, activeTab]);

  const handleTabClick = useCallback((tab) => {
    if (tab !== activeTab) {
      try {
        window.history.pushState({ tab }, '', `#${tab}`);
      } catch (e) {}
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setShowMobileProfileSheet(false);
  }, [activeTab]);

  const handleRequireAuth = useCallback(() => {
    localStorage.removeItem('ds_guest_user');
    localStorage.removeItem('ds_ai_token');
    localStorage.removeItem('ds_ai_user');
    setToken(null);
    setUser(null);
    setActiveTab('auth');
  }, []);

  const handleLogout = useCallback(() => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(err => console.error("Logout session revocation failed:", err));
    }
    localStorage.removeItem('ds_ai_token');
    localStorage.removeItem('ds_ai_user');
    localStorage.removeItem('ds_guest_user');
    localStorage.removeItem('profile_pending_sync');
    localStorage.removeItem('ds_selected_mess');
    localStorage.removeItem('ds_swipe_hint_seen');
    // Purge service worker API cache to prevent stale sensitive data
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'PURGE_API_CACHE' });
    }
    // Explicitly delete all caches from the main thread for maximum security
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => caches.delete(name));
      });
    }
    setToken(null);
    setUser(null);
    setSkills(INITIAL_SKILLS);
    setXpPoints(0);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
    setShowEditProfile(false);
    setShowMobileProfileSheet(false);
  }, [token]);

  useEffect(() => {
    const handleSessionExpired = (e) => {
      // Only log out if explicitly confirmed by server response payload
      if (e?.detail?.revoked) {
        handleLogout();
      }
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [handleLogout]);

  // Session validation: Keep user logged in offline/cached without aggressive auto-logout
  useEffect(() => {
    if (!token || user?.isGuest) return;

    const checkSession = async () => {
      try {
        const res = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
          localStorage.setItem('ds_ai_user', JSON.stringify(profile));
        } else if (res.status === 401 || res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data.sessionRevoked) {
            handleLogout();
          }
        }
      } catch (err) {
        console.warn("[PWA] Offline session check fallback to cached user profile:", err);
      }
    };

    checkSession();
  }, [token, user?.isGuest, handleLogout]);


  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
        localStorage.setItem('ds_ai_user', JSON.stringify(profile));
        setXpPoints(profile.xpPoints || 0);

        // Map skills with their progress stored on server
        const mappedSkills = INITIAL_SKILLS.map(skill => ({
          ...skill,
          status: profile.skillsProgress?.[skill.id] || 'To Do'
        }));
        setSkills(mappedSkills);
      } else if (res.status === 401 || res.status === 403) {
        const data = await res.json().catch(() => ({}));
        if (data.sessionRevoked || data.invalidToken) {
          handleLogout();
        } else {
          // Cold start or transient auth error - keep cached user profile
          const cachedUser = localStorage.getItem('ds_ai_user');
          if (cachedUser) {
            try {
              const profile = JSON.parse(cachedUser);
              setUser(profile);
              setXpPoints(profile.xpPoints || 0);
            } catch (e) {}
          }
        }
      } else {
        // Temporary server/network error - try fallback to cached profile
        const cachedUser = localStorage.getItem('ds_ai_user');
        if (cachedUser) {
          const profile = JSON.parse(cachedUser);
          setUser(profile);
          setXpPoints(profile.xpPoints || 0);
          const mappedSkills = INITIAL_SKILLS.map(skill => ({
            ...skill,
            status: profile.skillsProgress?.[skill.id] || 'To Do'
          }));
          setSkills(mappedSkills);
        }
      }
    } catch (err) {
      console.error("Failed to load user profile: ", err);
      // Offline fallback: try reading cached profile if exists
      const cachedUser = localStorage.getItem('ds_ai_user');
      if (cachedUser) {
        const profile = JSON.parse(cachedUser);
        setUser(profile);
        setXpPoints(profile.xpPoints || 0);
        const mappedSkills = INITIAL_SKILLS.map(skill => ({
          ...skill,
          status: profile.skillsProgress?.[skill.id] || 'To Do'
        }));
        setSkills(mappedSkills);
      }
    } finally {
      setLoading(false);
    }
  }, [token, handleLogout]);

  const fetchOpportunities = useCallback(async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await cachedFetch('/api/opportunities', { headers });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setLastUpdated(data.lastUpdated || '');
      } else {
        console.error("Failed to fetch opportunities from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, [token]);

  const fetchClubs = useCallback(async () => {
    try {
      const res = await cachedFetch('/api/clubs');
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs || []);
      } else {
        console.error("Failed to fetch clubs from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await cachedFetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        console.error("Failed to fetch events from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, []);

  // Initialize and load user profile on token change or startup
  useEffect(() => {
    if (token) {
      Promise.resolve().then(() => {
        fetchUserProfile();
      });
    } else {
      Promise.resolve().then(() => {
        // Check for a saved guest session first
        const savedGuest = localStorage.getItem('ds_guest_user');
        if (savedGuest) {
          try {
            const guestUser = JSON.parse(savedGuest);
            setUser(guestUser);
          } catch {
            localStorage.removeItem('ds_guest_user');
          }
        } else {
          // Default new visitors to Guest User mode on Home/Dashboard page
          const defaultGuestUser = {
            name: 'VITian',
            email: 'guest@vitbhopal.ac.in',
            isGuest: true,
            role: 'student',
            isVitBhopal: true,
            semester: 1,
            courses: ['DBMS', 'DSA'],
            registrationNumber: '25GUEST0001'
          };
          localStorage.setItem('ds_guest_user', JSON.stringify(defaultGuestUser));
          setUser(defaultGuestUser);
        }
        setLoading(false);
      });
    }
  }, [token, fetchUserProfile]);

  // Load opportunities on token load
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchOpportunities();
      fetchClubs();
      fetchEvents();
    });
  }, [token, fetchOpportunities, fetchClubs, fetchEvents]);

  const handleLoginSuccess = (newToken, newUser) => {
    if (newUser?.isGuest) {
      // Guest: no token, persist guest user locally
      localStorage.setItem('ds_guest_user', JSON.stringify(newUser));
      setToken(null);
      setUser(newUser);
    } else {
      localStorage.setItem('ds_ai_token', newToken);
      localStorage.setItem('ds_ai_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    }
  };

  // Sync skill status changes to the Express server
  const handleUpdateSkillStatus = async (skillId, newStatus) => {
    const updated = skills.map(skill => {
      if (skill.id === skillId) {
        return { ...skill, status: newStatus };
      }
      return skill;
    });
    setSkills(updated);

    const newProgress = {};
    updated.forEach(s => {
      if (s.status !== 'To Do') {
        newProgress[s.id] = s.status;
      }
    });

    await saveProfileUpdate({ skillsProgress: newProgress }, user, setUser);
  };

  const handleUpdateSemester = async (newSemester) => {
    const semNum = parseInt(newSemester, 10) || 1;
    await saveProfileUpdate({ semester: semNum }, user, setUser);
  };

  const handleUpdateProfile = async (newName, newSemester) => {
    if (!newName.trim()) return;
    const semNum = parseInt(newSemester, 10) || 1;
    await saveProfileUpdate({ name: newName.trim(), semester: semNum }, user, setUser);
    setShowEditProfile(false);
  };

  const handleUpdateTimetable = async (newTimetable) => {
    await saveProfileUpdate({ timetable: newTimetable }, user, setUser);
  };

  // Extract student registration number from college email (firstname.regnumber@vitbhopal.ac.in)
  const getRegNumber = () => {
    if (!user || !user.isVitBhopal || !user.email) return '';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts[1].toUpperCase();
    }
    return '';
  };

  // Statistics calculation
  const totalSkills = skills.length;
  const completedSkills = skills.filter(s => s.status === 'Completed').length;
  const inProgressSkills = skills.filter(s => s.status === 'In Progress').length;
  const inProgressSkillsList = skills.filter(s => s.status === 'In Progress');

  const stats = {
    totalSkills,
    completedSkills,
    inProgressSkills,
    inProgressSkillsList,
    xpPoints
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'faculty':
        return <FacultyDirectory user={user} onRequireAuth={handleRequireAuth} onBackToApp={() => setActiveTab('dashboard')} />;
      case 'opportunities':
        return (
          <Opportunities 
            initialOpportunities={opportunities} 
            lastUpdated={lastUpdated} 
            onRefreshData={fetchOpportunities}
          />
        );
      case 'guide':
        return (
          <VITBhopalGuide 
            isVitBhopal={user ? user.isVitBhopal : false} 
            userSemester={user ? user.semester : 1}
            userProgram={user ? user.program : ''}
            isAdmin={user && user.role === 'admin'}
            guideVisible={guideVisible}
            onToggleGuideVisibility={handleToggleGuideVisibility}
          />
        );
      case 'timetable':
        if (!user) {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <TimetablePage 
            user={user}
            onUpdateTimetable={handleUpdateTimetable}
            syncStatus={profileSyncStatus}
          />
        );
      case 'chats':
        return (
          <ErrorBoundary>
            <CommunityPage 
              key="chats"
              user={user}
              onRequireAuth={handleRequireAuth}
              initialSubTab="chats"
              onBackToApp={() => setActiveTab('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'community':
        return (
          <ErrorBoundary>
            <CommunityPage 
              key="community"
              user={user}
              onRequireAuth={handleRequireAuth}
              initialSubTab="pyq"
              onBackToApp={() => setActiveTab('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'marketplace':
        return (
          <ErrorBoundary>
            <MarketplacePage 
              key="marketplace"
              user={user}
              onRequireAuth={handleRequireAuth}
              onBackToApp={() => setActiveTab('dashboard')}
            />
          </ErrorBoundary>
        );
      case 'campus':
        if (!user) {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <ErrorBoundary>
            <CampusLife 
              user={user} 
              token={token} 
              clubs={clubs}
              events={events}
              fetchClubs={fetchClubs}
              fetchEvents={fetchEvents}
              initialSelectedEventId={highlightedEventId}
              clearInitialSelectedEvent={() => setHighlightedEventId(null)}
              eventsLocked={eventsLocked}
              onToggleEventsLock={handleToggleEventsLock}
            />
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <Dashboard 
              stats={stats} 
              user={user}
              opportunities={opportunities} 
              onNavigate={setActiveTab}
              onUpdateSemester={handleUpdateSemester}
              clubs={clubs}
              events={events}
              fetchEvents={fetchEvents}
              token={token}
              theme={theme}
              eventsLocked={eventsLocked}
              onToggleEventsLock={handleToggleEventsLock}
              isAdmin={user && user.role === 'admin'}
              onNavigateToEvent={(eventId) => {
                setHighlightedEventId(eventId);
                setActiveTab('campus');
              }}
            />
          </ErrorBoundary>
        );
    }
  };

  // Handle client-side routing for legal compliance documents
  if (window.location.pathname === '/terms') {
    return (
      <Suspense fallback={<FullPageLoader text="Loading Terms & Conditions..." />}>
        <TermsAndConditions />
      </Suspense>
    );
  }
  if (window.location.pathname === '/privacy') {
    return (
      <Suspense fallback={<FullPageLoader text="Loading Privacy Policy..." />}>
        <PrivacyPolicy />
      </Suspense>
    );
  }

  // Render Login/Signup if not authenticated (guests bypass this with user.isGuest)
  if (!token && !user?.isGuest) {
    return (
      <Suspense fallback={null}>
        <Auth onLoginSuccess={handleLoginSuccess} theme={theme} setTheme={setTheme} onShowFeedback={() => setShowFeedback(true)} />
      </Suspense>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <AppSidebar
        user={user}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        guideVisible={guideVisible}
        profileSyncStatus={profileSyncStatus}
        installPrompt={installPrompt}
        onInstallApp={handleInstallApp}
        onFeedback={() => setShowFeedback(true)}
        onAboutUs={() => setShowAboutUs(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        onEditProfile={() => setShowEditProfile(true)}
      />

      {!isMobileDevice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          opacity: theme === 'light' ? 0.08 : 0.5,
          pointerEvents: 'none',
          display: activeTab === 'dashboard' ? 'block' : 'none'
        }}>
          <Suspense fallback={null}>
            <Hyperspeed effectOptions={hyperspeedOptions} />
          </Suspense>
        </div>
      )}

      {/* Main Panel View */}
      <main 
        className="main-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Top Navigation Bar */}
        <header ref={headerRef} className={`top-bar ${scrolled ? 'scrolled' : ''} ${navHidden ? 'nav-hidden' : ''}`}>
          {/* Scroll progress bar */}
          <div className="top-bar-progress" />
          {/* Animated shimmer line */}
          <div className="top-bar-shimmer" />

          {/* Mobile website branding & profile row: visible initially, collapses/disappears on scroll down */}
          <div className="top-bar-mobile-header-row">
            <div className="top-bar-mobile-brand">
              <span className="logo-gradient-text" style={{ fontWeight: 800 }}>VIT</span>
              <TypewriterText
                words={['LIFE', 'BHOPAL']}
                className="brand-rotating-text"
              />
            </div>

            {/* Mobile Header Actions (Profile & Theme togglers) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* PWA Install button — mobile */}
              {installPrompt && (
                <button
                  className="top-bar-mobile-theme-btn pwa-install-btn-mobile"
                  onClick={handleInstallApp}
                  title="Install App"
                  aria-label="Install VIT Life Progressive Web App"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: 'hsl(var(--primary))',
                    width: 'auto',
                    borderRadius: '20px',
                    padding: '0 0.75rem'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install
                </button>
              )}
              <button 
                className="top-bar-mobile-theme-btn"
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                title="Toggle Light/Dark Theme"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                style={{ display: 'flex' }}
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              <button 
                className="top-bar-mobile-profile-btn"
                onClick={() => setShowMobileProfileSheet(true)}
                title="Profile & Settings"
                aria-label="Open Profile and Account Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <nav className="top-bar-nav" aria-label="Main Navigation">
            <button className="top-bar-link" onClick={() => handleTabClick('dashboard')} aria-label="Go to Dashboard Home">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Home
            </button>
            <button className="top-bar-link" onClick={() => setShowAboutUs(true)} aria-label="About VIT Life">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              About Us
            </button>
            <a 
              href="https://github.com/aditya-dev06" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="top-bar-link"
              aria-label="Visit GitHub repository"
            >
              <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </nav>
        </header>

        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              {renderActiveComponent()}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
      {showEditProfile && (
        <Suspense fallback={null}>
          <EditProfileModal
            user={user}
            token={token}
            handleLogout={handleLogout}
            onClose={() => setShowEditProfile(false)}
            onSave={handleUpdateProfile}
          />
        </Suspense>
      )}
      {showAboutUs && (
        <div className="modal-overlay" onClick={() => setShowAboutUs(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="about-us-heading" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 id="about-us-heading" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ℹ️ About VIT Life
              </h2>
              <button 
                onClick={() => setShowAboutUs(false)} 
                aria-label="Close About Us dialog"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--text-secondary))',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>
                 Welcome to <strong>VIT Life</strong>, a premium, centralized ecosystem designed for student developers and tech enthusiasts. Our goal is to connect you with the latest events, hackathons, and club recruitment.
              </p>
              <p>
                Built by a dedicated team at the <strong>VIT Life Developer Network</strong>. We focus on modern interactions, premium aesthetics, and responsive performance.
              </p>
              <div style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--text-primary))', marginBottom: '0.5rem' }}>Core Mission</h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Promote collaborative peer learning and mentorship</li>
                  <li>Provide real-time visibility into club activities</li>
                  <li>Enable interactive project showreels and skill maps</li>
                </ul>
              </div>
              <div style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1rem', fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', justifyContent: 'space-between' }}>
                <span>Version 2.1.0</span>
                <span>© {new Date().getFullYear()} VIT Life Devs</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFeedback && (
        <Suspense fallback={null}>
          <FeedbackModal
            user={user}
            onClose={() => setShowFeedback(false)}
          />
        </Suspense>
      )}
      {/* Mobile Bottom Navigation (Dock) */}
      {(() => {
        const dockItems = [];
        
        // 1. Home (Always first)
        dockItems.push({
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ),
          label: 'Home',
          onClick: () => handleTabClick('dashboard'),
          className: activeTab === 'dashboard' ? 'active' : ''
        });

        if (user) {
          // Logged in user order: Home, Community, Chat (Center), Opps, College Life
          
          // 2. Community
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Community',
            onClick: () => handleTabClick('community'),
            className: activeTab === 'community' ? 'active' : ''
          });

          // 3. Chat (CENTER)
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Chat',
            onClick: () => handleTabClick('chats'),
            className: activeTab === 'chats' ? 'active' : ''
          });

          // 4. Opps
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Opps',
            onClick: () => handleTabClick('opportunities'),
            className: activeTab === 'opportunities' ? 'active' : ''
          });

          // 5. Guide (Admin always, student only if visible)
          if (guideVisible || user.role === 'admin') {
            dockItems.push({
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              label: 'Guide',
              onClick: () => handleTabClick('guide'),
              className: activeTab === 'guide' ? 'active' : ''
            });
          }

          // 6. College Life
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'College Life',
            onClick: () => handleTabClick('campus'),
            className: activeTab === 'campus' ? 'active' : ''
          });

        } else {
          // Guest order: Home, Community, Chat, Opps
          
          // 2. Community
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Community',
            onClick: () => handleTabClick('community'),
            className: activeTab === 'community' ? 'active' : ''
          });

          // 3. Chat (CENTER for Guests)
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Chat',
            onClick: () => handleTabClick('chats'),
            className: activeTab === 'chats' ? 'active' : ''
          });

          // 3. Opps
          dockItems.push({
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Opps',
            onClick: () => handleTabClick('opportunities'),
            className: activeTab === 'opportunities' ? 'active' : ''
          });

          // 4. Guide (Only if visible)
          if (guideVisible) {
            dockItems.push({
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ),
              label: 'Guide',
              onClick: () => handleTabClick('guide'),
              className: activeTab === 'guide' ? 'active' : ''
            });
          }
        }

        return (
          <Dock
            items={dockItems}
            panelHeight={52}
            baseItemSize={40}
            magnification={58}
            outerClassName={`${navHidden || activeTab === 'chats' ? 'nav-hidden' : ''}`}
          />
        );
      })()}

      {/* Mobile Profile Settings Bottom Sheet */}
      {showMobileProfileSheet && (
        <div className="modal-overlay" onClick={() => setShowMobileProfileSheet(false)}>
          <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="mobile-profile-heading" onClick={e => e.stopPropagation()} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 id="mobile-profile-heading" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>
                👤 Account & Settings
              </h2>
              <button 
                onClick={() => setShowMobileProfileSheet(false)} 
                aria-label="Close Account & Settings"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'hsl(var(--text-secondary))',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* User Info Block */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                {user && user.name ? user.name.substring(0, 2).toUpperCase() : 'DS'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'hsl(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? user.name : 'CDS Student'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                  {user && user.isVitBhopal 
                    ? `${getRegNumber()} • Sem ${user.semester || 1}` 
                    : (user && user.semester && user.semester !== 0 ? `Sem ${user.semester}` : 'Global User')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>ONLINE</span>
              </div>
            </div>

            {/* Settings Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => { setShowEditProfile(true); setShowMobileProfileSheet(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
              >
                ✏️ Edit Profile Name/Sem
              </button>
              <button 
                onClick={() => {
                  setShowMobileProfileSheet(false);
                  if (user?.isGuest) {
                    alert('🔒 You are currently in a Guest Session. Session management is enabled for registered student accounts.');
                  } else {
                    setShowEditProfile(true);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
              >
                🔒 Manage Active Sessions
              </button>
              <button 
                onClick={() => { setShowAboutUs(true); setShowMobileProfileSheet(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
              >
                ℹ️ About Platform
              </button>
              <a 
                href="https://github.com/aditya-dev06" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                🐙 Visit GitHub
              </a>
            </div>

            {/* Logout Action */}
            <button 
              onClick={() => { handleLogout(); setShowMobileProfileSheet(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.9rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '10px',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
