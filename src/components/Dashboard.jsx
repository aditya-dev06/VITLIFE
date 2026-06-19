import { useState } from 'react';
import BounceCards from './BounceCards';
import Hyperspeed from './Hyperspeed';

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

function getCardOpacity(status) {
  switch (status) {
    case 'ended': return 0.4;
    case 'reg_closed': return 0.55;
    default: return 1;
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
        }
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

        {activePoster && (
          <div style={{ 
            width: '100%', 
            maxHeight: '400px', 
            borderRadius: '8px', 
            overflow: 'hidden', 
            marginBottom: '1.25rem', 
            border: '1px solid hsla(var(--border-glass))',
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
                maxHeight: '400px', 
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
                  width: '60px',
                  height: '60px',
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
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>📅 Event Schedule</h4>
            <div style={{ 
              width: '100%', 
              maxHeight: '400px', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              marginBottom: '1.25rem', 
              border: '1px solid hsla(var(--border-glass))',
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
                  maxHeight: '400px', 
                  objectFit: 'contain', 
                  display: 'block' 
                }} 
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h4 style={{ color: 'hsl(var(--text-primary))', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Event Description</h4>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.88rem', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
              {event.description}
            </p>
          </div>

          {/* Status Banner */}
          {(() => {
            const status = getEventStatus(event);
            const badge = getStatusBadge(status);
            return (
              <div className={`status-banner ${status.replace('_', '-')}`}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{badge.text}</span>
                {event.registrationDeadline && status === 'reg_open' && (
                  <span style={{ fontSize: '0.78rem', color: 'hsl(var(--text-muted))', marginLeft: 'auto' }}>
                    ⏳ Reg. closes {formatDateTime(event.registrationDeadline)}
                  </span>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid hsla(var(--border-glass))' }}>
            {event.eventStartDateTime ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Event Start</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>🚀 {formatDateTime(event.eventStartDateTime)}</div>
              </div>
            ) : event.date ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Date</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>📅 {formatDate(event.date)}</div>
              </div>
            ) : null}
            {event.eventEndDateTime ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Event End</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>🏁 {formatDateTime(event.eventEndDateTime)}</div>
              </div>
            ) : event.time ? (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Time</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>🕐 {event.time}</div>
              </div>
            ) : null}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Venue</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>📍 {event.venue || 'TBA'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Category</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: `hsl(${catColor})`, textTransform: 'capitalize' }}>
                {getCategoryIcon(event.category)} {event.category}
              </div>
            </div>
            {event.registrationDeadline && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Registration Deadline</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: getEventStatus(event) === 'reg_open' ? 'hsl(140, 60%, 50%)' : 'hsl(0, 60%, 55%)' }}>
                  📝 {formatDateTime(event.registrationDeadline)}
                </div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>Price</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
                {event.price && event.price !== '0' && event.price.toLowerCase() !== 'free' ? `💰 ₹${event.price}` : '🆓 Free'}
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
            >
              {event.registrationLink ? '🔗 Register Now' : '✉️ Contact Host'}
            </a>
            
            {isAdmin && (
              <button
                onClick={handleTogglePin}
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
                onClick={handleDelete}
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

function DashboardEventCardItem({
  event,
  clubs,
  user,
  setSelectedEvent,
  handleTogglePin,
  theme
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [cardWidth, setCardWidth] = useState('280px'); // default width before image loads
  const [isHovered, setIsHovered] = useState(false);

  const daysLeft = getDaysRemaining(event.registrationDeadline || event.date);
  const catColor = getCategoryColorThemeAware(event.category, theme);
  const eventClub = clubs.find(c => c.id === event.clubId);
  const clubName = eventClub ? eventClub.name : event.clubName || 'Unknown Club';
  const isAdmin = user && user.role === 'admin';
  const status = getEventStatus(event);
  const badge = getStatusBadge(status);
  const opacity = getCardOpacity(status);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      const aspect = naturalWidth / naturalHeight;
      let calculatedWidth = Math.round(240 * aspect);
      
      // Enforce clean min and max constraints
      calculatedWidth = Math.max(180, Math.min(320, calculatedWidth));
      setCardWidth(`${calculatedWidth}px`);
      setImageLoaded(true);
    }
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
        border: event.pinned ? '1px solid hsla(var(--primary) / 0.5)' : undefined,
        boxShadow: event.pinned ? '0 0 15px hsla(var(--primary) / 0.15)' : undefined,
        width: showBounce ? '280px' : cardWidth
      }}
    >
      {/* Pinned Badge */}
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

      {/* Status Badge */}
      <div 
        className={`status-badge ${status.replace('_', '-')}`}
        style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 5 }}
      >
        {badge.text}
      </div>

      {/* Poster Image */}
      {event.posterUrl && (
        showBounce ? (
          <div style={{ height: '160px', width: '100%', overflow: 'hidden', borderBottom: '1px solid hsla(var(--border-glass))', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <BounceCards
              className="event-card-bounce"
              images={event.posterUrls}
              containerWidth="100%"
              containerHeight={160}
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
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )
      )}

      {/* Details */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0, flex: 1 }}>
            {event.title}
          </h4>
          {daysLeft !== null && status !== 'ended' && (
            <span className="countdown-badge">
              ⏰ {daysLeft}d left
            </span>
          )}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.8rem', fontWeight: 600, color: `hsl(${catColor})`
        }}>
          <ClubLogo club={eventClub} category={event.category} size={20} borderRadius="50%" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName}</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
          {event.eventStartDateTime && <span>🚀 {formatDateTime(event.eventStartDateTime)}</span>}
          {!event.eventStartDateTime && event.date && <span>📅 {formatDate(event.date)}</span>}
          {event.venue && <span>📍 {event.venue}</span>}
        </div>

        {/* Registration deadline & Price row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.73rem', alignItems: 'center' }}>
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

        {isAdmin && (
          <div style={{ marginTop: 'auto', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
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

const Dashboard = ({ stats, user, opportunities, onNavigate, onUpdateSemester, clubs = [], events = [], fetchEvents, token, theme }) => {
  const [selectedEvent, setSelectedEvent] = useState(null);
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
        }
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

  const getRecommendedEvents = () => {
    if (!events) return [];
    
    // Filter out ended events
    const upcomingEvents = events.filter(e => {
      const status = getEventStatus(e);
      if (status === 'ended') return false;

      // Legacy fallback for events without start/end datetimes
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
      if (event.pinned) {
        score += 10000;
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
          score += 100;
        } else if (category === 'robotics') {
          score += 80;
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

      return { event, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return new Date(a.event.date) - new Date(b.event.date);
    });

    return scored.map(s => s.event);
  };

  const recommendedEvents = getRecommendedEvents();

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100%', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: theme === 'light' ? 0.6 : 0.5,
        pointerEvents: 'none'
      }}>
        <Hyperspeed effectOptions={theme === 'light' ? LIGHT_HYPERSPEED_OPTIONS : DARK_HYPERSPEED_OPTIONS} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
        <h1 className="section-title">Welcome Back, {user ? user.name : 'Data Explorer'}</h1>
        <p className="section-subtitle">
          Here is your computational intelligence hub for today. Keep building, coding, and researching.
        </p>
      </div>

      {/* Upcoming Events Section */}
      {user && user.isVitBhopal && (
        <div className="glass-panel dashboard-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Upcoming & Recommended Events</h3>
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Events recommended based on your program & courses. Sponsored events are featured at the top.
              </p>
            </div>
          </div>

          {recommendedEvents.length > 0 ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.5rem',
              width: '100%',
              alignItems: 'flex-start'
            }}>
              {recommendedEvents.map(event => (
                <DashboardEventCardItem
                  key={event.id}
                  event={event}
                  clubs={clubs}
                  user={user}
                  token={token}
                  setSelectedEvent={setSelectedEvent}
                  handleTogglePin={handleTogglePin}
                  theme={theme}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span style={{ fontSize: '2.5rem' }}>📅</span>
              <p>No upcoming events recommended at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="glass-panel info-banner">
        <div className="info-banner-content" style={{ maxWidth: '100%' }}>
          <span className="branch-badge">
            {user && user.isVitBhopal 
              ? `VIT Bhopal Student • ${getRegNumber()} • Sem ${user.semester || 1}` 
              : (user && user.semester && user.semester !== 0 ? `Global Student • Sem ${user.semester}` : 'Global Data Science & AI Member')}
          </span>
          
          <h2 style={{ marginTop: '0.5rem' }}>
            {user && user.isVitBhopal 
              ? (user.program || 'Integrated M.Tech CSE (Computational & Data Science)') 
              : 'Master Computational Science & AI'}
          </h2>
          
          <p>
            Your profile blends mathematical modeling, software systems, and artificial intelligence. Use this dashboard to bridge theoretical knowledge with active hackathons and real-time remote internships.
          </p>

          {user && user.isVitBhopal && user.courses && user.courses.length > 0 && (
            <div style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--secondary))', marginBottom: '0.5rem' }}>
                📌 Active Semester Courses Highlighted:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {user.courses.map((course) => (
                  <span 
                    key={course} 
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '0.2rem 0.5rem', 
                      background: 'rgba(6, 182, 212, 0.1)', 
                      color: 'hsl(var(--secondary))', 
                      border: '1px solid rgba(6, 182, 212, 0.2)',
                      borderRadius: '4px' 
                    }}
                  >
                    {course}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <button className="btn-primary" onClick={() => onNavigate('roadmap')}>
              View Skill Roadmap
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: theme === 'light' ? 'hsl(var(--text-secondary))' : 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Active Semester:</span>
              <select
                value={user ? user.semester : '1'}
                onChange={(e) => onUpdateSemester(e.target.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
                  border: theme === 'light' ? '1px solid rgba(0, 0, 0, 0.12)' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: theme === 'light' ? 'hsl(var(--text-primary))' : 'white',
                  outline: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {user && user.isVitBhopal ? (
                  (() => {
                    const isIntegrated = (user.program && user.program.startsWith('Integrated M.Tech')) || 
                                         (user.email && (user.email.toLowerCase().includes('bim') || user.email.toLowerCase().includes('mim')));
                    const maxSem = isIntegrated ? 10 : 8;
                    const options = [];
                    for (let i = 1; i <= maxSem; i++) {
                      options.push(
                        <option 
                          key={i} 
                          value={i.toString()} 
                          style={{ 
                            backgroundColor: theme === 'light' ? '#ffffff' : '#18181b',
                            color: theme === 'light' ? 'hsl(var(--text-primary))' : '#ffffff'
                          }}
                        >
                          Sem {i}
                        </option>
                      );
                    }
                    return options;
                  })()
                ) : (
                  <>
                    <option 
                      value="0" 
                      style={{ 
                        backgroundColor: theme === 'light' ? '#ffffff' : '#18181b',
                        color: theme === 'light' ? 'hsl(var(--text-primary))' : '#ffffff'
                      }}
                    >
                      Not a Student
                    </option>
                    {[1,2,3,4,5,6,7,8].map(i => (
                      <option 
                        key={i} 
                        value={i.toString()} 
                        style={{ 
                          backgroundColor: theme === 'light' ? '#ffffff' : '#18181b',
                          color: theme === 'light' ? 'hsl(var(--text-primary))' : '#ffffff'
                        }}
                      >
                        Sem {i}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-info">
            <div className="label">Active Opportunities</div>
            <div className="value">{opportunities.length}</div>
          </div>
          <div className="stat-icon" style={{ background: 'hsla(300, 100%, 50%, 0.15)', color: '#f50057' }}>
            🎯
          </div>
        </div>
      </div>



      {/* Dashboard Main Split Layout */}
      <div className="dash-layout">
        {/* Left: Focus / Roadmap Tasks */}
        <div className="glass-panel dashboard-panel">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Focus Items for Today</h3>
          <div className="quick-list">
            {inProgressSkills.length > 0 ? (
              inProgressSkills.map((skill, index) => (
                <div key={index} className="glass-card quick-item">
                  <div className="quick-bullet"></div>
                  <div className="quick-content">
                    <div className="quick-title">Resume Learning: {skill.name}</div>
                    <div className="quick-meta">Category: {skill.category} | Level {skill.level}</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('roadmap')}>
                    Open
                  </button>
                </div>
              ))
            ) : (
              <div className="glass-card quick-item" style={{ color: 'hsl(var(--text-muted))', justifyContent: 'center' }}>
                🎉 You don't have any skills marked as "In Progress". Go to the Roadmap to select one!
              </div>
            )}

            <div className="glass-card quick-item">
              <div className="quick-bullet" style={{ background: 'hsl(var(--secondary))' }}></div>
              <div className="quick-content">
                <div className="quick-title">Daily Practice Quiz</div>
                <div className="quick-meta">Test your statistics & ML knowledge to earn 50 XP</div>
              </div>
              <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => onNavigate('practice')}>
                Solve
              </button>
            </div>
          </div>
        </div>

        {/* Right: Latest Opportunities Preview */}
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
    </div>
  );
};

export default Dashboard;
