import { useState, useEffect, useCallback } from 'react';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🌟' },
  { key: 'tech', label: 'Tech', icon: '🖥️', color: '180, 80%, 55%' },
  { key: 'music', label: 'Music & Arts', icon: '🎵', color: '280, 70%, 60%' },
  { key: 'speakers', label: 'Speakers', icon: '🎤', color: '30, 90%, 55%' },
  { key: 'motivation', label: 'Social & Motivation', icon: '💡', color: '140, 60%, 50%' },
  { key: 'anime', label: 'Anime & Culture', icon: '🎌', color: '330, 75%, 60%' },
  { key: 'robotics', label: 'Robotics', icon: '🤖', color: '220, 75%, 55%' },
  { key: 'sports', label: 'Sports', icon: '🏅', color: '50, 85%, 55%' },
];

function getCategoryColor(categoryKey) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  return cat && cat.color ? cat.color : '263, 90%, 65%';
}

function getCategoryIcon(categoryKey) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  return cat ? cat.icon : '🌟';
}

function getDaysRemaining(dateStr) {
  if (!dateStr) return null;
  const eventDate = new Date(dateStr);
  const now = new Date();
  const diff = eventDate - now;
  if (diff <= 0) return null;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return dateStr; }
}

const ensureAbsoluteUrl = (urlStr) => {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

function ClubLogo({ club, category, size = 24, borderRadius = '50%' }) {
  const [error, setError] = useState(false);
  const icon = club?.icon;
  
  const isUrl = (str) => {
    if (!str) return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/uploads/') || str.startsWith('/');
  };

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid hsla(var(--border-glass))',
    borderRadius: borderRadius,
    overflow: 'hidden',
    flexShrink: 0
  };

  if (!icon || error) {
    const fallbackEmoji = icon && !isUrl(icon) ? icon : getCategoryIcon(category);
    return (
      <div style={containerStyle}>
        <span style={{ fontSize: `${size * 0.55}px`, lineHeight: 1 }}>{fallbackEmoji}</span>
      </div>
    );
  }

  if (isUrl(icon)) {
    return (
      <div style={containerStyle}>
        <img 
          src={icon} 
          alt={club?.name || ''} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          onError={() => setError(true)} 
        />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <span style={{ fontSize: `${size * 0.55}px`, lineHeight: 1 }}>{icon}</span>
    </div>
  );
}

export default function CampusLife({ user, token, clubs = [], events = [], fetchClubs, fetchEvents }) {
  const isAdmin = user && user.role === 'admin';
  const isManager = user && (user.role === 'club_manager' || user.role === 'admin');

  const [activeSubTab, setActiveSubTab] = useState('clubs');
  const [recruitments, setRecruitments] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateRecruitment, setShowCreateRecruitment] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [selectedClubDetails, setSelectedClubDetails] = useState(null);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  // ─── Data Fetching ───────────────────────────────────────────────
  const fetchRecruitments = async () => {
    try {
      const res = await fetch('/api/recruitments');
      const data = await res.json();
      setRecruitments(data.recruitments || []);
    } catch (err) {
      console.error('Failed to fetch recruitments:', err);
    }
  };

  const fetchAdminUsers = useCallback(async () => {
    if (!isAdmin || !token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchRecruitments();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'admin' && isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAdminUsers();
    }
  }, [activeSubTab, isAdmin, fetchAdminUsers]);

  // ─── Event CRUD ──────────────────────────────────────────────────
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete event.');
      }
    } catch {
      alert('Network error deleting event.');
    }
  };

  const handleCreateEvent = async (formData) => {
    setFormLoading(true);
    setError('');
    try {
      let posterUrl = formData.posterUrl ? ensureAbsoluteUrl(formData.posterUrl) : '';

      if (formData.posterFile) {
        const uploadData = new FormData();
        uploadData.append('poster', formData.posterFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadData
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload failed');
        }
        const uploadResult = await uploadRes.json();
        posterUrl = uploadResult.url;
      }

      const body = {
        title: formData.title,
        description: formData.description,
        clubId: formData.clubId,
        clubName: formData.clubName,
        category: formData.category,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        posterUrl,
        registrationLink: formData.registrationLink ? ensureAbsoluteUrl(formData.registrationLink) : '',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowCreateEvent(false);
        await fetchEvents();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create event.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create event.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleStartEditClub = (club) => {
    setEditingClub(club);
  };

  const handleSaveClub = async (clubData) => {
    setFormLoading(true);
    try {
      let finalIcon = clubData.iconUrl;

      if (clubData.iconMode === 'file' && clubData.iconFile) {
        const uploadData = new FormData();
        uploadData.append('poster', clubData.iconFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadData
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Upload failed');
        }
        const uploadResult = await uploadRes.json();
        finalIcon = uploadResult.url;
      }

      const body = {
        description: clubData.description,
        icon: finalIcon,
        memberCount: clubData.memberCount,
        socialLinks: {
          instagram: clubData.socialLinks?.instagram ? ensureAbsoluteUrl(clubData.socialLinks.instagram) : '',
          linkedin: clubData.socialLinks?.linkedin ? ensureAbsoluteUrl(clubData.socialLinks.linkedin) : ''
        }
      };

      const res = await fetch(`/api/clubs/${clubData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update club.');
      }

      await fetchClubs();
      setEditingClub(null);
      alert('Club updated successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Recruitment CRUD ────────────────────────────────────────────
  const handleDeleteRecruitment = async (recId) => {
    if (!window.confirm('Are you sure you want to delete this recruitment?')) return;
    try {
      const res = await fetch(`/api/recruitments/${recId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchRecruitments();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete recruitment.');
      }
    } catch {
      alert('Network error deleting recruitment.');
    }
  };

  const handleCreateRecruitment = async (formData) => {
    setFormLoading(true);
    setError('');
    try {
      const body = {
        clubId: formData.clubId,
        clubName: formData.clubName,
        title: formData.title,
        positions: formData.positions ? formData.positions.split(',').map(p => p.trim()).filter(Boolean) : [],
        description: formData.description,
        eligibility: formData.eligibility,
        deadline: formData.deadline,
        applicationLink: formData.applicationLink
      };

      const res = await fetch('/api/recruitments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowCreateRecruitment(false);
        await fetchRecruitments();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create recruitment.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create recruitment.');
    } finally {
      setFormLoading(false);
    }
  };

  // ─── Admin Actions ───────────────────────────────────────────────
  const handlePromote = async (email, role, clubId) => {
    if (!role) { alert('Please select a role.'); return; }
    if (role === 'club_manager' && !clubId) { alert('Please select a club.'); return; }
    try {
      const res = await fetch('/api/admin/promote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, role, clubId: role === 'admin' ? undefined : clubId })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'User promoted!');
        await fetchAdminUsers();
      } else {
        alert(data.error || 'Failed to promote user.');
      }
    } catch {
      alert('Network error promoting user.');
    }
  };

  const handleDemote = async (email) => {
    if (!window.confirm(`Demote ${email} to student?`)) return;
    try {
      const res = await fetch('/api/admin/demote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'User demoted!');
        await fetchAdminUsers();
      } else {
        alert(data.error || 'Failed to demote user.');
      }
    } catch {
      alert('Network error demoting user.');
    }
  };

  // ─── Filtering ───────────────────────────────────────────────────
  const filteredClubs = selectedCategory === 'all'
    ? clubs
    : clubs.filter(c => c.category === selectedCategory);

  const filteredEvents = selectedCategory === 'all'
    ? events
    : events.filter(e => e.category === selectedCategory);

  // Sort events so pinned ones are always at the top, and then sort by date ascending
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(a.date) - new Date(b.date);
  });

  // ─── Sub-tabs ────────────────────────────────────────────────────
  const SUB_TABS = [
    { key: 'clubs', label: '🏛️ Clubs' },
    { key: 'events', label: '📅 Events' },
    { key: 'recruitments', label: '📢 Recruitment' },
    ...(isAdmin ? [{ key: 'admin', label: '⚙️ Admin' }] : [])
  ];

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="campus-container">
        <div className="section-header">
          <h1 className="section-title">Campus Life</h1>
          <p className="section-subtitle">Loading campus data...</p>
        </div>
        <div className="empty-state">
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 1.5s ease-in-out infinite' }}>🎪</div>
          <p>Fetching clubs, events & more...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campus-container">
      {/* Header */}
      <div className="section-header">
        <h1 className="section-title">Campus Life</h1>
        <p className="section-subtitle">
          Discover clubs, events, and opportunities across VIT Bhopal campus.
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="campus-tabs">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            className={`campus-tab ${activeSubTab === tab.key ? 'active' : ''}`}
            onClick={() => { setActiveSubTab(tab.key); setSelectedCategory('all'); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category chips — visible for clubs and events */}
      {(activeSubTab === 'clubs' || activeSubTab === 'events') && (
        <div className="category-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`category-chip ${selectedCategory === cat.key ? 'active' : ''}`}
              style={cat.color ? { '--cat-color': cat.color } : {}}
              onClick={() => setSelectedCategory(cat.key)}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ═══════════════ TAB 1: CLUBS ═══════════════ */}
      {activeSubTab === 'clubs' && (
        <>
          {filteredClubs.length > 0 ? (
            <div className="opp-grid">
              {filteredClubs.map(club => {
                const catColor = getCategoryColor(club.category);
                const canEditClub = isAdmin || (user && user.role === 'club_manager' && user.clubId === club.id);
                return (
                  <div 
                    key={club.id} 
                    className="glass-card club-card" 
                    onClick={() => setSelectedClubDetails(club)}
                    style={{ '--cat-color': catColor, display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <ClubLogo club={club} category={club.category} size={48} borderRadius="12px" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{
                          fontSize: '1.05rem', fontWeight: 700,
                          color: 'hsl(var(--text-primary))',
                          margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {club.name}
                        </h3>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.7rem', fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: `hsla(${catColor} / 0.15)`,
                          color: `hsl(${catColor})`,
                          marginTop: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {club.category}
                        </span>
                      </div>
                    </div>
                    <p style={{
                      fontSize: '0.85rem', lineHeight: 1.55,
                      color: 'hsl(var(--text-secondary))',
                      marginBottom: '0.75rem',
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                      {club.description}
                    </p>

                    {club.socialLinks && (club.socialLinks.instagram || club.socialLinks.linkedin) && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
                        {club.socialLinks.instagram && (
                          <a href={club.socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                            📸 Instagram
                          </a>
                        )}
                        {club.socialLinks.instagram && club.socialLinks.linkedin && <span style={{ color: 'hsla(var(--border-glass))' }}>|</span>}
                        {club.socialLinks.linkedin && (
                          <a href={club.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--text-muted))', textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
                            🔗 LinkedIn
                          </a>
                        )}
                      </div>
                    )}

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderTop: '1px solid hsla(var(--border-glass))',
                      paddingTop: '0.6rem', marginTop: 'auto'
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                        👥 {club.memberCount} members
                      </span>
                      {canEditClub && (
                        <button 
                          type="button" 
                          onClick={(e) => { e.stopPropagation(); handleStartEditClub(club); }}
                          className="btn-promote"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          ⚙️ Edit Club
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p>No clubs found in this category.</p>
            </div>
          )}

          {editingClub && (
            <EditClubModal
              club={editingClub}
              onClose={() => setEditingClub(null)}
              onSubmit={handleSaveClub}
              loading={formLoading}
            />
          )}
        </>
      )}

      {/* ═══════════════ TAB 2: EVENTS ═══════════════ */}
      {activeSubTab === 'events' && (
        <>
          {sortedEvents.length > 0 ? (
            <div className="event-masonry-grid">
              {sortedEvents.map(event => {
                const daysLeft = getDaysRemaining(event.date);
                const catColor = getCategoryColor(event.category);
                const eventClub = clubs.find(c => c.id === event.clubId);
                const clubName = eventClub ? eventClub.name : event.clubName || 'Unknown Club';

                return (
                  <div 
                    key={event.id} 
                    className="glass-card event-card event-masonry-card"
                    onClick={() => setSelectedEventDetails(event)}
                    style={{ 
                      cursor: 'pointer',
                      position: 'relative',
                      border: event.pinned ? '1px solid hsla(var(--primary) / 0.5)' : '1px solid hsla(var(--border-glass))',
                      boxShadow: event.pinned ? '0 0 15px hsla(var(--primary) / 0.15)' : 'none'
                    }}
                  >
                    {event.pinned && (
                      <div style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        zIndex: 5,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        📌 Featured
                      </div>
                    )}

                    {event.posterUrl && (
                      <img
                        src={event.posterUrl}
                        alt={event.title}
                        className="event-poster-dynamic"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0, flex: 1 }}>
                          {event.title}
                        </h3>
                        {daysLeft !== null && (
                          <span className="countdown-badge">
                            ⏰ {daysLeft}d left
                          </span>
                        )}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.3rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: `hsl(${catColor})`
                      }}>
                        <ClubLogo club={eventClub} category={event.category} size={24} borderRadius="50%" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName}</span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }}>
                        {event.date && <span>📅 {formatDate(event.date)}</span>}
                        {event.venue && <span>📍 {event.venue}</span>}
                      </div>

                      {isAdmin && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await fetch(`/api/events/${event.id}/pin`, {
                                  method: 'PUT',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  }
                                });
                                if (res.ok) {
                                  await fetchEvents();
                                } else {
                                  const data = await res.json();
                                  alert(data.error || 'Failed to toggle pin.');
                                }
                              } catch {
                                alert('Network error toggling pin.');
                              }
                            }}
                            className="btn-promote"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                          >
                            {event.pinned ? '📍 Unpin' : '📌 Pin'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>📅</span>
              <p>No events yet. {isManager ? 'Be the first to create one!' : 'Check back soon!'}</p>
            </div>
          )}

          {/* FAB: Create Event */}
          {isManager && (
            <button
              className="fab-create"
              onClick={() => setShowCreateEvent(true)}
              title="Create Event"
            >
              ➕
            </button>
          )}

          {/* Create Event Modal */}
          {showCreateEvent && (
            <CreateEventModal
              clubs={clubs}
              user={user}
              onSubmit={handleCreateEvent}
              onClose={() => { setShowCreateEvent(false); setError(''); }}
              loading={formLoading}
              error={error}
            />
          )}
        </>
      )}

      {/* ═══════════════ TAB 3: RECRUITMENTS ═══════════════ */}
      {activeSubTab === 'recruitments' && (
        <>
          {recruitments.length > 0 ? (
            <div className="opp-grid">
              {recruitments.map(rec => {
                const daysLeft = getDaysRemaining(rec.deadline);
                const canDelete = isAdmin || (user && rec.createdBy === user.email);
                return (
                  <div key={rec.id} className="glass-card recruitment-card">
                    <div style={{ padding: '1.25rem' }}>
                      {rec.clubName && (
                        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'hsl(var(--secondary))', marginBottom: '0.35rem' }}>
                          🏛️ {rec.clubName}
                        </p>
                      )}
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--text-primary))', marginBottom: '0.6rem' }}>
                        {rec.title}
                      </h3>

                      {rec.positions && rec.positions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.6rem' }}>
                          {rec.positions.map((pos, i) => (
                            <span key={i} style={{
                              fontSize: '0.72rem', fontWeight: 600,
                              padding: '3px 10px', borderRadius: '999px',
                              background: 'hsla(var(--primary) / 0.15)',
                              color: 'hsl(var(--primary))',
                              border: '1px solid hsla(var(--primary) / 0.25)'
                            }}>
                              {pos}
                            </span>
                          ))}
                        </div>
                      )}

                      {rec.description && (
                        <p style={{
                          fontSize: '0.83rem', lineHeight: 1.5,
                          color: 'hsl(var(--text-secondary))',
                          marginBottom: '0.5rem',
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {rec.description}
                        </p>
                      )}

                      {rec.eligibility && (
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.5rem' }}>
                          ✅ <strong>Eligibility:</strong> {rec.eligibility}
                        </p>
                      )}

                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '0.7rem', marginTop: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {rec.deadline && (
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                              📅 Deadline: {formatDate(rec.deadline)}
                            </span>
                          )}
                          {daysLeft !== null && (
                            <span className="countdown-badge">
                              ⏰ {daysLeft}d
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.7rem' }}>
                        {rec.applicationLink && (
                          <button
                            className="btn-apply"
                            onClick={() => window.open(rec.applicationLink, '_blank')}
                          >
                            📝 Apply Now
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeleteRecruitment(rec.id)}
                            title="Delete recruitment"
                            style={{
                              marginLeft: 'auto', background: 'hsla(0, 80%, 55%, 0.15)',
                              border: '1px solid hsla(0, 80%, 55%, 0.3)', borderRadius: '8px',
                              padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem',
                              color: 'hsl(0, 80%, 65%)', transition: 'all 0.2s ease'
                            }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>📢</span>
              <p>No active recruitments. {isManager ? 'Post one for your club!' : 'Check back soon!'}</p>
            </div>
          )}

          {/* FAB: Create Recruitment */}
          {isManager && (
            <button
              className="fab-create"
              onClick={() => setShowCreateRecruitment(true)}
              title="Post Recruitment"
            >
              ➕
            </button>
          )}

          {/* Create Recruitment Modal */}
          {showCreateRecruitment && (
            <CreateRecruitmentModal
              clubs={clubs}
              user={user}
              onSubmit={handleCreateRecruitment}
              onClose={() => { setShowCreateRecruitment(false); setError(''); }}
              loading={formLoading}
              error={error}
            />
          )}
        </>
      )}

      {/* ═══════════════ TAB 4: ADMIN ═══════════════ */}
      {activeSubTab === 'admin' && isAdmin && (
        <AdminPanel
          users={adminUsers}
          clubs={clubs}
          onPromote={handlePromote}
          onDemote={handleDemote}
          currentUserEmail={user?.email}
        />
      )}

      {selectedClubDetails && (
        <ClubDetailsModal
          club={selectedClubDetails}
          onClose={() => setSelectedClubDetails(null)}
        />
      )}

      {selectedEventDetails && (
        <EventDetailsModal
          event={selectedEventDetails}
          onClose={() => setSelectedEventDetails(null)}
          user={user}
          token={token}
          clubs={clubs}
          fetchEvents={fetchEvents}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
    </div>
  );
}

function ClubDetailsModal({ club, onClose }) {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await fetch(`/api/clubs/${club.id}/managers`);
        if (res.ok) {
          const data = await res.json();
          setManagers(data.managers || []);
        }
      } catch (err) {
        console.error("Failed to fetch managers:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchManagers();
  }, [club.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClubLogo club={club} category={club.category} size={56} borderRadius="12px" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{club.name}</h2>
              <span className="club-category-badge" style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                {club.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '1.25rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>About the Club</h4>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
              {club.description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid hsla(var(--border-glass))' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Members</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(var(--text-primary))' }}>👥 {club.memberCount} members</div>
            </div>
          </div>

          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Club Leaders</h4>
            {loading ? (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: 0 }}>Loading leaders...</p>
            ) : managers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {managers.map((m, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', border: '1px solid hsla(var(--border-glass))' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{m.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--secondary))', textTransform: 'uppercase' }}>
                      {m.designation || 'Club Manager'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: 0 }}>No leaders registered for this club.</p>
            )}
          </div>

          {club.socialLinks && (club.socialLinks.instagram || club.socialLinks.linkedin) && (
            <div>
              <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Social Media Links</h4>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                {club.socialLinks.instagram && (
                  <a href={club.socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--primary))', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>
                    📸 Instagram
                  </a>
                )}
                {club.socialLinks.linkedin && (
                  <a href={club.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--secondary))', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>
                    🔗 LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventDetailsModal({ event, onClose, user, token, clubs, fetchEvents, onDeleteEvent }) {
  const isAdmin = user && user.role === 'admin';
  const canDelete = isAdmin || (user && event.createdBy === user.email);
  const catColor = getCategoryColor(event.category);
  const regUrl = event.registrationLink || `mailto:${event.createdBy}`;

  const handleTogglePin = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle pin status.');
      }
    } catch {
      alert('Network error toggling pin status.');
    }
  };

  const handleDelete = async () => {
    if (onDeleteEvent) {
      await onDeleteEvent(event.id);
      onClose();
    } else {
      if (!window.confirm('Are you sure you want to delete this event?')) return;
      try {
        const res = await fetch(`/api/events/${event.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          await fetchEvents();
          onClose();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to delete event.');
        }
      } catch {
        alert('Network error deleting event.');
      }
    }
  };

  const eventClub = clubs.find(c => c.id === event.clubId);
  const clubName = eventClub ? eventClub.name : event.clubName || 'Unknown Club';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'hsl(var(--text-primary))' }}>{event.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: `hsl(${catColor})` }}>
              <ClubLogo club={eventClub} category={event.category} size={24} borderRadius="50%" />
              <span>Hosted by {clubName}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', fontSize: '1.25rem', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {event.posterUrl && (
          <div style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1.25rem', border: '1px solid hsla(var(--border-glass))' }}>
            <img src={event.posterUrl} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Event Description</h4>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
              {event.description}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid hsla(var(--border-glass))' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Date</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>📅 {formatDate(event.date)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Time</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>🕐 {event.time}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Venue</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>📍 {event.venue}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Category</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: `hsl(${catColor})`, textTransform: 'capitalize' }}>
                {getCategoryIcon(event.category)} {event.category}
              </div>
            </div>
          </div>

          {event.tags && event.tags.length > 0 && (
            <div>
              <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {event.tags.map((tag, i) => (
                  <span key={i} className="opp-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
            📧 <strong>Created by:</strong> {event.createdBy}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <a
              className="btn-register"
              href={regUrl}
              target={event.registrationLink ? "_blank" : undefined}
              rel={event.registrationLink ? "noopener noreferrer" : undefined}
              style={{ textDecoration: 'none', flexGrow: 1, textAlign: 'center', justifyContent: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              {event.registrationLink ? '🔗 Register Now' : '✉️ Contact Host'}
            </a>
            
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
                title={event.pinned ? "Unpin Event" : "Pin Event"}
                className={`btn-cancel`}
                style={{ 
                  padding: '0.55rem 1rem', 
                  fontSize: '0.8rem', 
                  borderColor: event.pinned ? 'hsl(var(--primary))' : 'hsla(var(--border-glass))',
                  color: event.pinned ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                {event.pinned ? '📍 Unpin' : '📌 Pin'}
              </button>
            )}

            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                title="Delete event"
                style={{
                  background: 'hsla(0, 80%, 55%, 0.15)',
                  border: '1px solid hsla(0, 80%, 55%, 0.3)', 
                  borderRadius: '8px',
                  padding: '0.55rem 1rem', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  color: 'hsl(0, 80%, 65%)', 
                  transition: 'all 0.2s ease',
                  fontWeight: 600
                }}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Edit Club Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EditClubModal({ club, onClose, onSubmit, loading }) {
  const [description, setDescription] = useState(club.description || '');
  const [iconMode, setIconMode] = useState('url'); // 'url' | 'file'
  const [iconUrl, setIconUrl] = useState(() => {
    return club.icon || '';
  });
  const [iconFile, setIconFile] = useState(null);
  const [memberCount, setMemberCount] = useState(club.memberCount || 0);
  const [insta, setInsta] = useState(club.socialLinks?.instagram || '');
  const [linkedin, setLinkedin] = useState(club.socialLinks?.linkedin || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) { alert('Description is required.'); return; }
    
    onSubmit({
      id: club.id,
      description: description.trim(),
      iconMode,
      iconUrl: iconMode === 'url' ? iconUrl.trim() : '',
      iconFile: iconMode === 'file' ? iconFile : null,
      memberCount: parseInt(memberCount, 10),
      socialLinks: {
        instagram: insta.trim(),
        linkedin: linkedin.trim()
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            ⚙️ Edit Club: {club.name}
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Club Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell us about the club..."
              required
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Active Members Count *</label>
            <input
              type="number"
              min="0"
              value={memberCount}
              onChange={e => setMemberCount(e.target.value)}
              placeholder="e.g. 150"
              required
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            />
          </div>

          <div className="form-group">
            <label>Club Logo / Icon</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => setIconMode('url')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: iconMode === 'url' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: iconMode === 'url' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >🔗 URL / Emoji</button>
              <button type="button" onClick={() => setIconMode('file')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: iconMode === 'file' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: iconMode === 'file' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >📁 Upload</button>
            </div>
            {iconMode === 'url' ? (
              <input type="text" value={iconUrl} onChange={e => setIconUrl(e.target.value)} placeholder="Enter emoji (e.g. 🖥️) or absolute URL" />
            ) : (
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={e => setIconFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                  color: 'hsl(var(--text-primary))', fontSize: '0.85rem'
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Instagram URL</label>
            <input
              type="url"
              value={insta}
              onChange={e => setInsta(e.target.value)}
              placeholder="https://instagram.com/clubname"
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            />
          </div>

          <div className="form-group">
            <label>LinkedIn URL</label>
            <input
              type="url"
              value={linkedin}
              onChange={e => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/company/clubname"
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Create Event Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CreateEventModal({ clubs, user, onSubmit, onClose, loading, error }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clubId, setClubId] = useState(user?.clubId || '');
  const [category, setCategory] = useState('tech');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [posterMode, setPosterMode] = useState('url'); // 'url' | 'file'
  const [posterUrl, setPosterUrl] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [registrationLink, setRegistrationLink] = useState('');
  const [tags, setTags] = useState('');

  const selectedClub = clubs.find(c => c.id === clubId);
  const clubName = selectedClub ? selectedClub.name : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!date) { alert('Date is required.'); return; }
    if (!clubId) { alert('Please select a club.'); return; }
    if (!category) { alert('Please select a category.'); return; }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      clubId,
      clubName,
      category,
      date,
      time: time.trim(),
      venue: venue.trim(),
      posterUrl: posterMode === 'url' ? posterUrl.trim() : '',
      posterFile: posterMode === 'file' ? posterFile : null,
      registrationLink: registrationLink.trim(),
      tags: tags.trim()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            📅 Create Event
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
          }}>✕</button>
        </div>

        {error && (
          <div style={{
            background: 'hsla(0, 80%, 55%, 0.12)', border: '1px solid hsla(0, 80%, 55%, 0.3)',
            borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '1rem',
            fontSize: '0.83rem', color: 'hsl(0, 80%, 65%)'
          }}>{error}</div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this event about?" rows={3}
              style={{
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                background: 'hsla(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                color: 'hsl(var(--text-primary))', fontSize: '0.9rem', resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Club *</label>
              <select 
                value={clubId} 
                onChange={e => setClubId(e.target.value)} 
                required
                disabled={user?.role === 'club_manager'}
                style={{
                  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                  background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                  color: '#fff', fontSize: '0.9rem',
                  opacity: user?.role === 'club_manager' ? 0.7 : 1,
                  cursor: user?.role === 'club_manager' ? 'not-allowed' : 'default'
                }}
              >
                <option value="">Select club...</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} required
                style={{
                  width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                  background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                  color: 'hsl(var(--text-primary))', fontSize: '0.9rem'
                }}
              >
                {CATEGORIES.filter(c => c.key !== 'all').map(c => (
                  <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Venue</label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., Auditorium, AB-1 Room 203" />
          </div>

          <div className="form-group">
            <label>Poster</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => setPosterMode('url')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: posterMode === 'url' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: posterMode === 'url' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >🔗 URL</button>
              <button type="button" onClick={() => setPosterMode('file')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: posterMode === 'file' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: posterMode === 'file' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >📁 Upload</button>
            </div>
            {posterMode === 'url' ? (
              <input type="url" value={posterUrl} onChange={e => setPosterUrl(e.target.value)} placeholder="https://example.com/poster.jpg" />
            ) : (
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={e => setPosterFile(e.target.files?.[0] || null)}
                style={{
                  width: '100%', padding: '0.5rem', borderRadius: '8px',
                  background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                  color: 'hsl(var(--text-primary))', fontSize: '0.85rem'
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Registration Link</label>
            <input type="url" value={registrationLink} onChange={e => setRegistrationLink(e.target.value)} placeholder="Google Form URL" />
          </div>

          <div className="form-group">
            <label>Tags (comma-separated)</label>
            <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., hackathon, AI, workshop" />
          </div>

          <button type="submit" className="btn-register" disabled={loading}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Creating...' : '🚀 Create Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Create Recruitment Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function CreateRecruitmentModal({ clubs, user, onSubmit, onClose, loading, error }) {
  const [clubId, setClubId] = useState(user?.clubId || '');
  const [title, setTitle] = useState('');
  const [positions, setPositions] = useState('');
  const [description, setDescription] = useState('');
  const [eligibility, setEligibility] = useState('');
  const [deadline, setDeadline] = useState('');
  const [applicationLink, setApplicationLink] = useState('');

  const selectedClub = clubs.find(c => c.id === clubId);
  const clubName = selectedClub ? selectedClub.name : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clubId) { alert('Please select a club.'); return; }
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!deadline) { alert('Deadline is required.'); return; }

    onSubmit({
      clubId,
      clubName,
      title: title.trim(),
      positions: positions.trim(),
      description: description.trim(),
      eligibility: eligibility.trim(),
      deadline,
      applicationLink: applicationLink.trim()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            📢 Post Recruitment
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
          }}>✕</button>
        </div>

        {error && (
          <div style={{
            background: 'hsla(0, 80%, 55%, 0.12)', border: '1px solid hsla(0, 80%, 55%, 0.3)',
            borderRadius: '8px', padding: '0.6rem 0.8rem', marginBottom: '1rem',
            fontSize: '0.83rem', color: 'hsl(0, 80%, 65%)'
          }}>{error}</div>
        )}

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Club *</label>
            <select value={clubId} onChange={e => setClubId(e.target.value)} required
              style={{
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                color: 'hsl(var(--text-primary))', fontSize: '0.9rem'
              }}
            >
              <option value="">Select club...</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Core Committee 2025 Recruitment" required />
          </div>

          <div className="form-group">
            <label>Open Positions (comma-separated)</label>
            <input type="text" value={positions} onChange={e => setPositions(e.target.value)} placeholder="e.g., Secretary, Tech Lead, Design Head" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the recruitment details..." rows={3}
              style={{
                width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px',
                background: 'hsla(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                color: 'hsl(var(--text-primary))', fontSize: '0.9rem', resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div className="form-group">
            <label>Eligibility</label>
            <input type="text" value={eligibility} onChange={e => setEligibility(e.target.value)} placeholder="e.g., Open to all 1st & 2nd year students" />
          </div>

          <div className="form-group">
            <label>Deadline *</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Application Link</label>
            <input type="url" value={applicationLink} onChange={e => setApplicationLink(e.target.value)} placeholder="Google Form URL" />
          </div>

          <button type="submit" className="btn-apply" disabled={loading}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', marginTop: '0.5rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '⏳ Posting...' : '📢 Post Recruitment'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Admin Panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function AdminPanel({ users, clubs, onPromote, onDemote, currentUserEmail }) {
  const [promoteRoles, setPromoteRoles] = useState({}); // { [email]: 'club_manager' | 'admin' }
  const [promoteClubs, setPromoteClubs] = useState({}); // { [email]: clubId }

  if (users.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: '3rem' }}>⚙️</span>
        <p>No users found or still loading...</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Club</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => {
            const isMe = u.email && currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase();
            const isPrimary = u.isPrimaryAdmin;
            const selectedRole = promoteRoles[u.email] || 'club_manager';
            const selectedClub = promoteClubs[u.email] || '';

            return (
              <tr key={u.email || idx}>
                <td>{u.name || '—'}</td>
                <td style={{ fontSize: '0.82rem', color: 'hsl(var(--text-muted))' }}>{u.email}</td>
                <td>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: u.role === 'admin'
                      ? 'hsla(var(--accent) / 0.15)'
                      : u.role === 'club_manager'
                        ? 'hsla(var(--secondary) / 0.15)'
                        : 'hsla(var(--text-muted) / 0.15)',
                    color: u.role === 'admin'
                      ? 'hsl(var(--accent))'
                      : u.role === 'club_manager'
                        ? 'hsl(var(--secondary))'
                        : 'hsl(var(--text-muted))'
                  }}>
                    {u.role || 'student'}
                  </span>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{u.clubId || '—'}</td>
                <td>
                  {isPrimary ? (
                    <span style={{ fontSize: '0.78rem', color: 'hsl(var(--accent))', fontWeight: 600 }}>👑 Primary Admin</span>
                  ) : isMe ? (
                    <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>You (Logged In)</span>
                  ) : u.role === 'admin' ? (
                    <button
                      className="btn-demote"
                      onClick={() => onDemote(u.email)}
                    >
                      ⬇ Demote to Student
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={selectedRole}
                        onChange={e => setPromoteRoles(prev => ({ ...prev, [u.email]: e.target.value }))}
                        style={{
                          padding: '0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '6px',
                          background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                          color: 'hsl(var(--text-primary))', width: '120px'
                        }}
                      >
                        <option value="club_manager">Club Manager</option>
                        <option value="admin">Admin</option>
                      </select>

                      {selectedRole === 'club_manager' && (
                        <select
                          value={selectedClub}
                          onChange={e => setPromoteClubs(prev => ({ ...prev, [u.email]: e.target.value }))}
                          style={{
                            padding: '0.3rem 0.5rem', fontSize: '0.78rem', borderRadius: '6px',
                            background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                            color: 'hsl(var(--text-primary))', maxWidth: '140px'
                          }}
                        >
                          <option value="">Pick club...</option>
                          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}

                      <button
                        className="btn-promote"
                        onClick={() => onPromote(u.email, selectedRole, selectedClub)}
                        disabled={selectedRole === 'club_manager' && !selectedClub}
                      >
                        ⬆ Promote
                      </button>

                      {u.role === 'club_manager' && (
                        <button
                          className="btn-demote"
                          onClick={() => onDemote(u.email)}
                        >
                          ⬇ Demote
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
