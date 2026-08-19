import { useState, useEffect, useRef, useMemo, memo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import BounceCards from './BounceCards';
const Hyperspeed = lazy(() => import('./Hyperspeed'));
import { cachedFetch } from '../utils/apiClient';

const DARK_HYPERSPEED_OPTIONS = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0xffffff,
    brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3
  }
};

const LIGHT_HYPERSPEED_OPTIONS = {
  distortion: 'turbulentDistortion',
  length: 400,
  roadWidth: 10,
  islandWidth: 2,
  lanesPerRoad: 4,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 20,
  lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0xebedf2,             // Very light titanium slate-blue road line
    islandColor: 0xdae2ed,           // Slightly darker island background spacer
    background: 0xd3dbe8,            // Matches the canvas backdrop color
    shoulderLines: 0xffffff,         // Solid white road shoulder boundaries
    brokenLines: 0xffffff,           // Dashed white road lanes separators
    leftCars: [0x635bff, 0x9d4edd, 0xf754a8],  // Vibrant neon Indigo, Violet, Pink light streaks
    rightCars: [0x00f5d4, 0x2be0f5, 0x0ea5e9], // Vibrant neon Mint, Cyan, Sky-Blue light streaks
    sticks: 0x2be0f5                 // Vibrant neon Cyan side stick indicators
  }
};

const eventTransformStyles = [
  'rotate(5deg) translate(-45px)',
  'rotate(2deg) translate(-22px)',
  'rotate(-1deg)',
  'rotate(-4deg) translate(22px)',
  'rotate(3deg) translate(45px)'
];

const SLOT_MAPPING = {
  A11: { day: 1, start: '08:30', end: '10:00' },
  B11: { day: 1, start: '10:05', end: '11:35' },
  C11: { day: 1, start: '11:40', end: '13:10' },
  A21: { day: 1, start: '13:15', end: '14:45' },
  A14: { day: 1, start: '14:50', end: '16:20' },
  B21: { day: 1, start: '16:25', end: '17:55' },
  C21: { day: 1, start: '18:00', end: '19:30' },

  D11: { day: 2, start: '08:30', end: '10:00' },
  E11: { day: 2, start: '10:05', end: '11:35' },
  F11: { day: 2, start: '11:40', end: '13:10' },
  D21: { day: 2, start: '13:15', end: '14:45' },
  E14: { day: 2, start: '14:50', end: '16:20' },
  E21: { day: 2, start: '16:25', end: '17:55' },
  F21: { day: 2, start: '18:00', end: '19:30' },

  A12: { day: 3, start: '08:30', end: '10:00' },
  B12: { day: 3, start: '10:05', end: '11:35' },
  C12: { day: 3, start: '11:40', end: '13:10' },
  A22: { day: 3, start: '13:15', end: '14:45' },
  B14: { day: 3, start: '14:50', end: '16:20' },
  B22: { day: 3, start: '16:25', end: '17:55' },
  A24: { day: 3, start: '18:00', end: '19:30' },

  D12: { day: 4, start: '08:30', end: '10:00' },
  E12: { day: 4, start: '10:05', end: '11:35' },
  F12: { day: 4, start: '11:40', end: '13:10' },
  D22: { day: 4, start: '13:15', end: '14:45' },
  F14: { day: 4, start: '14:50', end: '16:20' },
  E22: { day: 4, start: '16:25', end: '17:55' },
  F22: { day: 4, start: '18:00', end: '19:30' },

  A13: { day: 5, start: '08:30', end: '10:00' },
  B13: { day: 5, start: '10:05', end: '11:35' },
  C13: { day: 5, start: '11:40', end: '13:10' },
  A23: { day: 5, start: '13:15', end: '14:45' },
  C14: { day: 5, start: '14:50', end: '16:20' },
  B23: { day: 5, start: '16:25', end: '17:55' },
  B24: { day: 5, start: '18:00', end: '19:30' },

  D13: { day: 6, start: '08:30', end: '10:00' },
  E13: { day: 6, start: '10:05', end: '11:35' },
  F13: { day: 6, start: '11:40', end: '13:10' },
  D23: { day: 6, start: '13:15', end: '14:45' },
  D14: { day: 6, start: '14:50', end: '16:20' },
  D24: { day: 6, start: '16:25', end: '17:55' },
  E23: { day: 6, start: '18:00', end: '19:30' }
};

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🌟' },
  { key: 'tech', label: 'Tech', icon: '🖥️', color: '180, 80%, 55%' },
  { key: 'music', label: 'Music & Arts', icon: '🎵', color: '280, 70%, 60%' },
  { key: 'speakers', label: 'Speakers', icon: '🎤', color: '30, 90%, 55%' },
  { key: 'motivation', label: 'Social & Motivation', icon: '💡', color: '140, 60%, 50%' },
  { key: 'anime', label: 'Anime', icon: '🎌', color: '330, 75%, 60%' },
  { key: 'cultural', label: 'Cultural', icon: '🎭', color: '345, 80%, 60%' },
  { key: 'robotics', label: 'Robotics', icon: '🤖', color: '220, 75%, 55%' },
  { key: 'sports', label: 'Sports', icon: '🏅', color: '50, 85%, 55%' },
];

function getCategoryColorThemeAware(categoryKey, theme) {
  const cat = CATEGORIES.find(c => c.key === categoryKey);
  if (!cat) return theme === 'light' ? '250, 72%, 48%' : '263, 90%, 65%';
  if (theme === 'light') {
    switch (categoryKey) {
      case 'tech': return '180, 85%, 30%';       // dark cyan/teal
      case 'music': return '280, 65%, 42%';      // deep purple
      case 'speakers': return '30, 90%, 38%';     // dark orange/bronze
      case 'motivation': return '140, 60%, 32%';   // deep forest green
      case 'anime': return '330, 75%, 40%';      // deep velvet rose
      case 'cultural': return '345, 75%, 40%';   // deep red/crimson
      case 'robotics': return '220, 75%, 40%';   // deep royal blue
      case 'sports': return '40, 85%, 35%';      // dark golden olive
      default: return '250, 72%, 48%';
    }
  }
  return cat.color || '263, 90%, 65%';
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

function getStatusBadge(status) {
  switch (status) {
    case 'reg_open': return { text: '🟢 Registration Open', color: '140, 70%, 45%', bg: '140, 70%, 45%' };
    case 'ongoing': return { text: '🔵 Happening Now', color: '210, 80%, 60%', bg: '210, 80%, 60%' };
    case 'reg_closed': return { text: '🟡 Registration Closed', color: '40, 80%, 50%', bg: '40, 80%, 50%' };
    case 'ended': return { text: '🔴 Ended', color: '0, 60%, 55%', bg: '0, 60%, 55%' };
    default: return { text: '📅 Upcoming', color: '263, 70%, 60%', bg: '263, 70%, 60%' };
  }
}




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
          loading="lazy"
          decoding="async"
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

function EventDetailsModal({ event, onClose, user, token, clubs, fetchEvents, theme }) {
  const [activePoster, setActivePoster] = useState(event.posterUrl);
  const isAdmin = user && user.role === 'admin';
  const canDelete = isAdmin || (user && event.createdBy === user.email);
  const catColor = getCategoryColorThemeAware(event.category, theme);
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
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle pin status.');
      }
    } catch {
      alert('Network error toggling pin status.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEvents();
        onClose();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete event.');
      }
    } catch {
      alert('Network error deleting event.');
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
              loading="lazy"
              decoding="async"
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
                <img src={url} alt={`Thumbnail ${idx + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                loading="lazy"
                decoding="async"
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
    </div>
  );
};

function DashboardEventCardItem({
  event,
  clubs,
  user,
  setSelectedEvent,
  handleTogglePin,
  theme
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${event.id}/impression`, { method: 'POST' }).catch(() => {});
  }, [event.id]);

  const daysLeft = getDaysRemaining(event.registrationDeadline || event.date);
  const catColor = getCategoryColorThemeAware(event.category, theme);
  const eventClub = clubs.find(c => c.id === event.clubId);
  const clubName = eventClub ? eventClub.name : event.clubName || 'Unknown Club';
  const isAdmin = user && user.role === 'admin';
  const status = getEventStatus(event);
  const badge = getStatusBadge(status);
  const opacity = 1; // Enforce full opacity in stack to prevent card overlap visibility

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const hasMultiplePosters = event.posterUrls && event.posterUrls.length > 1;
  const showBounce = hasMultiplePosters;

  return (
    <div
      className="glass-card event-card"
      onClick={() => setSelectedEvent(event)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        opacity: opacity,
        '--cat-color': catColor,
        background: 'rgba(255, 255, 255, 0.01)',
        border: event.pinned 
          ? '1px solid hsla(var(--primary) / 0.35)' 
          : '1px solid rgba(255, 255, 255, 0.05)',
        boxShadow: event.pinned 
          ? '0 8px 30px hsla(var(--primary) / 0.08)' 
          : '0 4px 20px rgba(0, 0, 0, 0.15)',
        borderRadius: '16px',
        width: '100%',
        flexShrink: 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      {event.pinned && (
        <div style={{
          position: 'absolute', top: '0.75rem', left: '0.75rem',
          background: 'hsla(var(--primary) / 0.08)',
          border: '1px solid hsla(var(--primary) / 0.25)',
          color: 'hsl(var(--primary))', fontSize: '0.65rem', fontWeight: 800,
          padding: '0.2rem 0.5rem', borderRadius: '6px', zIndex: 5,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          backdropFilter: 'blur(8px)'
        }}>
          📌 Featured
        </div>
      )}

      <div 
        className={`status-badge ${status.replace('_', '-')}`}
        style={{ 
          position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 5,
          background: status === 'reg_open' ? 'hsla(145, 65%, 52%, 0.08)' : 'hsla(355, 75%, 60%, 0.08)',
          color: status === 'reg_open' ? 'hsl(145, 65%, 52%)' : 'hsl(355, 75%, 60%)',
          border: status === 'reg_open' ? '1px solid hsla(145, 65%, 52%, 0.15)' : '1px solid hsla(355, 75%, 60%, 0.15)',
          fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '6px',
          textTransform: 'uppercase', letterSpacing: '0.05em', backdropFilter: 'blur(8px)'
        }}
      >
        {badge.text}
      </div>

      {event.posterUrl && (
        showBounce ? (
          <div style={{ height: '140px', width: '100%', overflow: 'hidden', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
            <BounceCards
              className="event-card-bounce"
              images={event.posterUrls}
              containerWidth="100%"
              containerHeight={140}
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
          <div style={{ height: '140px', width: '100%', overflow: 'hidden', borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
            <img
              src={event.posterUrl}
              alt={event.title}
              onLoad={handleImageLoad}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: imageLoaded ? 1 : 0.3,
                transition: 'opacity 0.3s ease'
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        )
      )}

      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '0.65rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0, flex: 1, lineHeight: 1.35, letterSpacing: '-0.01em' }}>
            {event.title}
          </h4>
          {daysLeft !== null && status !== 'ended' && (
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'hsl(var(--accent))',
              background: 'hsla(var(--accent) / 0.08)',
              border: '1px solid hsla(var(--accent) / 0.15)',
              padding: '0.15rem 0.4rem',
              borderRadius: '4px',
              whiteSpace: 'nowrap'
            }}>
              ⏰ {daysLeft}d left
            </span>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          fontSize: '0.78rem', fontWeight: 600, color: `hsl(${catColor})`
        }}>
          <ClubLogo club={eventClub} category={event.category} size={18} borderRadius="50%" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>{clubName}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
          <span>📅 {event.eventStartDateTime ? formatDateTime(event.eventStartDateTime) : formatDate(event.date)}</span>
          {event.venue && (
            <>
              <span style={{ opacity: 0.35 }}>•</span>
              <span>📍 {event.venue}</span>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', marginTop: '0.1rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
          {event.registrationDeadline ? (
            <span style={{ color: status === 'reg_closed' || status === 'ended' ? 'hsl(355, 75%, 60%)' : 'hsl(145, 65%, 52%)', fontWeight: 600 }}>
              📝 Reg. {status === 'reg_closed' || status === 'ended' ? 'closed' : `till ${formatDateTime(event.registrationDeadline)}`}
            </span>
          ) : <span />}
          <span style={{ 
            fontWeight: 700, 
            color: event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? 'hsl(var(--accent))' : 'hsl(145, 65%, 52%)',
            background: event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? 'hsla(var(--accent) / 0.08)' : 'hsla(145, 65%, 52%, 0.08)',
            border: event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? '1px solid hsla(var(--accent) / 0.15)' : '1px solid hsla(145, 65%, 52%, 0.15)',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px'
          }}>
            {event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? `₹${event.price}` : 'Free'}
          </span>
        </div>

        {isAdmin && (
          <div style={{ marginTop: '0.25rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
            <button
              onClick={(e) => handleTogglePin(event, e)}
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

// Mess options — live data fetched from messmenu.me via our backend proxy
const MESS_OPTIONS = [
  { id: 'mayuri-boys', name: 'Mayuri Boys', group: 'boys' },
  { id: 'jmb-boys', name: 'JMB Boys', group: 'boys' },
  { id: 'crcl-boys', name: 'CRCL', group: 'boys' },
  { id: 'safal-boys', name: 'Safal', group: 'boys' },
  { id: 'ab-girls', name: 'AB Girls', group: 'girls' },
  { id: 'mayuri-girls', name: 'Mayuri Girls', group: 'girls' }
];

const MEAL_TIME_STRINGS = {
  breakfast: '07:30 - 09:30',
  lunch: '12:15 - 14:30',
  snacks: '17:00 - 18:30',
  dinner: '19:15 - 21:15'
};

// Side dishes / staples to filter out for a cleaner display
const SIDE_DISH_KEYWORDS = [
  'tea', 'coffee', 'milk', 'bread', 'butter', 'jam', 'pickle', 'papad',
  'fryums', 'salad', 'curd', 'raita', 'chutney', 'sauce', 'ketchup',
  'banana', 'fruit', 'sprouts', 'boiled egg', 'rasam', 'plain rice',
  'south indian plain rice', 'roti', 'chapati', 'chapathi', 'phulka',
  'tawa roti', 'butter roti', 'plain roti', 'lemon', 'cut lemon',
  'mix salad', 'fresh salad', 'onion', 'buttermilk', 'butter milk',
];

const filterMainDishes = (itemsStr) => {
  if (!itemsStr || itemsStr === 'Menu not available' || itemsStr === 'Loading menu...') return [];
  const items = itemsStr.split(',').map(i => i.trim()).filter(Boolean);
  const mainDishes = items.filter(item => {
    const lower = item.toLowerCase();
    // Keep items that don't match any side dish keyword exactly
    return !SIDE_DISH_KEYWORDS.some(kw => {
      // Match full item or item surrounded by typical patterns
      return lower === kw || lower === kw + 's' 
        || lower === 'plain ' + kw || lower === kw + ' (north & south)'
        || lower === 'plain rice (north & south)';
    });
  });
  // If everything got filtered out, return top 3 original items
  return mainDishes.length > 0 ? mainDishes.slice(0, 5) : items.slice(0, 3);
};

const Dashboard = ({ stats, user, opportunities, onNavigate, onUpdateSemester, clubs = [], events = [], fetchEvents, token, theme, onNavigateToEvent, eventsLocked = true, onToggleEventsLock, isAdmin = false }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDemoView, setIsDemoView] = useState(false);

  useEffect(() => {
    if (!user || !user.timetable || user.timetable.length === 0) {
      const interval = setInterval(() => {
        setIsDemoView(prev => !prev);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);
  const [showSubtitle, setShowSubtitle] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSubtitle(false);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);
  const [mealCycleOffset, setMealCycleOffset] = useState(0);
  const mealResetTimeoutRef = useRef(null);

  useEffect(() => {
    if (mealCycleOffset > 0) {
      if (mealResetTimeoutRef.current) {
        clearTimeout(mealResetTimeoutRef.current);
      }
      mealResetTimeoutRef.current = setTimeout(() => {
        setMealCycleOffset(0);
      }, 15000);
    }
    return () => {
      if (mealResetTimeoutRef.current) {
        clearTimeout(mealResetTimeoutRef.current);
      }
    };
  }, [mealCycleOffset]);

  const [selectedMess, setSelectedMess] = useState(() => {
    const OLD_TO_NEW = { mayuri: 'mayuri-boys', crcl: 'crcl-boys', jmb: 'jmb-boys', safal: 'safal-boys' };
    const stored = localStorage.getItem('ds_selected_mess') || 'mayuri-boys';
    const migrated = OLD_TO_NEW[stored] || stored;
    if (migrated !== stored) localStorage.setItem('ds_selected_mess', migrated);
    return migrated;
  });
  const [messMenuData, setMessMenuData] = useState(null); // Live menu data from API
  const [messMenuLoading, setMessMenuLoading] = useState(false);
  const [messDropdownOpen, setMessDropdownOpen] = useState(false);
  const messDropdownRef = useRef(null);
  const messButtonRef = useRef(null);
  const [dropdownCoords, setDropdownCoords] = useState({ top: 0, left: 0 });

  const toggleMessDropdown = () => {
    if (!messDropdownOpen && messButtonRef.current) {
      const rect = messButtonRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + 6,
        left: Math.max(10, rect.right - 220)
      });
    }
    setMessDropdownOpen(prev => !prev);
  };

  const selectMess = (messId) => {
    setSelectedMess(messId);
    localStorage.setItem('ds_selected_mess', messId);
    setMessDropdownOpen(false);
  };

  const [semDropdownOpen, setSemDropdownOpen] = useState(false);
  const semDropdownRef = useRef(null);
  const semButtonRef = useRef(null);
  const [semDropdownCoords, setSemDropdownCoords] = useState({ top: 0, left: 0 });

  const toggleSemDropdown = () => {
    if (!semDropdownOpen && semButtonRef.current) {
      const rect = semButtonRef.current.getBoundingClientRect();
      setSemDropdownCoords({
        top: rect.bottom + 6,
        left: Math.max(10, rect.left)
      });
    }
    setSemDropdownOpen(prev => !prev);
  };

  const selectSemester = (semVal) => {
    onUpdateSemester(semVal);
    setSemDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        messDropdownRef.current && !messDropdownRef.current.contains(event.target) &&
        messButtonRef.current && !messButtonRef.current.contains(event.target)
      ) {
        setMessDropdownOpen(false);
      }
      if (
        semDropdownRef.current && !semDropdownRef.current.contains(event.target) &&
        semButtonRef.current && !semButtonRef.current.contains(event.target)
      ) {
        setSemDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch live mess menu data from our backend proxy (which calls messmenu.me)
  useEffect(() => {
    let cancelled = false;
    const fetchMenu = async () => {
      setMessMenuLoading(true);
      try {
        const res = await cachedFetch(`/api/mess-menu/${selectedMess}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled && json.success && json.data) {
          setMessMenuData(json.data);
        }
      } catch (err) {
        console.error('[MessMenu] Failed to fetch live data:', err);
        // Keep existing data on error (stale is better than nothing)
      } finally {
        if (!cancelled) setMessMenuLoading(false);
      }
    };
    fetchMenu();
    return () => { cancelled = true; };
  }, [selectedMess]);

  // Tinder Stack State
  const [currentStackIndex, setCurrentStackIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [swipeAction, setSwipeAction] = useState(null); // 'like' | 'skip' | null
  const [exitDirection, setExitDirection] = useState(null); // { x, y } when flying off
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    return !localStorage.getItem('ds_swipe_hint_seen');
  });
  const swipeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    };
  }, []);

  // Auto-dismiss the hint after first swipe or after 6 seconds
  useEffect(() => {
    if (!showSwipeHint) return;
    const timer = setTimeout(() => {
      localStorage.setItem('ds_swipe_hint_seen', 'true');
      setShowSwipeHint(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, [showSwipeHint]);

  const handleSwipe = (direction) => {
    if (exitDirection) return;
    if (showSwipeHint) {
      localStorage.setItem('ds_swipe_hint_seen', 'true');
      setShowSwipeHint(false);
    }
    const dirX = direction === 'right' ? 450 : -450;
    setExitDirection({ x: dirX, y: 0 });
    setSwipeAction(direction);
    if (swipeTimeoutRef.current) clearTimeout(swipeTimeoutRef.current);
    swipeTimeoutRef.current = setTimeout(() => {
      setCurrentStackIndex(prev => prev + 1);
      setExitDirection(null);
      setSwipeAction(null);
      setDragOffset({ x: 0, y: 0 });
    }, 350);
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
    setSwipeAction(null);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragOffset({ x: dx, y: dy });
    if (dx > 40) {
      setSwipeAction('like');
    } else if (dx < -40) {
      setSwipeAction('skip');
    } else {
      setSwipeAction(null);
    }
  };

  const handlePointerUp = (e, eventItem) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored: pointer capture release failed
    }
    setIsDragging(false);
    const totalDist = Math.abs(dragOffset.x) + Math.abs(dragOffset.y);
    if (dragOffset.x > 120) {
      handleSwipe('right');
    } else if (dragOffset.x < -120) {
      handleSwipe('left');
    } else {
      setDragOffset({ x: 0, y: 0 });
      setSwipeAction(null);
      if (totalDist < 6) {
        if (onNavigateToEvent) {
          onNavigateToEvent(eventItem.id);
        }
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 15000); // Check every 15 seconds to ensure quick updates
    return () => clearInterval(timer);
  }, []);

  const getUpcomingMealInfo = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const currentDay = currentTime.getDay(); // 0-6

    let baseMealType;
    let baseIsTomorrow = false;
    let baseTargetDay = currentDay;
    let baseIsServingNow = false;

    if (currentMinutes <= 570) {
      baseMealType = 'breakfast';
      baseIsServingNow = currentMinutes >= 450;
    } else if (currentMinutes <= 870) {
      baseMealType = 'lunch';
      baseIsServingNow = currentMinutes >= 735;
    } else if (currentMinutes <= 1110) {
      baseMealType = 'snacks';
      baseIsServingNow = currentMinutes >= 1020;
    } else if (currentMinutes <= 1290) {
      baseMealType = 'dinner';
      baseIsServingNow = currentMinutes >= 1155;
    } else {
      baseMealType = 'breakfast';
      baseIsTomorrow = true;
      baseTargetDay = (currentDay + 1) % 7;
    }

    const MEALS_ORDER = ['breakfast', 'lunch', 'snacks', 'dinner'];
    const baseMealIndex = MEALS_ORDER.indexOf(baseMealType);
    const targetMealIndex = (baseMealIndex + mealCycleOffset) % 4;
    const mealType = MEALS_ORDER[targetMealIndex];

    const mealLabels = {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      snacks: 'Snacks',
      dinner: 'Dinner'
    };
    const label = mealLabels[mealType];

    let isTomorrow = baseIsTomorrow;
    let targetDay = baseTargetDay;

    if (baseIsTomorrow) {
      if (targetMealIndex < baseMealIndex) {
        targetDay = (currentDay + 2) % 7;
      }
    } else {
      if (targetMealIndex < baseMealIndex) {
        isTomorrow = true;
        targetDay = (currentDay + 1) % 7;
      }
    }

    const isServingNow = mealCycleOffset === 0 ? baseIsServingNow : false;

    const mealIcons = {
      breakfast: '🥞',
      lunch: '🍛',
      snacks: '☕',
      dinner: '🍽️'
    };

    // Use live data from API
    let items = 'Loading menu...';
    let messName = MESS_OPTIONS.find(m => m.id === selectedMess)?.name || 'Mess';

    if (messMenuData && messMenuData.menu) {
      const dayMenu = messMenuData.menu[targetDay];
      if (dayMenu && dayMenu[mealType]) {
        items = dayMenu[mealType];
      } else {
        items = 'Menu not available';
      }
      messName = messMenuData.name || messName;
    } else if (!messMenuLoading) {
      items = 'Menu not available';
    }

    return {
      mealType,
      label,
      isTomorrow,
      isServingNow,
      icon: mealIcons[mealType] || '🍽️',
      items,
      timeStr: MEAL_TIME_STRINGS[mealType] || '00:00 - 00:00',
      messName,
      baseMealIndex,
      targetMealIndex
    };
  };

  const getLiveClassInfo = () => {
    if (!user || !user.timetable || user.timetable.length === 0) {
      return { status: 'no_timetable' };
    }

    const timeToMinutes = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const currentDay = currentTime.getDay(); // 0 (Sunday) to 6 (Saturday)
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    const classesWithSchedule = user.timetable.map(entry => {
      const schedule = SLOT_MAPPING[entry.slot];
      if (!schedule) return null;
      return {
        ...entry,
        day: schedule.day,
        start: schedule.start,
        end: schedule.end,
        startMinutes: timeToMinutes(schedule.start),
        endMinutes: timeToMinutes(schedule.end)
      };
    }).filter(Boolean);

    if (classesWithSchedule.length === 0) {
      return { status: 'no_timetable' };
    }

    // If Sunday (0), find the next day with classes starting from Monday (1)
    if (currentDay === 0) {
      let nextClass = null;
      let dayDiff = 1;
      for (let i = 1; i <= 6; i++) {
        const targetDay = i;
        const targetDayClasses = classesWithSchedule
          .filter(c => c.day === targetDay)
          .sort((a, b) => a.startMinutes - b.startMinutes);
        if (targetDayClasses.length > 0) {
          nextClass = targetDayClasses[0];
          dayDiff = (targetDay - currentDay + 7) % 7;
          break;
        }
      }
      return {
        status: 'subsequent_days',
        nextClass,
        dayDiff,
        nextDayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(currentDay + dayDiff) % 7]
      };
    }

    // Filter today's classes (Monday=1...Saturday=6)
    const todayClasses = classesWithSchedule
      .filter(c => c.day === currentDay)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    // 1. Ongoing class check
    const ongoing = todayClasses.find(c => currentMinutes >= c.startMinutes && currentMinutes < c.endMinutes);

    // 2. Upcoming class today check
    const upcomingToday = todayClasses.find(c => c.startMinutes > currentMinutes);

    if (ongoing) {
      const totalDuration = ongoing.endMinutes - ongoing.startMinutes;
      const elapsed = currentMinutes - ongoing.startMinutes;
      const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      const remainingMinutes = ongoing.endMinutes - currentMinutes;

      // Find the next class today or in subsequent days
      let next = upcomingToday || null;
      if (!next) {
        for (let i = 1; i <= 7; i++) {
          const targetDay = (currentDay + i) % 7;
          if (targetDay === 0) continue;
          const targetDayClasses = classesWithSchedule
            .filter(c => c.day === targetDay)
            .sort((a, b) => a.startMinutes - b.startMinutes);
          if (targetDayClasses.length > 0) {
            next = targetDayClasses[0];
            break;
          }
        }
      }

      return {
        status: 'ongoing',
        currentClass: ongoing,
        nextClass: next,
        progress,
        remainingMinutes
      };
    }

    if (upcomingToday) {
      const waitMinutes = upcomingToday.startMinutes - currentMinutes;
      return {
        status: 'upcoming_today',
        nextClass: upcomingToday,
        waitMinutes
      };
    }

    // No classes left today. Look for next days
    let nextClass = null;
    let dayDiff = 1;
    for (let i = 1; i <= 7; i++) {
      const targetDay = (currentDay + i) % 7;
      if (targetDay === 0) continue;
      const targetDayClasses = classesWithSchedule
        .filter(c => c.day === targetDay)
        .sort((a, b) => a.startMinutes - b.startMinutes);
      if (targetDayClasses.length > 0) {
        nextClass = targetDayClasses[0];
        dayDiff = i;
        break;
      }
    }

    if (nextClass) {
      return {
        status: 'subsequent_days',
        nextClass,
        dayDiff,
        nextDayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(currentDay + dayDiff) % 7]
      };
    }

    return { status: 'idle' };
  };

  const getTrackerStatusClass = (status) => {
    switch (status) {
      case 'ongoing': return 'ongoing';
      case 'upcoming_today': return 'upcoming';
      case 'subsequent_days': return 'holiday';
      case 'no_timetable': return 'setup';
      default: return 'holiday';
    }
  };

  const renderLiveClassTracker = () => {
    const info = getLiveClassInfo();
    const statusClass = getTrackerStatusClass(info.status);

    const renderMessTrackerSection = () => {
      const mealInfo = getUpcomingMealInfo();
      const mainDishes = filterMainDishes(mealInfo.items);

      const currentMessObj = MESS_OPTIONS.find(m => m.id === selectedMess) || MESS_OPTIONS[0];

      const MEAL_TABS = [
        { id: 'breakfast', label: 'Breakfast', icon: '🥞' },
        { id: 'lunch', label: 'Lunch', icon: '🍛' },
        { id: 'snacks', label: 'Snacks', icon: '☕' },
        { id: 'dinner', label: 'Dinner', icon: '🍽️' }
      ];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileDevice ? '0.65rem' : '0.85rem' }}>
          {/* Header Row: Live Status + Hostel Selector Pill (Top-Right Aligned) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '0.4rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flexShrink: 1 }}>
              <span style={{
                fontSize: isMobileDevice ? '0.62rem' : '0.72rem',
                fontWeight: 800,
                color: mealInfo.isServingNow ? '#10b981' : '#38bdf8',
                background: mealInfo.isServingNow ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                border: mealInfo.isServingNow ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                padding: '0.18rem 0.6rem',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: mealInfo.isServingNow ? '#10b981' : '#38bdf8',
                  boxShadow: mealInfo.isServingNow ? '0 0 8px #10b981' : '0 0 8px #38bdf8'
                }} />
                {mealInfo.isServingNow ? 'LIVE SERVING' : 'UPCOMING'}
              </span>

              <span style={{ fontSize: isMobileDevice ? '0.68rem' : '0.76rem', color: '#a1a1aa', fontWeight: 600 }}>
                🕒 {mealInfo.timeStr} {mealInfo.isTomorrow ? '· Tomorrow' : ''}
              </span>
            </div>

            {/* SLEEK FLOATING MESS SELECTOR DROPDOWN MENU */}
            <div style={{ position: 'relative' }}>
              <button
                ref={messButtonRef}
                onClick={toggleMessDropdown}
                style={{
                  background: theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                  border: theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: theme === 'light' ? '#0f172a' : '#ffffff',
                  fontSize: isMobileDevice ? '0.68rem' : '0.78rem',
                  fontWeight: 700,
                  padding: isMobileDevice ? '0.22rem 0.6rem' : '0.3rem 0.75rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  boxShadow: theme === 'light' ? '0 2px 6px rgba(15, 23, 42, 0.04)' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.background = theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <span>📍</span>
                <span>{currentMessObj.name}</span>
                <span style={{ fontSize: '0.65rem', opacity: 0.7, transform: messDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>▼</span>
              </button>

              {/* Floating Glass Dropdown Menu */}
              {messDropdownOpen && createPortal(
                <div
                  ref={messDropdownRef}
                  className="base-nav-menu-popover"
                  style={{
                    position: 'fixed',
                    top: `${dropdownCoords.top}px`,
                    left: `${dropdownCoords.left}px`,
                    width: '210px',
                    maxHeight: '340px',
                    overflowY: 'auto',
                    background: theme === 'light' ? '#ffffff' : '#121215',
                    border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '14px',
                    padding: '0.45rem',
                    boxShadow: theme === 'light' ? '0 12px 32px rgba(15, 23, 42, 0.12)' : '0 16px 40px rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 9999999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  {/* Boys Hostels Section */}
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: theme === 'light' ? '#0284c7' : '#38bdf8', letterSpacing: '0.08em', padding: '0.3rem 0.5rem 0.15rem 0.5rem', textTransform: 'uppercase' }}>
                    👦 Boys Hostels
                  </div>
                  {MESS_OPTIONS.filter(m => m.group === 'boys').map(m => {
                    const isSelected = m.id === selectedMess;
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectMess(m.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.38rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? (theme === 'light' ? '#0284c7' : '#38bdf8') : (theme === 'light' ? '#334155' : '#e2e8f0'),
                          background: isSelected ? (theme === 'light' ? 'rgba(2, 132, 199, 0.1)' : 'rgba(56, 189, 248, 0.12)') : 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.color = theme === 'light' ? '#0f172a' : '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = theme === 'light' ? '#334155' : '#e2e8f0';
                          }
                        }}
                      >
                        <span>{m.name}</span>
                        {isSelected && <span style={{ color: theme === 'light' ? '#0284c7' : '#38bdf8', fontSize: '0.78rem' }}>✓</span>}
                      </button>
                    );
                  })}

                  <div style={{ height: '1px', background: theme === 'light' ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)', margin: '0.25rem 0' }} />

                  {/* Girls Hostels Section */}
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ec4899', letterSpacing: '0.08em', padding: '0.3rem 0.5rem 0.15rem 0.5rem', textTransform: 'uppercase' }}>
                    👧 Girls Hostels
                  </div>
                  {MESS_OPTIONS.filter(m => m.group === 'girls').map(m => {
                    const isSelected = m.id === selectedMess;
                    return (
                      <button
                        key={m.id}
                        onClick={() => selectMess(m.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.38rem 0.65rem',
                          fontSize: '0.78rem',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? '#ec4899' : (theme === 'light' ? '#334155' : '#e2e8f0'),
                          background: isSelected ? 'rgba(236, 72, 153, 0.12)' : 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = theme === 'light' ? '#f1f5f9' : 'rgba(236, 72, 153, 0.08)';
                            e.currentTarget.style.color = theme === 'light' ? '#0f172a' : '#ffffff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = theme === 'light' ? '#334155' : '#e2e8f0';
                          }
                        }}
                      >
                        <span>{m.name}</span>
                        {isSelected && <span style={{ color: '#ec4899', fontSize: '0.78rem' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* Sleek Segmented 4-Meal Tab Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobileDevice ? '0.2rem' : '0.35rem',
            background: theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.03)',
            padding: '0.25rem',
            borderRadius: '12px',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(12px)'
          }}>
            {MEAL_TABS.map((tab, idx) => {
              const isActive = idx === mealInfo.targetMealIndex;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    const offset = (idx - mealInfo.baseMealIndex + 4) % 4;
                    setMealCycleOffset(offset);
                  }}
                  style={{
                    flex: 1,
                    padding: isMobileDevice ? '0.28rem 0.2rem' : '0.35rem 0.4rem',
                    fontSize: isMobileDevice ? '0.66rem' : '0.76rem',
                    fontWeight: isActive ? 800 : 600,
                    borderRadius: '8px',
                    border: isActive 
                      ? (theme === 'light' ? '1px solid #c7d2fe' : '1px solid rgba(255, 255, 255, 0.25)') 
                      : '1px solid transparent',
                    background: isActive
                      ? (theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.12)')
                      : 'transparent',
                    color: isActive 
                      ? (theme === 'light' ? '#4f46e5' : '#ffffff') 
                      : (theme === 'light' ? '#64748b' : '#94a3b8'),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive 
                      ? (theme === 'light' ? '0 2px 8px rgba(79, 70, 229, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.3)') 
                      : 'none',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = theme === 'light' ? '#0f172a' : '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = theme === 'light' ? '#64748b' : '#94a3b8';
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dish Showcase Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {messMenuLoading && !messMenuData ? (
              <span style={{ fontSize: isMobileDevice ? '0.75rem' : '0.85rem', color: theme === 'light' ? '#64748b' : '#94a3b8', fontStyle: 'italic' }}>Fetching live menu...</span>
            ) : mainDishes.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobileDevice ? '0.3rem' : '0.45rem' }}>
                {mainDishes.map((dish, i) => {
                  let dishIcon = '🍱';
                  const lower = dish.toLowerCase();
                  if (lower.includes('dosa') || lower.includes('idli')) dishIcon = '🥞';
                  else if (lower.includes('paneer') || lower.includes('curry')) dishIcon = '🥘';
                  else if (lower.includes('rice') || lower.includes('pulao') || lower.includes('biryani')) dishIcon = '🍚';
                  else if (lower.includes('dal') || lower.includes('sambhar') || lower.includes('rasam')) dishIcon = '🥣';
                  else if (lower.includes('roti') || lower.includes('paratha') || lower.includes('poori')) dishIcon = '🫓';
                  else if (lower.includes('tea') || lower.includes('coffee') || lower.includes('milk')) dishIcon = '☕';
                  else if (lower.includes('sweet') || lower.includes('kheer') || lower.includes('halwa') || lower.includes('jalebi')) dishIcon = '🍯';

                  const isMainHighlight = i === 0;

                  return (
                    <div key={i} style={{
                      fontSize: isMobileDevice ? '0.72rem' : '0.82rem',
                      fontWeight: isMainHighlight ? 700 : 500,
                      padding: isMainHighlight
                        ? (isMobileDevice ? '0.38rem 0.7rem' : '0.45rem 0.88rem')
                        : (isMobileDevice ? '0.3rem 0.6rem' : '0.38rem 0.75rem'),
                      borderRadius: '10px',
                      background: isMainHighlight
                        ? (theme === 'light' ? '#ffffff' : 'rgba(255, 255, 255, 0.08)')
                        : (theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)'),
                      border: isMainHighlight
                        ? (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.22)')
                        : (theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)'),
                      color: isMainHighlight 
                        ? (theme === 'light' ? '#0f172a' : '#ffffff') 
                        : (theme === 'light' ? '#334155' : '#cbd5e1'),
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.2s ease-out',
                      boxShadow: isMainHighlight && theme === 'light' ? '0 2px 6px rgba(15, 23, 42, 0.04)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = theme === 'light' ? '#94a3b8' : 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = isMainHighlight ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.06)';
                    }}
                    >
                      {isMainHighlight && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />}
                      <span>{dishIcon}</span>
                      <span>{dish.length > 34 ? dish.substring(0, 32) + '…' : dish}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: isMobileDevice ? '0.75rem' : '0.85rem', color: '#94a3b8' }}>Menu details not available</span>
            )}
          </div>
        </div>
      );
    };

    const renderClassTrackerSection = () => {
      if (info.status === 'no_timetable') {
        if (isDemoView) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileDevice ? '0.4rem' : '0.8rem', animation: 'fadeIn 0.5s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', background: 'hsla(var(--primary) / 0.1)', padding: isMobileDevice ? '0.12rem 0.45rem' : '0.2rem 0.6rem', borderRadius: '10px' }}>
                  🔴 IN CLASS (DEMO)
                </span>
                <button className="tracker-manage-btn" onClick={() => onNavigate('timetable')} style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', padding: isMobileDevice ? '0.15rem 0.4rem' : '0.2rem 0.6rem', background: 'hsla(var(--primary) / 0.15)', border: '1px solid hsla(var(--primary) / 0.3)', color: 'hsl(var(--primary))' }}>Set Up Now</button>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                  <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', background: 'hsla(var(--primary) / 0.1)', padding: isMobileDevice ? '0.08rem 0.3rem' : '0.15rem 0.45rem', borderRadius: '4px' }}>Slot A1</span>
                  <span style={{ fontSize: isMobileDevice ? '0.65rem' : '0.8rem', color: 'hsl(var(--text-muted))' }}>· Theory (Demo)</span>
                </div>
                <h2 style={{ margin: '0.1rem 0', fontSize: isMobileDevice ? '1.15rem' : '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>CSE2002 (DSA)</h2>
                <span style={{ fontSize: isMobileDevice ? '0.7rem' : '0.85rem', color: 'hsl(var(--text-muted))' }}>📍 LHC-102 (First Floor)</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileDevice ? '0.7rem' : '0.85rem', marginBottom: '0.1rem' }}>
                  <span>🕒 09:00 - 09:50</span>
                  <span style={{ fontWeight: 600, color: 'hsl(var(--primary))' }}>12m left</span>
                </div>
                <div style={{ height: isMobileDevice ? '5px' : '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: '76%', height: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))', borderRadius: '3px' }}></div>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileDevice ? '0.5rem' : '0.85rem', justifyContent: 'center', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobileDevice ? '0.5rem' : '0.75rem' }}>
              <span style={{ fontSize: isMobileDevice ? '1.4rem' : '1.8rem' }}>📅</span>
              <h3 style={{ margin: 0, fontSize: isMobileDevice ? '0.9rem' : '1.15rem', fontWeight: 700 }}>Track Your Classes Live</h3>
            </div>
            <p style={{ margin: 0, fontSize: isMobileDevice ? '0.72rem' : '0.85rem', color: 'hsl(var(--text-muted))', lineHeight: 1.3 }}>
              Upload your VTOP timetable screenshot to see live class alerts here.
            </p>
            <button className="btn-primary" onClick={() => onNavigate('timetable')} style={{ width: 'fit-content', padding: isMobileDevice ? '0.3rem 0.7rem' : '0.45rem 0.95rem', fontSize: isMobileDevice ? '0.7rem' : '0.85rem' }}>
              Set Up Timetable
            </button>
          </div>
        );
      }

      if (info.status === 'ongoing') {
        const classTypeLabel = info.currentClass.type === 'LT' ? 'Lecture' 
          : info.currentClass.type === 'LTP' ? 'Theory + Tut + Prac'
          : info.currentClass.type === 'LP' ? 'Lab' : 'Tutorial';
        
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileDevice ? '0.4rem' : '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: isMobileDevice ? '0.12rem 0.45rem' : '0.2rem 0.6rem', borderRadius: '10px' }}>🔴 IN CLASS</span>
              <button className="tracker-manage-btn" onClick={() => onNavigate('timetable')} style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', padding: isMobileDevice ? '0.15rem 0.4rem' : '0.2rem 0.6rem' }}>Manage</button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.15rem' }}>
                <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: 'hsl(var(--primary))', background: 'hsla(var(--primary) / 0.1)', padding: isMobileDevice ? '0.08rem 0.3rem' : '0.15rem 0.45rem', borderRadius: '4px' }}>Slot {info.currentClass.slot}</span>
                <span style={{ fontSize: isMobileDevice ? '0.65rem' : '0.8rem', color: 'hsl(var(--text-muted))' }}>· {classTypeLabel}</span>
              </div>
              <h2 style={{ margin: '0.1rem 0', fontSize: isMobileDevice ? '1.15rem' : '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{info.currentClass.courseCode}</h2>
              <span style={{ fontSize: isMobileDevice ? '0.7rem' : '0.85rem', color: 'hsl(var(--text-muted))' }}>📍 {info.currentClass.room}</span>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobileDevice ? '0.7rem' : '0.85rem', marginBottom: '0.1rem' }}>
                <span>🕒 {info.currentClass.start} - {info.currentClass.end}</span>
                <span style={{ fontWeight: 600 }}>{info.remainingMinutes}m left</span>
              </div>
              <div style={{ height: isMobileDevice ? '5px' : '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${info.progress}%`, height: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))', borderRadius: '3px' }}></div>
              </div>
            </div>
            {info.nextClass && (
              <div style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', color: 'hsl(var(--text-muted))', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: isMobileDevice ? '0.3rem' : '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                NEXT: <strong>{info.nextClass.courseCode}</strong> at {info.nextClass.start} in {info.nextClass.room}
              </div>
            )}
          </div>
        );
      }

      if (info.status === 'upcoming_today') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileDevice ? '0.4rem' : '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: 'hsl(var(--secondary))', background: 'hsla(var(--secondary) / 0.1)', padding: isMobileDevice ? '0.12rem 0.45rem' : '0.2rem 0.6rem', borderRadius: '10px' }}>⏳ UPCOMING</span>
              <button className="tracker-manage-btn" onClick={() => onNavigate('timetable')} style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', padding: isMobileDevice ? '0.15rem 0.4rem' : '0.2rem 0.6rem' }}>Manage</button>
            </div>
            <div>
              <h2 style={{ margin: '0.1rem 0', fontSize: isMobileDevice ? '1.15rem' : '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{info.nextClass.courseCode}</h2>
              <span style={{ fontSize: isMobileDevice ? '0.7rem' : '0.85rem', color: 'hsl(var(--text-muted))' }}>📍 {info.nextClass.room} · Slot {info.nextClass.slot}</span>
            </div>
            <div style={{ fontSize: isMobileDevice ? '0.8rem' : '0.95rem' }}>
              <span style={{ fontWeight: 700, color: 'hsl(var(--secondary))' }}>Starts in {info.waitMinutes} mins</span>
              <span style={{ fontSize: isMobileDevice ? '0.65rem' : '0.8rem', color: 'hsl(var(--text-muted))', marginLeft: '0.3rem' }}>at {info.nextClass.start}</span>
            </div>
          </div>
        );
      }

      if (info.status === 'subsequent_days') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: isMobileDevice ? '0.6rem' : '0.75rem', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: isMobileDevice ? '0.12rem 0.45rem' : '0.2rem 0.6rem', borderRadius: '10px', width: 'fit-content' }}>🌴 DONE FOR TODAY</span>
            <p style={{ margin: 0, fontSize: isMobileDevice ? '0.72rem' : '0.88rem', color: 'hsl(var(--text-muted))', lineHeight: 1.3 }}>
              Next: <strong>{info.nextClass.courseCode}</strong> on <strong>{info.nextDayName}</strong> at {info.nextClass.start} in {info.nextClass.room}
            </p>
          </div>
        );
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <h3 style={{ margin: 0, fontSize: isMobileDevice ? '0.9rem' : '1.1rem', fontWeight: 700 }}>No classes scheduled</h3>
          <p style={{ margin: 0, fontSize: isMobileDevice ? '0.7rem' : '0.85rem', color: 'hsl(var(--text-muted))' }}>Enjoy your day!</p>
        </div>
      );
    };

    // Desktop: side-by-side | Mobile: tabs
    if (!isMobileDevice) {
      return (
        <div className={`bento-item span-2 live-tracker-item live-tracker-panel ${statusClass}`} style={{ overflow: 'visible', padding: '0.95rem 1.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '1.25rem', width: '100%', alignItems: 'flex-start' }}>
            {/* Left: Class Alert */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {renderClassTrackerSection()}
            </div>
            {/* Divider */}
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />
            {/* Right: Mess Menu */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
              {renderMessTrackerSection()}
            </div>
          </div>
        </div>
      );
    }

    // Mobile: stack both vertically
    return (
      <div className={`bento-item span-2 live-tracker-item live-tracker-panel ${statusClass}`} style={{ padding: '1rem', overflow: 'visible' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          {/* Top: Mess Menu */}
          <div>
            {renderMessTrackerSection()}
          </div>
          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', width: '100%' }} />
          {/* Bottom: Class Alert */}
          <div>
            {renderClassTrackerSection()}
          </div>
        </div>
      </div>
    );
  };

  const renderProfileStatsWidget = () => {
    const hours = new Date().getHours();
    let greeting = 'Good Evening';
    if (hours < 12) greeting = 'Good Morning';
    else if (hours < 18) greeting = 'Good Afternoon';

    const coursesCount = user && user.courses ? user.courses.length : 0;
    
    return (
      <div className="profile-stats-widget" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: '0.65rem' }}>
        <div>
          {/* User Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #ffffff, #a1a1aa)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#09090b',
              boxShadow: '0 4px 12px rgba(255,255,255,0.25)',
              flexShrink: 0
            }}>
              {user && user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', fontWeight: 500 }}>{greeting},</div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'hsl(var(--text-primary))', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user && !user.isGuest && user.name ? user.name.split(' ')[0] : 'VITian'}
              </h4>
              {user && user.isVitBhopal && (
                <div style={{ fontSize: '0.68rem', color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-mono)', marginTop: '0.1rem', fontWeight: 600 }}>
                  {getRegNumber()}
                </div>
              )}
            </div>
          </div>

          {/* 2-COLUMN SHORTCUT GRID TO FACULTY CABINS & PYQ PAPERS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {/* Faculty Cabins */}
            <div 
              onClick={() => onNavigate('faculty')}
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '12px',
                background: theme === 'light'
                  ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.08), rgba(2, 132, 199, 0.02))'
                  : 'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(56, 189, 248, 0.03))',
                border: theme === 'light'
                  ? '1px solid rgba(2, 132, 199, 0.25)'
                  : '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = theme === 'light' ? '#0284c7' : 'rgba(56, 189, 248, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(2, 132, 199, 0.25)' : 'rgba(56, 189, 248, 0.3)';
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: theme === 'light' ? 'rgba(2, 132, 199, 0.15)' : 'rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === 'light' ? '#0284c7' : '#38bdf8',
                flexShrink: 0
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f8fafc', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Faculty Cabins</div>
                <div style={{ fontSize: '0.62rem', color: theme === 'light' ? '#64748b' : '#94a3b8', marginTop: '0.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>150+ Cabins →</div>
              </div>
            </div>

            {/* PYQ Question Papers */}
            <div 
              onClick={() => onNavigate('community', 'pyq')}
              style={{
                padding: '0.55rem 0.65rem',
                borderRadius: '12px',
                background: theme === 'light'
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(168, 85, 247, 0.02))'
                  : 'linear-gradient(135deg, rgba(192, 132, 252, 0.12), rgba(192, 132, 252, 0.03))',
                border: theme === 'light'
                  ? '1px solid rgba(168, 85, 247, 0.25)'
                  : '1px solid rgba(192, 132, 252, 0.3)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.25s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = theme === 'light' ? '#a855f7' : 'rgba(192, 132, 252, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(192, 132, 252, 0.3)';
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: theme === 'light' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(192, 132, 252, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme === 'light' ? '#a855f7' : '#c084fc',
                flexShrink: 0
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M6.5 17H20"/></svg>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f8fafc', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PYQ Papers</div>
                <div style={{ fontSize: '0.62rem', color: theme === 'light' ? '#64748b' : '#94a3b8', marginTop: '0.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>CAT & FAT ⚡</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    let rafId = null;
    const checkMobile = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const isTouch = window.matchMedia('(pointer: coarse)').matches;
        const isLandscapeMobile = window.innerHeight <= 480;
        const nextState = window.innerWidth <= 768 || isLandscapeMobile || (isTouch && window.innerWidth <= 1024);
        setIsMobileDevice(prev => (prev !== nextState ? nextState : prev));
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const inProgressSkills = stats.inProgressSkillsList || [];
  const activeOpportunities = opportunities ? opportunities.slice(0, 3) : [];

  // Helper to extract registration number
  const getRegNumber = () => {
    if (!user) return '';
    if (user.registrationNumber) return user.registrationNumber;
    if (!user.isVitBhopal || !user.email) return '';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts[1].toUpperCase();
    }
    return '';
  };

  const handleTogglePin = async (event, e) => {
    e.stopPropagation();
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
        fetchEvents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to toggle pin status.');
      }
    } catch {
      alert('Network error toggling pin status.');
    }
  };

  const recommendedEvents = useMemo(() => {
    if (!events) return [];
    
    // Filter out ended events
    const upcomingEvents = events.filter(e => {
      const status = getEventStatus(e);
      if (status === 'ended') return false;

      if (!e.eventStartDateTime && !e.eventEndDateTime && e.date) {
        const eventDate = new Date(e.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (eventDate < today) return false;
      }
      return true;
    });

    const studentProgram = (user?.program || '').toLowerCase();
    const studentCourses = (user?.courses || []).map(c => c.toLowerCase());

    const scored = upcomingEvents.map(event => {
      let score = 0;
      
      // Admin pinned events get highest priority
      if (event.pinned) {
        score += 10000;
      }

      // Personalization boosts
      if (user && event.createdBy === user.email) {
        score += 400;
      }

      if (user && user.clubId && event.clubId === user.clubId) {
        score += 500;
      }

      const category = (event.category || '').toLowerCase();
      const tags = (event.tags || []).map(t => t.toLowerCase());

      const hasCseAiDs = studentProgram.includes('cse') || 
                        studentProgram.includes('ai') || 
                        studentProgram.includes('data science') || 
                        studentProgram.includes('computational');

      const hasDsaDbms = studentCourses.some(c => c.includes('dsa') || c.includes('dbms') || c.includes('data structures') || c.includes('database'));

      if (hasCseAiDs || hasDsaDbms) {
        if (category === 'tech') {
          score += 300;
        } else if (category === 'robotics') {
          score += 200;
        }
      }

      studentCourses.forEach(course => {
        tags.forEach(tag => {
          if (course.includes(tag) || tag.includes(course)) {
            score += 50;
          }
        });
        if (course.includes(category) || category.includes(course)) {
          score += 50;
        }
      });

      // Popularity (impressions) acts as a secondary tie-breaker
      score += (event.impressions || 0) * 2;

      return { event, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.event.date) - new Date(b.event.date);
    });

    return scored.map(s => s.event);
  }, [events, user]);

  const hyperspeedOptions = useMemo(() => (
    theme === 'light' ? LIGHT_HYPERSPEED_OPTIONS : DARK_HYPERSPEED_OPTIONS
  ), [theme]);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%', overflow: 'hidden' }}>
      {!isMobileDevice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          opacity: theme === 'light' ? 0.08 : 0.5,
          pointerEvents: 'none'
        }}>
          <Suspense fallback={null}>
            <Hyperspeed effectOptions={hyperspeedOptions} />
          </Suspense>
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
          <h1 className="section-title">Welcome Back, {user && !user.isGuest && user.name ? user.name : 'VITian'}</h1>
          <p 
            className="section-subtitle"
            style={{
              maxHeight: showSubtitle ? '100px' : '0px',
              opacity: showSubtitle ? 1 : 0,
              margin: showSubtitle ? '0.5rem 0 0 0' : '0px',
              overflow: 'hidden',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
             Here is your college lifestyle and management companion for today. Keep track of college events, active clubs, and your academic timetable.
          </p>
        </div>

      {user && (
        <div className="bento-grid">
          {/* Live class tracker takes 2 columns in the bento grid */}
          {renderLiveClassTracker()}
          
          {/* Profile Welcome Stats card takes 1 column */}
          <div className="bento-item profile-stats-item">
            {renderProfileStatsWidget()}
          </div>
          
          {/* Upcoming Events Bento Item takes 2 columns in the second row */}
          <div className="bento-item span-2 upcoming-events-item" style={{ display: 'flex', flexDirection: 'column', minHeight: '260px', padding: '1.5rem 1.75rem', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: theme === 'light' ? '#0284c7' : '#38bdf8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
                  UPCOMING & RECOMMENDED EVENTS
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', fontSize: '1.35rem', fontFamily: 'var(--font-heading)', fontWeight: 800, color: theme === 'light' ? '#0f172a' : '#f8fafc' }}>Events For You</h3>
              </div>
              <button className="btn-secondary" onClick={() => onNavigate('campus')} style={{ padding: '0.45rem 0.95rem', fontSize: '0.8rem', borderRadius: '10px', fontWeight: 700 }}>
                View All Events →
              </button>
            </div>

            {isAdmin && (
              <div className="glass-panel" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: eventsLocked ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: eventsLocked ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-primary))', fontWeight: '600' }}>
                  {eventsLocked ? '🔒 Events Section is Locked (Students see a placeholder)' : '🔓 Events Section is Unlocked (Students see active events)'}
                </span>
                <button
                  onClick={onToggleEventsLock}
                  className="paper-btn"
                  style={{
                    width: 'auto',
                    margin: 0,
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    background: eventsLocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: eventsLocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: eventsLocked ? '#10b981' : '#ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {eventsLocked ? 'Unlock Section' : 'Lock Section'}
                </button>
              </div>
            )}

            {(() => {
              if (eventsLocked && !isAdmin) {
                return (
                  <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', minHeight: '190px', background: theme === 'light' ? 'rgba(2, 132, 199, 0.04)' : 'rgba(255, 255, 255, 0.02)', border: theme === 'light' ? '1px dashed rgba(2, 132, 199, 0.2)' : '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '1.75rem 1.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '2.8rem', marginBottom: '0.75rem', display: 'block' }}>🔒</span>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: theme === 'light' ? '#0f172a' : 'hsl(var(--text-primary))', fontWeight: 800 }}>Events Will Resume After Exams</h4>
                    <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: theme === 'light' ? '#475569' : 'hsl(var(--text-muted))', maxWidth: '460px', lineHeight: 1.4 }}>Stay tuned! Check back once exams are completed for exciting club recruitments, technical workshops, and hackathons.</p>
                    <button className="btn-primary" onClick={() => onNavigate('campus')} style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', borderRadius: '10px', fontWeight: 700 }}>
                      Explore Campus Clubs & Life
                    </button>
                  </div>
                );
              }

              const N = recommendedEvents.length;
              if (N === 0) {
                return (
                  <div style={{ display: 'flex', flexGrow: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', minHeight: '190px', background: theme === 'light' ? 'rgba(2, 132, 199, 0.04)' : 'rgba(255, 255, 255, 0.02)', border: theme === 'light' ? '1px dashed rgba(2, 132, 199, 0.2)' : '1px dashed rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '1.75rem 1.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '2.8rem', marginBottom: '0.75rem', display: 'block' }}>🎉</span>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: theme === 'light' ? '#0f172a' : 'hsl(var(--text-primary))', fontWeight: 800 }}>Discover Campus Events & Clubs</h4>
                    <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: theme === 'light' ? '#475569' : 'hsl(var(--text-muted))', maxWidth: '480px', lineHeight: 1.4 }}>No active event recommendations right now. Explore active campus clubs, hackathons, and upcoming workshops!</p>
                    <button className="btn-primary" onClick={() => onNavigate('campus')} style={{ padding: '0.5rem 1.15rem', fontSize: '0.85rem', borderRadius: '10px', fontWeight: 700 }}>
                      Explore All Events & Clubs →
                    </button>
                  </div>
                );
              }

              if (!isMobileDevice) {
                return (
                  <div
                    className="desktop-events-grid"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '1.25rem',
                      width: '100%',
                      marginTop: '0.5rem'
                    }}
                  >
                    {recommendedEvents.slice(0, 3).map((eventItem) => (
                      <div key={eventItem.id} className="desktop-event-card-wrapper" style={{ minWidth: 0, flex: 1 }}>
                        <DashboardEventCardItem
                          event={eventItem}
                          clubs={clubs}
                          user={user}
                          token={token}
                          setSelectedEvent={() => {
                            if (onNavigateToEvent) {
                              onNavigateToEvent(eventItem.id);
                            }
                          }}
                          handleTogglePin={handleTogglePin}
                          theme={theme}
                        />
                      </div>
                    ))}
                  </div>
                );
              }

              // Render up to 3 cards in the deck for mobile
              const visibleCards = [];
              const limit = Math.min(N, 3);
              for (let i = 0; i < limit; i++) {
                const idx = (currentStackIndex + i) % N;
                visibleCards.push({
                  event: recommendedEvents[idx],
                  stackPos: i,
                  key: `${recommendedEvents[idx].id}-${idx}`
                });
              }

              return (
                <>
                  <div className="event-stack-container">
                    {showSwipeHint && (
                      <div className="swipe-hint">
                        <span className="swipe-hint-text">Swipe →</span>
                        <svg className="swipe-hint-hand" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </div>
                    )}
                    {visibleCards.reverse().map(({ event: eventItem, stackPos, key }) => {
                      const isTop = stackPos === 0;
                      const cardStyle = {};
                      
                      if (isTop) {
                        if (isDragging) {
                          cardStyle.transform = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${dragOffset.x * 0.08}deg)`;
                        } else if (exitDirection) {
                          cardStyle.transform = `translate3d(${exitDirection.x}px, ${exitDirection.y}px, 0) rotate(${exitDirection.x * 0.08}deg)`;
                          cardStyle.opacity = 0;
                          cardStyle.pointerEvents = 'none';
                        }
                      }

                      return (
                        <div
                          key={key}
                          className={`stacked-card pos-${stackPos} ${isTop && isDragging ? 'dragging' : ''}`}
                          style={cardStyle}
                          onPointerDown={isTop ? handlePointerDown : undefined}
                          onPointerMove={isTop ? handlePointerMove : undefined}
                          onPointerUp={isTop ? (e) => handlePointerUp(e, eventItem) : undefined}
                          onPointerCancel={isTop ? (e) => handlePointerUp(e, eventItem) : undefined}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => e.stopPropagation()}
                        >
                          {/* Swipe Action Badges overlay strictly on top card */}
                          {isTop && swipeAction && (
                            <div 
                              className={`swipe-badge badge-${swipeAction}`} 
                              style={{ opacity: Math.min(1, Math.abs(dragOffset.x) / 50) }}
                            >
                              {swipeAction === 'like' ? 'Interested' : 'Skip'}
                            </div>
                          )}
                          
                          <DashboardEventCardItem
                            event={eventItem}
                            clubs={clubs}
                            user={user}
                            token={token}
                            setSelectedEvent={() => {
                              if (onNavigateToEvent) {
                                onNavigateToEvent(eventItem.id);
                              }
                            }}
                            handleTogglePin={handleTogglePin}
                            theme={theme}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Active Opportunities Stats card takes 1 column in the second row */}
          <div className="bento-item stat-card active-opportunities-item" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Active Openings</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'hsl(var(--primary))', marginTop: '0.5rem', fontFamily: 'var(--font-heading)' }}>{opportunities.length}</div>
              </div>
              <div style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '12px', 
                background: 'hsla(var(--primary) / 0.12)', 
                color: 'hsl(var(--primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>
                🎯
              </div>
            </div>
            <div style={{ marginTop: '1.5rem', width: '100%' }}>
              <button 
                className="btn-primary" 
                onClick={() => onNavigate('opportunities')} 
                style={{ width: '100%', padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, borderRadius: '10px' }}
              >
                🔍 Explore Jobs & Internships
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Dashboard Main Split Layout */}
      <div className="dash-layout" style={{ gridTemplateColumns: '1fr' }}>
        {/* Latest Opportunities Preview */}
        <div className="glass-panel dashboard-panel">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Latest Openings</h3>
          <div className="quick-list">
            {activeOpportunities.length > 0 ? (
              activeOpportunities.map((opp) => (
                <div key={opp.id} className="glass-card quick-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="opp-org" style={{ fontSize: '0.7rem' }}>{opp.organization}</span>
                    <span className="opp-match" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>{opp.matchScore}% match</span>
                  </div>
                  <div className="quick-title" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {opp.title}
                  </div>
                  <div className="opp-tags" style={{ margin: 0 }}>
                    <span className="opp-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{opp.type}</span>
                    <span className="opp-tag" style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem' }}>{opp.deadline}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card quick-item" style={{ color: 'hsl(var(--text-muted))', justifyContent: 'center' }}>
                📭 No active openings available.
              </div>
            )}
            <button className="btn-secondary" style={{ width: '100%', padding: '0.6rem' }} onClick={() => onNavigate('opportunities')}>
              View All Opportunities →
            </button>
          </div>
        </div>
      </div>
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          user={user}
          token={token}
          clubs={clubs}
          fetchEvents={fetchEvents}
          theme={theme}
        />
      )}

    </div>
  );
};

export default memo(Dashboard);
