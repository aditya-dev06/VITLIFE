import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import BounceCards from './BounceCards';
import Masonry from './Masonry';
import ElectricBorder from './ElectricBorder';

const eventTransformStyles = [
  'rotate(5deg) translate(-45px)',
  'rotate(2deg) translate(-22px)',
  'rotate(-1deg)',
  'rotate(-4deg) translate(22px)',
  'rotate(3deg) translate(45px)'
];

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🌟' },
  { key: 'tech', label: 'Tech', icon: '🖥️', color: '180, 75%, 52%' },
  { key: 'music', label: 'Music & Arts', icon: '🎵', color: '275, 75%, 64%' },
  { key: 'speakers', label: 'Speakers', icon: '🎤', color: '28, 80%, 56%' },
  { key: 'motivation', label: 'Social & Motivation', icon: '💡', color: '145, 60%, 50%' },
  { key: 'anime', label: 'Anime', icon: '🎌', color: '335, 80%, 64%' },
  { key: 'cultural', label: 'Cultural', icon: '🎭', color: '350, 75%, 60%' },
  { key: 'robotics', label: 'Robotics', icon: '🤖', color: '215, 85%, 60%' },
  { key: 'sports', label: 'Sports', icon: '🏅', color: '42, 80%, 54%' },
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
  if (isNaN(eventDate.getTime())) return null;
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

function formatDateTime(dtStr) {
  if (!dtStr) return '';
  try {
    return new Date(dtStr).toLocaleString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return dtStr; }
}

/**
 * Returns the status of an event:
 *  'ended'       — event has ended (eventEndDateTime passed)
 *  'ongoing'     — event is currently happening (start passed, end not passed)
 *  'reg_closed'  — registration deadline passed but event hasn't ended
 *  'reg_open'    — registration is still open
 *  'upcoming'    — fallback when no deadline/end dates exist
 */
function getEventStatus(event) {
  const now = new Date();
  const end = event.eventEndDateTime ? new Date(event.eventEndDateTime) : null;
  const start = event.eventStartDateTime ? new Date(event.eventStartDateTime) : (event.date ? new Date(event.date) : null);
  const regDeadline = event.registrationDeadline ? new Date(event.registrationDeadline) : null;

  if (end && now > end) return 'ended';
  if (start && now >= start && (!end || now <= end)) return 'ongoing';
  if (regDeadline && now > regDeadline) return 'reg_closed';
  if (regDeadline && now <= regDeadline) return 'reg_open';
  return 'upcoming';
}

function isEventTooOld(event) {
  const status = getEventStatus(event);
  if (status !== 'ended') return false;
  const end = event.eventEndDateTime ? new Date(event.eventEndDateTime) : null;
  const start = event.eventStartDateTime ? new Date(event.eventStartDateTime) : (event.date ? new Date(event.date) : null);
  const eventTime = end || start;
  if (!eventTime) return false;
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  return (new Date().getTime() - eventTime.getTime()) > threeDaysInMs;
}

function getStatusBadge(status) {
  switch (status) {
    case 'reg_open': return { text: '🟢 Registration Open', color: '140, 70%, 45%', bg: '140, 70%, 45%' };
    case 'ongoing': return { text: '🔵 Happening Now', color: '210, 80%, 60%', bg: '210, 80%, 60%' };
    case 'reg_closed': return { text: '🟡 Registration Closed', color: '40, 80%, 50%', bg: '40, 80%, 50%' };
    case 'ended': return { text: '🔴 Ended', color: '0, 60%, 55%', bg: '0, 60%, 55%' };
    default: return { text: '📅 Upcoming', color: '263, 70%, 60%', bg: '263, 70%, 60%' };
  }
}

function getCardOpacity(status) {
  switch (status) {
    case 'ended': return 0.4;
    case 'reg_closed': return 0.55;
    default: return 1;
  }
}

const STATUS_SORT_ORDER = { reg_open: 0, ongoing: 1, upcoming: 2, reg_closed: 3, ended: 4 };

const ensureAbsoluteUrl = (urlStr) => {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  // Block dangerous protocols
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return '';
  }
  // Handle protocol-relative URLs (//evil.com)
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
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

function EventCardItem({
  event,
  clubs,
  token,
  isAdmin,
  fetchEvents,
  setSelectedEventDetails,
  isOngoingSection = false,
  isMasonry = false,
  imgHeight
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [cardWidth, setCardWidth] = useState('280px'); // default width before image loads
  const [isHovered, setIsHovered] = useState(false);

  const catColor = getCategoryColor(event.category);
  const eventClub = clubs.find(c => c.id === event.clubId);
  const clubName = eventClub ? eventClub.name : event.clubName || 'Unknown Club';

  const status = getEventStatus(event);
  const badge = getStatusBadge(status);
  const opacity = isOngoingSection ? 1 : getCardOpacity(status);
  const daysLeft = isOngoingSection ? null : getDaysRemaining(event.registrationDeadline || event.date);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      const aspect = naturalWidth / naturalHeight;
      let calculatedWidth = Math.round(240 * aspect);
      
      // Enforce constraints
      calculatedWidth = Math.max(180, Math.min(320, calculatedWidth));
      setCardWidth(`${calculatedWidth}px`);
      setImageLoaded(true);
    }
  };

  const hasMultiplePosters = event.posterUrls && event.posterUrls.length > 1;
  const showBounce = hasMultiplePosters && (isOngoingSection || status === 'ongoing' || status === 'reg_open' || status === 'upcoming');

  return (
    <div
      className="glass-card event-card event-masonry-card"
      onClick={() => setSelectedEventDetails(event)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: 'pointer',
        position: 'relative',
        opacity: opacity,
        '--cat-color': catColor,
        border: isOngoingSection 
          ? 'none' 
          : (event.pinned ? '1px solid hsla(var(--primary) / 0.5)' : undefined),
        boxShadow: isOngoingSection
          ? 'none'
          : (event.pinned ? '0 0 15px hsla(var(--primary) / 0.15)' : undefined),
        width: isMasonry ? '100%' : (showBounce ? '280px' : cardWidth),
        height: isMasonry ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Absolute Badges */}
      {isOngoingSection ? (
        <div 
          className="status-badge ongoing"
          style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 5 }}
        >
          🔵 Happening Now
        </div>
      ) : (
        <>
          {event.pinned && (
            <div style={{
              position: 'absolute', top: '0.75rem', left: '0.75rem',
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
              color: 'white', fontSize: '0.65rem', fontWeight: 800,
              padding: '0.25rem 0.5rem', borderRadius: '4px', zIndex: 5,
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              📌 Featured
            </div>
          )}
          <div 
            className={`status-badge ${status.replace('_', '-')}`}
            style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 5 }}
          >
            {badge.text}
          </div>
        </>
      )}

      {/* Poster Image or Stack */}
      {(!event.posterUrl || imageError) ? (
        <div className="event-card-placeholder" style={{
          height: isMasonry ? '220px' : '150px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, hsla(${catColor}, 0.15), hsla(${catColor}, 0.05))`,
          borderBottom: '1px solid hsla(var(--border-glass))',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '2.5rem' }}>{getCategoryIcon(event.category)}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {event.category} Event
          </span>
        </div>
      ) : isMasonry ? (
        <div style={{ 
          height: imgHeight ? `${imgHeight}px` : '200px', 
          width: '100%', 
          position: 'relative', 
          overflow: 'hidden', 
          borderBottom: '1px solid hsla(var(--border-glass))' 
        }}>
          <img
            src={event.posterUrl}
            alt={event.title}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: 1,
              transition: 'opacity 0.3s ease',
              margin: '0 auto'
            }}
            onError={() => setImageError(true)}
          />
        </div>
      ) : showBounce ? (
        <div style={{ height: '200px', width: '100%', overflow: 'hidden', borderBottom: '1px solid hsla(var(--border-glass))', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <BounceCards
            className="event-card-bounce"
            images={event.posterUrls}
            containerWidth="100%"
            containerHeight={200}
            animationDelay={0.3}
            animationStagger={0.05}
            easeType="elastic.out(1, 0.7)"
            transformStyles={eventTransformStyles}
            enableHover={true}
            pushOffset={35}
            isHovered={isHovered}
          />
        </div>
      ) : (
        <img
          src={event.posterUrl}
          alt={event.title}
          onLoad={handleImageLoad}
          loading="lazy"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderBottom: '1px solid hsla(var(--border-glass))',
            opacity: imageLoaded ? 1 : 0.3,
            transition: 'opacity 0.3s ease',
            margin: '0 auto'
          }}
          onError={() => setImageError(true)}
        />
      )}

      {/* Card Details */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flexGrow: isMasonry ? 0 : 1, gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0, flex: 1 }}>
            {event.title}
          </h3>
          {daysLeft !== null && status !== 'ended' && (
            <span className="countdown-badge">
              ⏰ {daysLeft}d left
            </span>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600,
          color: `hsl(${catColor})`
        }}>
          <ClubLogo club={eventClub} category={event.category} size={24} borderRadius="50%" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.3rem' }}>
          {isOngoingSection ? (
            <>
              {event.venue && <span>📍 {event.venue}</span>}
              {event.eventEndDateTime && <span>🏁 Ends {formatDateTime(event.eventEndDateTime)}</span>}
            </>
          ) : (
            <>
              {event.eventStartDateTime && <span>🚀 {formatDateTime(event.eventStartDateTime)}</span>}
              {!event.eventStartDateTime && event.date && <span>📅 {formatDate(event.date)}</span>}
              {event.venue && <span>📍 {event.venue}</span>}
            </>
          )}
        </div>

        {/* Registration deadline & Price row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', alignItems: 'center' }}>
          {event.registrationDeadline && (
            <span style={{ color: status === 'reg_closed' || status === 'ended' ? 'hsl(0, 60%, 55%)' : 'hsl(140, 60%, 50%)', fontWeight: 600 }}>
              📝 Reg. {status === 'reg_closed' || status === 'ended' ? 'closed' : `till ${formatDateTime(event.registrationDeadline)}`}
            </span>
          )}
          {event.price ? (
            <span style={{ fontWeight: 700, color: 'hsl(var(--accent))' }}>
              💰 {event.price === '0' || event.price.toLowerCase() === 'free' ? 'Free' : `₹${event.price}`}
            </span>
          ) : (
            <span style={{ fontWeight: 600, color: 'hsl(140, 60%, 50%)' }}>🆓 Free</span>
          )}
        </div>

        {isAdmin && !isOngoingSection && (
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
}

export default function CampusLife({ 
  user, 
  token, 
  clubs = [], 
  events = [], 
  fetchClubs, 
  fetchEvents,
  initialSelectedEventId,
  clearInitialSelectedEvent,
  eventsLocked = true,
  onToggleEventsLock
}) {
  const isAdmin = user && user.role === 'admin';
  const isManager = user && (user.role === 'club_manager' || user.role === 'admin');

  const [activeSubTab, setActiveSubTab] = useState('clubs');
  const [showFilterSheet, setShowFilterSheet] = useState(false);
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
  const [selectedManagerClubId, setSelectedManagerClubId] = useState('');

  // Auto-select event from dashboard redirection
  useEffect(() => {
    if (initialSelectedEventId && events.length > 0) {
      const targetEvent = events.find(e => e.id === initialSelectedEventId);
      if (targetEvent) {
        setTimeout(() => {
          setActiveSubTab('events');
          setSelectedEventDetails(targetEvent);
          if (clearInitialSelectedEvent) {
            clearInitialSelectedEvent();
          }
        }, 0);
      }
    }
  }, [initialSelectedEventId, events, clearInitialSelectedEvent]);

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

  const handleCreateClub = async (clubData) => {
    setFormLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clubs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clubData)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchClubs();
        return true;
      } else {
        setError(data.error || 'Failed to create club.');
        return false;
      }
    } catch {
      setError('Network error creating club.');
      return false;
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (!window.confirm('Are you sure you want to delete this club? This will demote any managers of this club to students.')) return;
    try {
      const res = await fetch(`/api/clubs/${clubId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchClubs();
        if (isAdmin && token) {
          await fetchAdminUsers();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete club.');
      }
    } catch {
      alert('Network error deleting club.');
    }
  };

  const handleCreateEvent = async (formData) => {
    setFormLoading(true);
    setError('');
    try {
      let posterUrls = formData.posterUrls ? formData.posterUrls.map(ensureAbsoluteUrl).filter(Boolean) : [];

      if (formData.posterFiles && formData.posterFiles.length > 0) {
        const uploadPromises = formData.posterFiles.map(async (file) => {
          const uploadData = new FormData();
          uploadData.append('poster', file);
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
          return uploadResult.url;
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        posterUrls = [...posterUrls, ...uploadedUrls];
      }

      const posterUrl = posterUrls[0] || '';

      let schedulePosterUrl = formData.schedulePosterUrl ? ensureAbsoluteUrl(formData.schedulePosterUrl) : '';

      if (formData.schedulePosterFile) {
        const uploadData = new FormData();
        uploadData.append('poster', formData.schedulePosterFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadData
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Schedule poster upload failed');
        }
        const uploadResult = await uploadRes.json();
        schedulePosterUrl = uploadResult.url;
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
        posterUrls,
        schedulePosterUrl,
        registrationLink: formData.registrationLink ? ensureAbsoluteUrl(formData.registrationLink) : '',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        registrationDeadline: formData.registrationDeadline || '',
        eventStartDateTime: formData.eventStartDateTime || '',
        eventEndDateTime: formData.eventEndDateTime || '',
        price: formData.price || ''
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

  const handleUpdateEvent = async (eventId, formData) => {
    setFormLoading(true);
    setError('');
    try {
      let posterUrls = formData.posterUrls ? formData.posterUrls.map(ensureAbsoluteUrl).filter(Boolean) : [];

      if (formData.posterFiles && formData.posterFiles.length > 0) {
        const uploadPromises = formData.posterFiles.map(async (file) => {
          const uploadData = new FormData();
          uploadData.append('poster', file);
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
          return uploadResult.url;
        });
        const uploadedUrls = await Promise.all(uploadPromises);
        posterUrls = [...posterUrls, ...uploadedUrls];
      }

      let schedulePosterUrl = formData.schedulePosterUrl ? ensureAbsoluteUrl(formData.schedulePosterUrl) : '';

      if (formData.schedulePosterFile) {
        const uploadData = new FormData();
        uploadData.append('poster', formData.schedulePosterFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: uploadData
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || 'Schedule poster upload failed');
        }
        const uploadResult = await uploadRes.json();
        schedulePosterUrl = uploadResult.url;
      }

      if (posterUrls.length === 0 && formData.existingPosterUrls) {
        posterUrls = formData.existingPosterUrls;
      }
      if (!schedulePosterUrl && formData.existingSchedulePosterUrl) {
        schedulePosterUrl = formData.existingSchedulePosterUrl;
      }

      const body = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        posterUrl: posterUrls[0] || '',
        posterUrls,
        schedulePosterUrl,
        registrationLink: formData.registrationLink ? ensureAbsoluteUrl(formData.registrationLink) : '',
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        registrationDeadline: formData.registrationDeadline || '',
        eventStartDateTime: formData.eventStartDateTime || '',
        eventEndDateTime: formData.eventEndDateTime || '',
        price: formData.price || ''
      };

      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const data = await res.json();
        await fetchEvents();
        return data.event;
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update event.');
      }
    } catch (err) {
      setError(err.message || 'Failed to update event.');
      throw err;
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
        category: clubData.category,
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
        applicationLink: formData.applicationLink ? ensureAbsoluteUrl(formData.applicationLink) : ''
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

  // ─── Filtering & Sorting (Memoized to prevent calculations on irrelevant state updates) ───
  const filteredClubs = useMemo(() => {
    return selectedCategory === 'all'
      ? clubs
      : clubs.filter(c => c.category === selectedCategory);
  }, [clubs, selectedCategory]);

  const filteredEvents = useMemo(() => {
    const activeEvents = events.filter(e => !isEventTooOld(e));
    return selectedCategory === 'all'
      ? activeEvents
      : activeEvents.filter(e => e.category === selectedCategory);
  }, [events, selectedCategory]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents]
      .filter(e => getEventStatus(e) !== 'ongoing')
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const statusA = STATUS_SORT_ORDER[getEventStatus(a)] ?? 2;
        const statusB = STATUS_SORT_ORDER[getEventStatus(b)] ?? 2;
        if (statusA !== statusB) return statusA - statusB;
        const dateA = new Date(a.eventStartDateTime || a.date || 0);
        const dateB = new Date(b.eventStartDateTime || b.date || 0);
        return dateA - dateB;
      });
  }, [filteredEvents]);

  const ongoingEvents = useMemo(() => {
    return filteredEvents.filter(e => getEventStatus(e) === 'ongoing');
  }, [filteredEvents]);

  // Masonry layout items representation
  const masonryItems = useMemo(() => {
    return sortedEvents.map((event, idx) => ({
      id: event.id || event._id,
      img: event.posterUrl || '',
      height: 650 + (idx % 3) * 150,
      event
    }));
  }, [sortedEvents]);

  // ─── Sub-tabs ────────────────────────────────────────────────────
  const SUB_TABS = [
    { key: 'clubs', label: '🏛️ Clubs' },
    { key: 'events', label: '📅 Upcoming Events' },
    { key: 'active_events', label: '🔴 Active Events' },
    { key: 'recruitments', label: '📢 Recruitment' },
    ...(isManager ? [{ key: 'manager', label: '💼 Manager Portal' }] : []),
    ...(isAdmin ? [{ key: 'admin', label: '⚙️ Admin' }] : [])
  ];

  // ─── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="campus-container">
        <div className="section-header">
          <h1 className="section-title">College Life</h1>
          <p className="section-subtitle">Loading college life data...</p>
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
      <div className="section-header">
        <h1 className="section-title">College Life</h1>
        <p className="section-subtitle">
          Discover clubs, events, and opportunities to upgrade your college life.
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

      {/* Mobile Sub-tab Segmented Control */}
      <div className="segmented-control">
        {SUB_TABS.map(tab => {
          let shortLabel;
          switch (tab.key) {
            case 'clubs': shortLabel = 'Clubs'; break;
            case 'events': shortLabel = 'Events'; break;
            case 'active_events': shortLabel = 'Live'; break;
            case 'recruitments': shortLabel = 'Recruit'; break;
            case 'manager': shortLabel = 'Portal'; break;
            case 'admin': shortLabel = 'Admin'; break;
            default: shortLabel = tab.label.replace(/[^\w\s]/g, '').trim();
          }
          return (
            <button
              key={tab.key}
              className={`segmented-button ${activeSubTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveSubTab(tab.key); setSelectedCategory('all'); }}
            >
              {shortLabel}
            </button>
          );
        })}
      </div>

      {/* Category chips — visible for clubs, events, and active events */}
      {(activeSubTab === 'clubs' || activeSubTab === 'events' || activeSubTab === 'active_events') && (
        <div className="category-chips">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className={`category-chip cat-${cat.key} ${selectedCategory === cat.key ? 'active' : ''}`}
              style={cat.color ? { '--cat-color': cat.color } : {}}
              onClick={() => setSelectedCategory(cat.key)}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Mobile Category Filter Button Trigger */}
      {(activeSubTab === 'clubs' || activeSubTab === 'events' || activeSubTab === 'active_events') && (
        <div className="filter-trigger-container">
          <button 
            className="filter-trigger-btn"
            onClick={() => setShowFilterSheet(true)}
          >
            <span>{CATEGORIES.find(c => c.key === selectedCategory)?.icon || '🌟'}</span>
            <span>Filter: {CATEGORIES.find(c => c.key === selectedCategory)?.label || 'All'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {selectedCategory !== 'all' && (
            <button 
              className="filter-trigger-btn"
              onClick={() => setSelectedCategory('all')}
              style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {/* Category Filter Bottom Sheet */}
      {showFilterSheet && (
        <div className="modal-overlay" onClick={() => setShowFilterSheet(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>
                🔍 Filter Category
              </h2>
              <button 
                onClick={() => setShowFilterSheet(false)} 
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
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setSelectedCategory(cat.key);
                      setShowFilterSheet(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.85rem 1rem',
                      background: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                      border: isSelected ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      color: isSelected ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'hsl(var(--primary))' }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ TAB 1: CLUBS ═══════════════ */}
      {activeSubTab === 'clubs' && (
        <motion.div
          key="clubs-tab"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          {filteredClubs.length > 0 ? (
            <div className="opp-grid">
              {filteredClubs.map((club, index) => {
                const catColor = getCategoryColor(club.category);
                const canEditClub = isAdmin || (user && user.role === 'club_manager' && user.clubId === club.id);
                return (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.025, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div
                      className="club-card"
                      style={{ '--cat-color': catColor }}
                      onClick={() => setSelectedClubDetails(club)}
                    >
                      <div className="club-card-glow-bar" />
                      <div className="club-card-header">
                        <ClubLogo club={club} category={club.category} size={52} borderRadius="12px" />
                        <div className="club-card-header-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <h3 className="club-card-name">{club.name}</h3>
                            <span className="club-card-badge">{club.category}</span>
                          </div>
                          <span className="club-card-members">👥 {club.memberCount} members</span>
                        </div>
                      </div>

                      <p className="club-card-desc">{club.description}</p>

                      <div className="club-card-footer" onClick={e => e.stopPropagation()}>
                        <div className="club-card-socials">
                          {club.socialLinks?.instagram && (
                            <a href={club.socialLinks.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">📸</a>
                          )}
                          {club.socialLinks?.linkedin && (
                            <a href={club.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn">🔗</a>
                          )}
                          {club.socialLinks?.twitter && (
                            <a href={club.socialLinks.twitter} target="_blank" rel="noopener noreferrer" title="Twitter">🐦</a>
                          )}
                        </div>
                        <div className="club-card-actions">
                          {canEditClub && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleStartEditClub(club); }}
                              className="btn-secondary club-action-btn"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedClubDetails(club)}
                            className="btn-primary club-action-btn"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <p>No clubs found in this category.</p>
            </div>
          )}

          {/* EditClubModal moved globally to bottom of file */}
        </motion.div>
      )}

      {/* ═══════════════ TAB 2: EVENTS ═══════════════ */}
      {activeSubTab === 'events' && (
        <>
          {isAdmin && (
            <div className="glass-panel" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: eventsLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: eventsLocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-primary))', fontWeight: '600' }}>
                {eventsLocked ? '🔒 Events Section is Locked (Students see a placeholder)' : '🔓 Events Section is Unlocked (Students see active events)'}
              </span>
              <button
                onClick={onToggleEventsLock}
                className="paper-btn"
                style={{
                  width: 'auto',
                  margin: 0,
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.78rem',
                  background: eventsLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: eventsLocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: eventsLocked ? '#10b981' : '#ef4444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  transition: 'all 0.2s'
                }}
              >
                {eventsLocked ? 'Unlock Section' : 'Lock Section'}
              </button>
            </div>
          )}

          {eventsLocked && !isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', minHeight: '300px', background: 'hsla(var(--bg-card) / 0.3)', border: '1px dashed hsla(var(--border-glass))', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', marginTop: '1rem', width: '100%', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block' }}>🔒</span>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: 'hsl(var(--text-primary))', fontWeight: '800' }}>Events will resume after exams</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(var(--text-muted))', maxWidth: '420px', lineHeight: '1.5' }}>Stay focused on your preparations! All club recruitments, hackathons, and campus events are paused and will resume once the exams are completed.</p>
            </div>
          ) : (
            <>
              {sortedEvents.length > 0 ? (
                <Masonry
                  items={masonryItems}
                  ease="power3.out"
                  duration={0.6}
                  stagger={0.05}
                  animateFrom="bottom"
                  scaleOnHover={true}
                  hoverScale={0.95}
                  blurToFocus={true}
                  colorShiftOnHover={false}
                  renderItem={(item) => (
                    <EventCardItem
                      event={item.event}
                      clubs={clubs}
                      token={token}
                      isAdmin={isAdmin}
                      fetchEvents={fetchEvents}
                      setSelectedEventDetails={setSelectedEventDetails}
                      isOngoingSection={false}
                      isMasonry={true}
                      imgHeight={item.imgHeight}
                    />
                  )}
                />
              ) : (
                <div className="empty-state">
                  <span style={{ fontSize: '3rem' }}>📅</span>
                  <p>No events yet. {isManager ? 'Be the first to create one!' : 'Check back soon!'}</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════════════ TAB 2.5: ACTIVE EVENTS ═══════════════ */}
      {activeSubTab === 'active_events' && (
        <>
          {isAdmin && (
            <div className="glass-panel" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', background: eventsLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: eventsLocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-primary))', fontWeight: '600' }}>
                {eventsLocked ? '🔒 Events Section is Locked (Students see a placeholder)' : '🔓 Events Section is Unlocked (Students see active events)'}
              </span>
              <button
                onClick={onToggleEventsLock}
                className="paper-btn"
                style={{
                  width: 'auto',
                  margin: 0,
                  padding: '0.4rem 0.9rem',
                  fontSize: '0.78rem',
                  background: eventsLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: eventsLocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: eventsLocked ? '#10b981' : '#ef4444',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  transition: 'all 0.2s'
                }}
              >
                {eventsLocked ? 'Unlock Section' : 'Lock Section'}
              </button>
            </div>
          )}

          {eventsLocked && !isAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', minHeight: '300px', background: 'hsla(var(--bg-card) / 0.3)', border: '1px dashed hsla(var(--border-glass))', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', marginTop: '1rem', width: '100%', backdropFilter: 'blur(10px)' }}>
              <span style={{ fontSize: '3.5rem', marginBottom: '1rem', display: 'block' }}>🔒</span>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', color: 'hsl(var(--text-primary))', fontWeight: '800' }}>Events will resume after exams</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'hsl(var(--text-muted))', maxWidth: '420px', lineHeight: '1.5' }}>Stay focused on your preparations! All club recruitments, hackathons, and campus events are paused and will resume once the exams are completed.</p>
            </div>
          ) : (
            <>
              {ongoingEvents.length > 0 ? (
                <div className="event-masonry-grid" style={{ marginTop: '1rem', alignItems: 'stretch' }}>
                  {ongoingEvents.map(event => (
                    <ElectricBorder
                      key={`active-border-${event.id}`}
                      color="#03b3c3"
                      speed={1.2}
                      chaos={0.15}
                      borderRadius={16}
                      style={{ display: 'flex' }}
                    >
                      <EventCardItem
                        event={event}
                        clubs={clubs}
                        token={token}
                        isAdmin={isAdmin}
                        fetchEvents={fetchEvents}
                        setSelectedEventDetails={setSelectedEventDetails}
                        isOngoingSection={true}
                        isMasonry={false}
                      />
                    </ElectricBorder>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span style={{ fontSize: '3rem' }}>🔥</span>
                  <p>No events are currently happening. Check out the "Upcoming Events" tab for upcoming programs!</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* FAB: Create Event & Create Event Modal (shared across Events and Active Events tabs) */}
      {(activeSubTab === 'events' || activeSubTab === 'active_events') && (
        <>
          {isManager && (!eventsLocked || isAdmin) && (
            <button
              className="fab-create"
              onClick={() => setShowCreateEvent(true)}
              title="Create Event"
            >
              ➕
            </button>
          )}

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
                const canDelete = isAdmin || 
                                  (user && rec.createdBy === user.email) || 
                                  (user && user.role === 'club_manager' && user.clubId === rec.clubId);
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
                            onClick={() => window.open(rec.applicationLink, '_blank', 'noopener,noreferrer')}
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

      {/* ═══════════════ TAB 5: MANAGER ═══════════════ */}
      {activeSubTab === 'manager' && isManager && (
        <ManagerPortal
          user={user}
          clubs={clubs}
          events={events}
          recruitments={recruitments}
          onCreateEventClick={() => setShowCreateEvent(true)}
          onCreateRecruitmentClick={() => setShowCreateRecruitment(true)}
          onEditClubClick={(club) => setEditingClub(club)}
          onDeleteEvent={handleDeleteEvent}
          onDeleteRecruitment={handleDeleteRecruitment}
          onEventClick={(evt) => setSelectedEventDetails(evt)}
          selectedManagerClubId={selectedManagerClubId}
          setSelectedManagerClubId={setSelectedManagerClubId}
        />
      )}

      {/* ═══════════════ TAB 4: ADMIN ═══════════════ */}
      {activeSubTab === 'admin' && isAdmin && (
        <AdminPanel
          users={adminUsers}
          clubs={clubs}
          onPromote={handlePromote}
          onDemote={handleDemote}
          currentUserEmail={user?.email}
          onCreateClub={handleCreateClub}
          onDeleteClub={handleDeleteClub}
          formLoading={formLoading}
          error={error}
          setError={setError}
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
          onUpdateEvent={(updated) => setSelectedEventDetails(updated)}
          onUpdateEventSubmit={handleUpdateEvent}
        />
      )}

      {editingClub && (
        <EditClubModal
          club={editingClub}
          onClose={() => setEditingClub(null)}
          onSubmit={handleSaveClub}
          loading={formLoading}
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

function EventDetailsModal({ event, onClose, user, token, clubs, fetchEvents, onDeleteEvent, onUpdateEvent, onUpdateEventSubmit }) {
  const [activePoster, setActivePoster] = useState(event.posterUrl);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const isAdmin = user && user.role === 'admin';
  const canDelete = isAdmin || 
                    (user && event.createdBy === user.email) || 
                    (user && user.role === 'club_manager' && user.clubId === event.clubId);
  const canEdit = isAdmin || 
                  (user && event.createdBy === user.email) || 
                  (user && user.role === 'club_manager' && user.clubId === event.clubId);
  const catColor = getCategoryColor(event.category);
  const regUrl = event.registrationLink || `mailto:${event.createdBy}`;

  const handleTogglePin = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}/pin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pinned: !event.pinned })
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
  const status = getEventStatus(event);
  const badge = getStatusBadge(status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div style={{ flexGrow: 1, paddingRight: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'hsl(var(--text-primary))', lineHeight: 1.35, letterSpacing: '-0.02em' }}>{event.title}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
              <ClubLogo club={eventClub} category={event.category} size={18} borderRadius="50%" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{clubName}</span>
              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                background: status === 'reg_open' ? 'hsla(145, 65%, 52%, 0.08)' : 'hsla(355, 75%, 60%, 0.08)',
                color: status === 'reg_open' ? 'hsl(145, 65%, 52%)' : 'hsl(355, 75%, 60%)',
                border: status === 'reg_open' ? '1px solid hsla(145, 65%, 52%, 0.15)' : '1px solid hsla(355, 75%, 60%, 0.15)'
              }}>
                {badge.text}
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.03)',
                color: `hsl(${catColor})`,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                {event.category}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'hsl(var(--text-secondary))',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.8rem',
              transition: 'all 0.2s ease',
              padding: 0,
              flexShrink: 0
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'hsl(var(--text-primary))';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.color = 'hsl(var(--text-secondary))';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
            }}
          >
            ✕
          </button>
        </div>

        {activePoster && (
          <div style={{ 
            width: '100%', 
            maxHeight: '320px', 
            borderRadius: '12px', 
            overflow: 'hidden', 
            marginBottom: '1.25rem', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img 
              src={activePoster} 
              alt={event.title} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '320px', 
                objectFit: 'contain', 
                display: 'block' 
              }} 
            />
          </div>
        )}

        {event.posterUrls && event.posterUrls.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {event.posterUrls.map((url, idx) => (
              <button 
                key={idx} 
                onClick={() => setActivePoster(url)}
                style={{
                  padding: 0,
                  border: activePoster === url ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  width: '50px',
                  height: '50px',
                  cursor: 'pointer',
                  background: 'transparent',
                  flexShrink: 0,
                  transition: 'border-color 0.2s ease'
                }}
              >
                <img src={url} alt={`Thumbnail ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}

        {event.schedulePosterUrl && (
          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>📅 Event Schedule</h4>
            <div style={{ 
              width: '100%', 
              maxHeight: '320px', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              marginBottom: '1.25rem', 
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img 
                src={event.schedulePosterUrl} 
                alt="Event Schedule" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '320px', 
                  objectFit: 'contain', 
                  display: 'block' 
                }} 
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '-0.01em' }}>Description</h4>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', opacity: 0.95 }}>
              {event.description}
            </p>
          </div>

          {/* Timeline Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.01)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            {/* Line 1: Registration Deadline */}
            {event.registrationDeadline && (
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: status === 'reg_open' ? 'hsl(145, 65%, 52%)' : 'hsl(355, 75%, 60%)', marginTop: '6px' }} />
                  <div style={{ width: '2px', flexGrow: 1, background: 'rgba(255,255,255,0.06)', minHeight: '16px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Registration Deadline</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))', marginTop: '0.1rem' }}>
                    📅 {formatDateTime(event.registrationDeadline)}
                  </div>
                </div>
              </div>
            )}

            {/* Line 2: Event Start */}
            {(event.eventStartDateTime || event.date) && (
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--primary))', marginTop: '6px' }} />
                  {(event.eventEndDateTime || event.time) && <div style={{ width: '2px', flexGrow: 1, background: 'rgba(255,255,255,0.06)', minHeight: '16px' }} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Event Start</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))', marginTop: '0.1rem' }}>
                    🚀 {event.eventStartDateTime ? formatDateTime(event.eventStartDateTime) : formatDate(event.date)}
                  </div>
                </div>
              </div>
            )}

            {/* Line 3: Event End */}
            {(event.eventEndDateTime || event.time) && (
              <div style={{ display: 'flex', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'hsl(var(--secondary))', marginTop: '6px' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Event End</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))', marginTop: '0.1rem' }}>
                    🏁 {event.eventEndDateTime ? formatDateTime(event.eventEndDateTime) : event.time}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bento Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>📍 Venue</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{event.venue || 'TBA'}</div>
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
              <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.2rem' }}>🎟️ Entry Fee</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                {event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? `₹${event.price}` : 'Free'}
              </div>
            </div>
          </div>

          {event.tags && event.tags.length > 0 && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {event.tags.map((tag, i) => (
                  <span key={i} className="opp-tag" style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
            👤 <strong>Created by:</strong> {event.createdBy}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
            <a
              className="btn-register"
              href={regUrl}
              target={event.registrationLink ? "_blank" : undefined}
              rel={event.registrationLink ? "noopener noreferrer" : undefined}
              style={{ textDecoration: 'none', flexGrow: 1, textAlign: 'center', justifyContent: 'center', padding: '0.7rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}
              onClick={e => e.stopPropagation()}
            >
              {event.registrationLink ? '🔗 Register Now' : '✉️ Contact Host'}
            </a>
            
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); handleTogglePin(); }}
                title={event.pinned ? "Unpin Event" : "Pin Event"}
                style={{ 
                  padding: '0.7rem 1rem', 
                  fontSize: '0.8rem', 
                  background: 'transparent',
                  border: `1px solid ${event.pinned ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.06)'}`,
                  borderRadius: '8px',
                  color: event.pinned ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {event.pinned ? '📍 Unpin' : '📌 Pin'}
              </button>
            )}

            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                title="Edit event details"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.06)', 
                  borderRadius: '8px',
                  padding: '0.7rem 1rem', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  color: 'hsl(var(--text-primary))', 
                  transition: 'all 0.2s ease',
                  fontWeight: 600
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
              >
                ✏️ Edit
              </button>
            )}

            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                title="Delete event"
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                  borderRadius: '8px',
                  padding: '0.7rem 1rem', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem',
                  color: '#f87171', 
                  transition: 'all 0.2s ease',
                  fontWeight: 600
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)'}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditEventModal
          event={event}
          clubs={clubs}
          user={user}
          onClose={() => { setShowEditModal(false); setEditError(''); }}
          loading={editLoading}
          error={editError}
          onSubmit={async (formData) => {
            setEditLoading(true);
            setEditError('');
            try {
              const updatedEvent = await onUpdateEventSubmit(event.id, formData);
              onUpdateEvent(updatedEvent);
              setShowEditModal(false);
            } catch (err) {
              setEditError(err.message || 'Failed to update event.');
            } finally {
              setEditLoading(false);
            }
          }}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Edit Club Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EditClubModal({ club, onClose, onSubmit, loading }) {
  const [description, setDescription] = useState(club.description || '');
  const [category, setCategory] = useState(club.category || 'tech');
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
      category: category,
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
            <label>Club Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            >
              <option value="tech">Tech</option>
              <option value="music">Music & Arts</option>
              <option value="speakers">Speakers</option>
              <option value="motivation">Social & Motivation</option>
              <option value="anime">Anime</option>
              <option value="cultural">Cultural</option>
              <option value="robotics">Robotics</option>
              <option value="sports">Sports</option>
            </select>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <input 
                  type="text" 
                  value={iconUrl} 
                  onChange={e => setIconUrl(e.target.value)} 
                  placeholder="Enter emoji (e.g. 🖥️) or absolute URL"
                  style={{
                    width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
                  }}
                />
                {iconUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setIconUrl('');
                      setIconFile(null);
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                  >
                    🗑️ Remove Custom Logo
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={e => setIconFile(e.target.files?.[0] || null)}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '8px',
                    background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                    color: 'hsl(var(--text-primary))', fontSize: '0.85rem'
                  }}
                />
                {(iconFile || club.icon) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIconUrl('');
                      setIconFile(null);
                      setIconMode('url');
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.borderColor = '#ef4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#ef4444';
                      e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                    }}
                  >
                    🗑️ Remove Custom Logo
                  </button>
                )}
              </div>
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
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [venue, setVenue] = useState('');
  const [posterMode, setPosterMode] = useState('url'); // 'url' | 'file'
  const [posterUrls, setPosterUrls] = useState(['']);
  const [posterFiles, setPosterFiles] = useState([]);
  const [schedulePosterMode, setSchedulePosterMode] = useState('url'); // 'url' | 'file'
  const [schedulePosterUrl, setSchedulePosterUrl] = useState('');
  const [schedulePosterFile, setSchedulePosterFile] = useState(null);
  const [registrationLink, setRegistrationLink] = useState('');
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');

  const selectedClub = clubs.find(c => c.id === clubId);
  const clubName = selectedClub ? selectedClub.name : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!eventStart) { alert('Event start date/time is required.'); return; }
    if (!clubId) { alert('Please select a club.'); return; }
    if (!category) { alert('Please select a category.'); return; }

    if (eventEnd && new Date(eventEnd) < new Date(eventStart)) {
      alert('Event end date/time must be after the start date/time.');
      return;
    }
    if (registrationDeadline && new Date(registrationDeadline) > new Date(eventStart)) {
      alert('Registration deadline must be before the event starts.');
      return;
    }

    // Derive legacy "date" from eventStart for backward compat
    const legacyDate = eventStart ? eventStart.split('T')[0] : '';

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      clubId,
      clubName,
      category,
      date: legacyDate,
      time: '',
      venue: venue.trim(),
      posterUrls: posterMode === 'url' ? posterUrls.map(u => u.trim()).filter(Boolean) : [],
      posterFiles: posterMode === 'file' ? posterFiles : [],
      schedulePosterUrl: schedulePosterMode === 'url' ? schedulePosterUrl.trim() : '',
      schedulePosterFile: schedulePosterMode === 'file' ? schedulePosterFile : null,
      registrationLink: registrationLink.trim(),
      tags: tags.trim(),
      registrationDeadline,
      eventStartDateTime: eventStart,
      eventEndDateTime: eventEnd,
      price: price.trim()
    });
  };

  return (
    <div className="modal-overlay">
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
              <label>Event Start *</label>
              <input type="datetime-local" value={eventStart} onChange={e => setEventStart(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Event End</label>
              <input type="datetime-local" value={eventEnd} onChange={e => setEventEnd(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Registration Deadline</label>
              <input type="datetime-local" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="0 or Free for no charge" />
            </div>
          </div>

          <div className="form-group">
            <label>Venue</label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., Auditorium, AB-1 Room 203" />
          </div>

          <div className="form-group">
            <label>Posters (Multiple Allowed)</label>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posterUrls.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="url" value={url} onChange={e => {
                      const next = [...posterUrls];
                      next[idx] = e.target.value;
                      setPosterUrls(next);
                    }} placeholder="https://example.com/poster.jpg" />
                    {posterUrls.length > 1 && (
                      <button type="button" onClick={() => setPosterUrls(posterUrls.filter((_, i) => i !== idx))}
                        style={{
                          padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(248, 113, 113)', cursor: 'pointer'
                        }}
                      >✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setPosterUrls([...posterUrls, ''])}
                  style={{
                    alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--text-secondary))',
                    border: '1px solid hsla(var(--border-glass))', cursor: 'pointer'
                  }}
                >➕ Add Another Poster URL</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posterFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {posterFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid hsla(var(--border-glass))' }}>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                          🖼️ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button type="button" onClick={() => setPosterFiles(posterFiles.filter((_, i) => i !== idx))}
                          style={{
                            background: 'transparent', border: 'none', color: 'rgb(248, 113, 113)', cursor: 'pointer', fontSize: '0.9rem'
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const validFiles = [];
                    for (const file of files) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert(`File "${file.name}" exceeds the 5MB size limit.`);
                      } else {
                        validFiles.push(file);
                      }
                    }
                    if (validFiles.length > 0) {
                      setPosterFiles([...posterFiles, ...validFiles]);
                    }
                    e.target.value = '';
                  }}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '8px',
                    background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                    color: 'hsl(var(--text-primary))', fontSize: '0.85rem'
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Event Schedule Poster</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => setSchedulePosterMode('url')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: schedulePosterMode === 'url' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: schedulePosterMode === 'url' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >🔗 URL</button>
              <button type="button" onClick={() => setSchedulePosterMode('file')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: schedulePosterMode === 'file' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: schedulePosterMode === 'file' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >📁 Upload</button>
            </div>
            {schedulePosterMode === 'url' ? (
              <input type="url" value={schedulePosterUrl} onChange={e => setSchedulePosterUrl(e.target.value)} placeholder="https://example.com/schedule-poster.jpg" />
            ) : (
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={e => setSchedulePosterFile(e.target.files?.[0] || null)}
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
// Edit Event Modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function EditEventModal({ event, clubs, user, onClose, loading, error, onSubmit }) {
  const formatForDateTimeLocal = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr)) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const pad = (num) => String(num).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [title, setTitle] = useState(event.title || '');
  const [description, setDescription] = useState(event.description || '');
  const [clubId, setClubId] = useState(event.clubId || '');
  const [category, setCategory] = useState(event.category || 'tech');
  const [eventStart, setEventStart] = useState(() => formatForDateTimeLocal(event.eventStartDateTime));
  const [eventEnd, setEventEnd] = useState(() => formatForDateTimeLocal(event.eventEndDateTime));
  const [registrationDeadline, setRegistrationDeadline] = useState(() => formatForDateTimeLocal(event.registrationDeadline));
  const [venue, setVenue] = useState(event.venue || '');
  const [posterMode, setPosterMode] = useState('url'); // 'url' | 'file'
  const [posterUrls, setPosterUrls] = useState(() => {
    return event.posterUrls && event.posterUrls.length > 0
      ? event.posterUrls
      : (event.posterUrl ? [event.posterUrl] : ['']);
  });
  const [posterFiles, setPosterFiles] = useState([]);
  const [schedulePosterMode, setSchedulePosterMode] = useState('url'); // 'url' | 'file'
  const [schedulePosterUrl, setSchedulePosterUrl] = useState(event.schedulePosterUrl || '');
  const [schedulePosterFile, setSchedulePosterFile] = useState(null);
  const [registrationLink, setRegistrationLink] = useState(event.registrationLink || '');
  const [tags, setTags] = useState(() => {
    return event.tags ? event.tags.join(', ') : '';
  });
  const [price, setPrice] = useState(event.price || '');

  const selectedClub = clubs.find(c => c.id === clubId);
  const clubName = selectedClub ? selectedClub.name : '';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) { alert('Title is required.'); return; }
    if (!eventStart) { alert('Event start date/time is required.'); return; }
    if (!clubId) { alert('Please select a club.'); return; }
    if (!category) { alert('Please select a category.'); return; }

    if (eventEnd && new Date(eventEnd) < new Date(eventStart)) {
      alert('Event end date/time must be after the start date/time.');
      return;
    }
    if (registrationDeadline && new Date(registrationDeadline) > new Date(eventStart)) {
      alert('Registration deadline must be before the event starts.');
      return;
    }

    const legacyDate = eventStart ? eventStart.split('T')[0] : '';

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      clubId,
      clubName,
      category,
      date: legacyDate,
      time: '',
      venue: venue.trim(),
      posterUrls: posterMode === 'url' ? posterUrls.map(u => u.trim()).filter(Boolean) : [],
      posterFiles: posterMode === 'file' ? posterFiles : [],
      schedulePosterUrl: schedulePosterMode === 'url' ? schedulePosterUrl.trim() : '',
      schedulePosterFile: schedulePosterMode === 'file' ? schedulePosterFile : null,
      registrationLink: registrationLink.trim(),
      tags: tags.trim(),
      registrationDeadline,
      eventStartDateTime: eventStart,
      eventEndDateTime: eventEnd,
      price: price.trim(),
      existingPosterUrls: event.posterUrls || [],
      existingSchedulePosterUrl: event.schedulePosterUrl || ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            ✏️ Edit Event
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
              <label>Event Start *</label>
              <input type="datetime-local" value={eventStart} onChange={e => setEventStart(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Event End</label>
              <input type="datetime-local" value={eventEnd} onChange={e => setEventEnd(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Registration Deadline</label>
              <input type="datetime-local" value={registrationDeadline} onChange={e => setRegistrationDeadline(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="text" value={price} onChange={e => setPrice(e.target.value)} placeholder="0 or Free for no charge" />
            </div>
          </div>

          <div className="form-group">
            <label>Venue</label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g., Auditorium, AB-1 Room 203" />
          </div>

          <div className="form-group">
            <label>Posters (Multiple Allowed)</label>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posterUrls.map((url, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="url" value={url} onChange={e => {
                      const next = [...posterUrls];
                      next[idx] = e.target.value;
                      setPosterUrls(next);
                    }} placeholder="https://example.com/poster.jpg" />
                    {posterUrls.length > 1 && (
                      <button type="button" onClick={() => setPosterUrls(posterUrls.filter((_, i) => i !== idx))}
                        style={{
                          padding: '0 0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.4)',
                          background: 'rgba(239, 68, 68, 0.1)', color: 'rgb(248, 113, 113)', cursor: 'pointer'
                        }}
                      >✕</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setPosterUrls([...posterUrls, ''])}
                  style={{
                    alignSelf: 'flex-start', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)', color: 'hsl(var(--text-secondary))',
                    border: '1px solid hsla(var(--border-glass))', cursor: 'pointer'
                  }}
                >➕ Add Another Poster URL</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {posterFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {posterFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid hsla(var(--border-glass))' }}>
                        <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                          🖼️ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                        <button type="button" onClick={() => setPosterFiles(posterFiles.filter((_, i) => i !== idx))}
                          style={{
                            background: 'transparent', border: 'none', color: 'rgb(248, 113, 113)', cursor: 'pointer', fontSize: '0.9rem'
                          }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    const validFiles = [];
                    for (const file of files) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert(`File "${file.name}" exceeds the 5MB size limit.`);
                      } else {
                        validFiles.push(file);
                      }
                    }
                    if (validFiles.length > 0) {
                      setPosterFiles([...posterFiles, ...validFiles]);
                    }
                    e.target.value = '';
                  }}
                  style={{
                    width: '100%', padding: '0.5rem', borderRadius: '8px',
                    background: 'hsl(var(--bg-card))', border: '1px solid hsla(var(--border-glass))',
                    color: 'hsl(var(--text-primary))', fontSize: '0.85rem'
                  }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Event Schedule Poster</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => setSchedulePosterMode('url')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: schedulePosterMode === 'url' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: schedulePosterMode === 'url' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >🔗 URL</button>
              <button type="button" onClick={() => setSchedulePosterMode('file')}
                style={{
                  padding: '0.3rem 0.7rem', fontSize: '0.78rem', borderRadius: '6px', cursor: 'pointer',
                  background: schedulePosterMode === 'file' ? 'hsl(var(--primary))' : 'hsla(var(--bg-card))',
                  color: schedulePosterMode === 'file' ? '#fff' : 'hsl(var(--text-secondary))',
                  border: '1px solid hsla(var(--border-glass))', transition: 'all 0.2s ease'
                }}
              >📁 Upload</button>
            </div>
            {schedulePosterMode === 'url' ? (
              <input type="url" value={schedulePosterUrl} onChange={e => setSchedulePosterUrl(e.target.value)} placeholder="https://example.com/schedule-poster.jpg" />
            ) : (
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={e => setSchedulePosterFile(e.target.files?.[0] || null)}
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

          <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading} style={{ flex: 1 }}>
              {loading ? '⏳ Saving...' : '💾 Save Changes'}
            </button>
          </div>
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
    <div className="modal-overlay">
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
function AdminPanel({ users, clubs, onPromote, onDemote, currentUserEmail, onCreateClub, onDeleteClub, formLoading, error, setError }) {
  const [promoteRoles, setPromoteRoles] = useState({}); // { [email]: 'club_manager' | 'admin' }
  const [promoteClubs, setPromoteClubs] = useState({}); // { [email]: clubId }
  const [showCreateClub, setShowCreateClub] = useState(false);

  if (users.length === 0) {
    return (
      <div className="empty-state">
        <span style={{ fontSize: '3rem' }}>⚙️</span>
        <p>No users found or still loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.25rem', color: 'hsl(var(--text-primary))' }}>👥 User Management</h3>
      <div style={{ overflowX: 'auto', marginBottom: '3rem' }}>
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

      <div style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'hsl(var(--text-primary))' }}>🏛️ Club Management</h3>
          <button 
            className="btn-register" 
            onClick={() => { setShowCreateClub(true); setError(''); }}
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
          >
            ➕ Create New Club
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Club Name</th>
                <th>Category</th>
                <th>Members</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clubs.map((c) => (
                <tr key={c.id}>
                  <td>
                    <ClubLogo club={c} category={c.category} size={28} />
                  </td>
                  <td style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{c.name}</td>
                  <td>
                    <span className="club-category-badge" style={{ margin: 0, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                      {c.category}
                    </span>
                  </td>
                  <td>{c.memberCount} members</td>
                  <td>
                    <button 
                      className="btn-delete-small"
                      onClick={() => onDeleteClub(c.id)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '2rem' }}>
                    No clubs found. Create one above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateClub && (
        <CreateClubModal
          onSubmit={async (clubData) => {
            const success = await onCreateClub(clubData);
            if (success) {
              setShowCreateClub(false);
            }
          }}
          onClose={() => { setShowCreateClub(false); setError(''); }}
          loading={formLoading}
          error={error}
        />
      )}
    </div>
  );
}

function CreateClubModal({ onSubmit, onClose, loading, error }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('tech');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏛️');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Club name is required.'); return; }
    if (!category) { alert('Category is required.'); return; }
    onSubmit({
      name: name.trim(),
      category,
      description: description.trim(),
      icon: icon.trim(),
      socialLinks: {
        instagram: instagram.trim(),
        linkedin: linkedin.trim()
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            🏛️ Create New Club
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
            <label>Club Name *</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. AI & ML Club" 
              required 
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Category *</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                required
                style={{
                  width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
                }}
              >
                <option value="tech">Tech</option>
                <option value="music">Music & Arts</option>
                <option value="speakers">Speakers</option>
                <option value="motivation">Social & Motivation</option>
                <option value="anime">Anime</option>
                <option value="cultural">Cultural</option>
                <option value="robotics">Robotics</option>
                <option value="sports">Sports</option>
              </select>
            </div>
            <div className="form-group">
              <label>Icon / Emoji</label>
              <input 
                type="text" 
                value={icon} 
                onChange={e => setIcon(e.target.value)} 
                placeholder="e.g. 🤖 or URL" 
                style={{
                  width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Brief overview of the club's goals and activities..."
              style={{
                width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label>Instagram URL</label>
              <input 
                type="text" 
                value={instagram} 
                onChange={e => setInstagram(e.target.value)} 
                placeholder="https://instagram.com/..." 
                style={{
                  width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
                }}
              />
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input 
                type="text" 
                value={linkedin} 
                onChange={e => setLinkedin(e.target.value)} 
                placeholder="https://linkedin.com/in/..." 
                style={{
                  width: '100%', padding: '0.85rem 1rem', background: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid hsla(var(--border-glass))', borderRadius: '8px', color: '#fff'
                }}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Club Manager Portal Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function ManagerPortal({ 
  user, 
  clubs, 
  events, 
  recruitments, 
  onCreateEventClick, 
  onCreateRecruitmentClick, 
  onEditClubClick, 
  onDeleteEvent, 
  onDeleteRecruitment, 
  onEventClick, 
  selectedManagerClubId, 
  setSelectedManagerClubId 
}) {
  const isAdmin = user && user.role === 'admin';
  
  // Find which club to manage
  const activeClubId = isAdmin 
    ? (selectedManagerClubId || (clubs[0]?.id || ''))
    : user.clubId;

  const club = clubs.find(c => c.id === activeClubId || c._id === activeClubId);

  // Filter events and recruitments for this club
  const clubEvents = events.filter(e => e.clubId === activeClubId);
  const clubRecruitments = recruitments.filter(r => r.clubId === activeClubId);

  return (
    <div className="manager-portal-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Club Selector for Admins */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>🛡️ Admin Club Management</h3>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '0.25rem 0 0 0' }}>Select a club to view and manage its profile, events, and recruitments.</p>
          </div>
          <select 
            value={activeClubId} 
            onChange={(e) => setSelectedManagerClubId(e.target.value)}
            className="form-input"
            style={{ width: 'auto', minWidth: '220px', padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid hsla(var(--border-glass))', color: '#fff' }}
          >
            <option value="" disabled>-- Select Club --</option>
            {clubs.map(c => (
              <option key={c.id || c._id} value={c.id || c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {club ? (
        <>
          {/* Club Overview Capsule */}
          <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center', borderRadius: '16px', border: '1px solid hsla(var(--border-glass))' }}>
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '20px',
              background: 'hsla(var(--accent-glow) / 0.1)',
              border: '1px solid hsla(var(--border-glass))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              {club.icon ? (
                <img src={club.icon} alt={club.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                '🏛️'
              )}
            </div>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'hsl(var(--text-primary))' }}>{club.name}</h2>
                <span className={`category-chip ${club.category}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}>
                  {club.category?.toUpperCase() || 'TECH'}
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-muted))', margin: '0.5rem 0 1rem 0', lineHeight: '1.5' }}>
                {club.description || 'No description provided.'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
                <span>👥 <strong>{club.memberCount || 0}</strong> Members</span>
                {club.socialLinks?.instagram && (
                  <a href={club.socialLinks.instagram} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--primary))', textDecoration: 'none' }}>
                    📸 Instagram
                  </a>
                )}
                {club.socialLinks?.linkedin && (
                  <a href={club.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--secondary))', textDecoration: 'none' }}>
                    💼 LinkedIn
                  </a>
                )}
              </div>
            </div>
            <div>
              <button 
                onClick={() => onEditClubClick(club)} 
                className="btn btn-secondary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>

          {/* Events Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>📅 Event Cards Management</h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '0.2rem 0 0 0' }}>Manage the event cards visible on the upcoming events feed.</p>
              </div>
              <button 
                onClick={onCreateEventClick} 
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                ➕ Create Event
              </button>
            </div>

            {clubEvents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {clubEvents.map(evt => {
                  const hasEnded = new Date(evt.eventEndDateTime || evt.date) < new Date();
                  return (
                    <div key={evt.id || evt._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '14px', overflow: 'hidden', border: '1px solid hsla(var(--border-glass))' }}>
                      {evt.posterUrl && (
                        <div style={{ height: '140px', width: '100%', overflow: 'hidden', borderBottom: '1px solid hsla(var(--border-glass))' }}>
                          <img src={evt.posterUrl} alt={evt.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: '1', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))', cursor: 'pointer' }} onClick={() => onEventClick(evt)}>
                            {evt.title}
                          </h4>
                          <span className={`status-badge ${hasEnded ? 'ended' : 'upcoming'}`} style={{ flexShrink: '0' }}>
                            {hasEnded ? 'Ended' : 'Upcoming'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span>📅 {evt.date} • {evt.time}</span>
                          <span>📍 {evt.venue}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid hsla(var(--border-glass))' }}>
                          <button 
                            onClick={() => onEventClick(evt)} 
                            className="btn btn-secondary" 
                            style={{ flex: 1, padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem' }}
                          >
                            ✏️ Edit / View
                          </button>
                          <button 
                            onClick={() => onDeleteEvent(evt.id || evt._id)} 
                            className="btn" 
                            style={{ padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', color: 'hsl(0, 80%, 65%)', background: 'rgba(255, 0, 0, 0.05)', border: '1px solid rgba(255, 0, 0, 0.15)' }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</span>
                <p style={{ margin: 0 }}>No events hosted by this club yet.</p>
              </div>
            )}
          </div>

          {/* Recruitments Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>📢 Recruitment Postings</h3>
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', margin: '0.2rem 0 0 0' }}>Manage the active hiring and recruitment roles for your club.</p>
              </div>
              <button 
                onClick={onCreateRecruitmentClick} 
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                📢 Post Recruitment
              </button>
            </div>

            {clubRecruitments.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {clubRecruitments.map(rec => (
                  <div key={rec.id || rec._id} className="glass-card" style={{ padding: '1.25rem', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid hsla(var(--border-glass))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>
                        {rec.title}
                      </h4>
                      <span className="status-badge ongoing">Active</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', margin: 0, lineHeight: '1.4', flex: 1 }}>
                      {rec.description}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid hsla(var(--border-glass))' }}>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        📅 Post Date: {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => onDeleteRecruitment(rec.id || rec._id)} 
                        className="btn" 
                        style={{ padding: '0.45rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', color: 'hsl(0, 80%, 65%)', background: 'rgba(255, 0, 0, 0.05)', border: '1px solid rgba(255, 0, 0, 0.15)' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📢</span>
                <p style={{ margin: 0 }}>No active recruitments posted yet.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state" style={{ padding: '3rem', borderRadius: '16px' }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏛️</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No club assigned</p>
          <p style={{ color: 'hsl(var(--text-muted))', maxWidth: '380px', margin: '0.5rem auto 0 auto' }}>
            You are registered as a club manager, but no club has been assigned to your account. Please contact an administrator.
          </p>
        </div>
      )}
    </div>
  );
}
