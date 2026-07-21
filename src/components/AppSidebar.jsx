import {
  LayoutDashboard,
  Target,
  Users,
  CalendarDays,
  BookOpen,
  PartyPopper,
  MessageSquare,
  Info,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Download,
  Sun,
  Moon,
} from 'lucide-react';
import './AppSidebar.css';

const GithubIcon = ({ size = 18, className = '' }) => (
  <svg height={size} width={size} viewBox="0 0 16 16" fill="currentColor" className={className}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboard, alwaysVisible: true },
  { id: 'opportunities', label: 'Opportunities Hub', icon: Target,          alwaysVisible: true },
  { id: 'community',     label: 'Student Community', icon: Users,           alwaysVisible: true },
  { id: 'timetable',     label: 'Schedule',          icon: CalendarDays,    requiresAuth: true  },
  { id: 'guide',         label: 'VIT Bhopal Guide',  icon: BookOpen,        requiresGuide: true },
  { id: 'campus',        label: 'College Life',      icon: PartyPopper,     requiresAuth: true  },
];

export default function AppSidebar({
  user,
  activeTab,
  onTabClick,
  guideVisible,
  profileSyncStatus,
  installPrompt,
  onInstallApp,
  onFeedback,
  onAboutUs,
  onLogout,
  theme,
  onToggleTheme,
  onEditProfile,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Sync body class for main content margin shifting
  useEffect(() => {
    if (isMobile) {
      document.body.classList.remove('sidebar-collapsed');
      document.body.classList.toggle('sidebar-open', mobileOpen);
    } else {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      document.body.classList.toggle('sidebar-open', !collapsed);
    }
    return () => {
      document.body.classList.remove('sidebar-collapsed', 'sidebar-open');
    };
  }, [collapsed, isMobile, mobileOpen]);

  // Detect mobile
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close mobile sidebar on tab change
  useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  const handleTabClick = (id) => {
    onTabClick(id);
    if (isMobile) setMobileOpen(false);
  };

  const syncIcon = () => {
    if (user?.isGuest) return <WifiOff size={12} />;
    if (profileSyncStatus === 'synced') return <Wifi size={12} />;
    if (profileSyncStatus === 'syncing') return <Loader2 size={12} className="spin" />;
    return <WifiOff size={12} />;
  };

  const syncLabel = () => {
    if (user?.isGuest) return 'Local only';
    if (profileSyncStatus === 'synced') return 'Synced';
    if (profileSyncStatus === 'syncing') return 'Syncing…';
    return 'Offline';
  };

  const isOpen = isMobile ? mobileOpen : !collapsed;

  return (
    <>
      {/* Mobile hamburger trigger */}
      {isMobile && (
        <button
          className="sidebar-mobile-trigger"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Toggle navigation"
        >
          <span /><span /><span />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── The Sidebar ── */}
      <aside className={`app-sidebar ${isOpen ? 'open' : 'collapsed'} ${isMobile ? 'mobile' : ''}`}>

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark">VL</span>
            {isOpen && <span className="sidebar-brand-name">VIT Life</span>}
          </div>
          {!isMobile && (
            <button
              className="sidebar-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          )}
        </div>

        {/* User info */}
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            {isOpen && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name || 'User'}</span>
                <span className="sidebar-user-role">
                  {user?.isGuest ? 'Guest' : user?.role === 'admin' ? 'Admin' : 'Student'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Main nav */}
        <nav className="sidebar-nav">
          <ul>
            {NAV_ITEMS.map(({ id, label, icon: Icon, alwaysVisible, requiresAuth, requiresGuide }) => {
              if (requiresAuth && !user) return null;
              if (requiresGuide && !guideVisible && !(user?.role === 'admin')) return null;

              const isActive = activeTab === id;
              return (
                <li key={id}>
                  <button
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleTabClick(id)}
                    title={!isOpen ? label : undefined}
                  >
                    <Icon size={18} className="sidebar-nav-icon" />
                    {isOpen && <span className="sidebar-nav-label">{label}</span>}
                    {isOpen && isActive && <span className="sidebar-nav-pip" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Secondary nav */}
        <nav className="sidebar-nav sidebar-nav--secondary">
          <ul>
            <li>
              <button
                className="sidebar-nav-item"
                onClick={onFeedback}
                title={!isOpen ? 'Feedback' : undefined}
              >
                <MessageSquare size={18} className="sidebar-nav-icon" />
                {isOpen && <span className="sidebar-nav-label">Give Feedback</span>}
              </button>
            </li>
            <li>
              <button
                className="sidebar-nav-item"
                onClick={onAboutUs}
                title={!isOpen ? 'About Us' : undefined}
              >
                <Info size={18} className="sidebar-nav-icon" />
                {isOpen && <span className="sidebar-nav-label">About Us</span>}
              </button>
            </li>
            <li>
              <button
                className="sidebar-nav-item"
                onClick={() => window.open('https://github.com/aditya-dev06', '_blank', 'noopener,noreferrer')}
                title={!isOpen ? 'GitHub' : undefined}
              >
                <GithubIcon size={18} className="sidebar-nav-icon" />
                {isOpen && <span className="sidebar-nav-label">GitHub</span>}
              </button>
            </li>
            {onEditProfile && user && !user.isGuest && (
              <li>
                <button
                  className="sidebar-nav-item"
                  onClick={onEditProfile}
                  title={!isOpen ? 'Edit Profile' : undefined}
                >
                  <Settings size={18} className="sidebar-nav-icon" />
                  {isOpen && <span className="sidebar-nav-label">Edit Profile</span>}
                </button>
              </li>
            )}
            {onToggleTheme && (
              <li>
                <button
                  className="sidebar-nav-item"
                  onClick={onToggleTheme}
                  title={!isOpen ? `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode` : undefined}
                >
                  {theme === 'dark' ? (
                    <Sun size={18} className="sidebar-nav-icon" />
                  ) : (
                    <Moon size={18} className="sidebar-nav-icon" />
                  )}
                  {isOpen && (
                    <span className="sidebar-nav-label">
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  )}
                </button>
              </li>
            )}
            {installPrompt && (
              <li>
                <button
                  className="sidebar-nav-item sidebar-nav-item--install"
                  onClick={onInstallApp}
                  title={!isOpen ? 'Install App' : undefined}
                >
                  <Download size={18} className="sidebar-nav-icon" />
                  {isOpen && <span className="sidebar-nav-label">Install App</span>}
                </button>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer — sync status + logout */}
        <div className="sidebar-footer">
          <div className="sidebar-sync" title={syncLabel()}>
            {syncIcon()}
            {isOpen && <span className="sidebar-sync-label">{syncLabel()}</span>}
          </div>
          {user && !user.isGuest && (
            <button
              className="sidebar-logout-btn"
              onClick={onLogout}
              title={!isOpen ? 'Sign out' : undefined}
            >
              <LogOut size={16} />
              {isOpen && <span>Sign out</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
