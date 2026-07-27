import { useState, useEffect, useCallback } from 'react';
import ConsentBanner from './ConsentBanner';

export default function EditProfileModal({ user, token, handleLogout, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [semester, setSemester] = useState(user?.semester || 1);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const fetchSessions = useCallback(async () => {
    await Promise.resolve();
    try {
      setSessionsLoading(true);
      setSessionsError('');
      const res = await fetch('/api/user/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        const errData = await res.json();
        setSessionsError(errData.error || 'Failed to load sessions.');
      }
    } catch {
      setSessionsError('Failed to fetch active sessions.');
    } finally {
      setSessionsLoading(false);
    }
  }, [token]);

  // Fetch active sessions if not guest
  useEffect(() => {
    if (token && !user?.isGuest) {
      Promise.resolve().then(() => {
        fetchSessions();
      });
    }
  }, [token, user, fetchSessions]);

  const handleRevokeSession = async (sessionId, isCurrent) => {
    if (isCurrent) {
      if (!confirm('Logging out from the current device. Proceed?')) return;
      handleLogout();
      onClose();
      return;
    }
    
    if (!confirm('Are you sure you want to revoke this session?')) return;

    try {
      const res = await fetch(`/api/user/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        const errData = await res.json();
        alert('Failed to revoke session: ' + errData.error);
      }
    } catch (err) {
      alert('Error revoking session: ' + err.message);
    }
  };

  const handleRevokeOthers = async () => {
    if (!confirm('Are you sure you want to log out all other devices?')) return;
    try {
      const res = await fetch('/api/user/sessions/revoke-others', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.isCurrent));
      } else {
        const errData = await res.json();
        alert('Failed to revoke other sessions: ' + errData.error);
      }
    } catch (err) {
      alert('Error revoking other sessions: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name cannot be empty.'); return; }
    setLoading(true);
    await onSave(name.trim(), parseInt(semester, 10) || 1);
    setLoading(false);
  };

  const getDeviceIconAndName = (userAgent) => {
    const ua = userAgent.toLowerCase();
    let os = 'Unknown Device';
    let icon = '💻';
    
    if (ua.includes('windows')) {
      os = 'Windows';
      icon = '🪟';
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
      os = 'macOS';
      icon = '🍎';
    } else if (ua.includes('android')) {
      os = 'Android';
      icon = '🤖';
    } else if (ua.includes('iphone') || ua.includes('ipad')) {
      os = 'iOS';
      icon = '📱';
    } else if (ua.includes('linux')) {
      os = 'Linux';
      icon = '🐧';
    }
    
    let browser = '';
    if (ua.includes('chrome') || ua.includes('chromium')) {
      browser = 'Chrome';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('edge') || ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('opr') || ua.includes('opera')) {
      browser = 'Opera';
    }
    
    return { os, browser, icon };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-heading"
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 id="edit-profile-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            ✏️ Edit Profile
          </h2>
          <button 
            onClick={onClose} 
            aria-label="Close edit profile modal"
            style={{
              background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
              fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
            }}
          >✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form" style={{ marginBottom: token && !user?.isGuest ? '2rem' : 0 }}>
          <div className="form-group">
            <label htmlFor="edit-profile-name" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '0.4rem', display: 'block' }}>Name</label>
            <input 
              id="edit-profile-name"
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your name" 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-profile-semester" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '0.4rem', display: 'block' }}>Semester</label>
            <select 
              id="edit-profile-semester"
              value={semester} 
              onChange={e => setSemester(e.target.value)} 
              required
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#ffffff',
                padding: '0.65rem 0.85rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem} style={{ background: '#121215', color: '#ffffff' }}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn-submit" disabled={loading} style={{ padding: '0.6rem 1.2rem', fontWeight: 600 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading} style={{ padding: '0.6rem 1.2rem' }}>
              Cancel
            </button>
          </div>
        </form>

        {token && !user?.isGuest && (
          <div style={{ borderTop: '1px solid hsl(var(--border) / 0.5)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--text-primary))', margin: 0 }}>
                🔒 Active Login Sessions
              </h3>
              {sessions.length > 1 && (
                <button 
                  onClick={handleRevokeOthers}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'hsl(var(--destructive))',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => e.target.style.background = 'hsl(var(--destructive) / 0.1)'}
                  onMouseOut={(e) => e.target.style.background = 'none'}
                >
                  Log Out Other Devices
                </button>
              )}
            </div>

            {sessionsLoading ? (
              <div style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '1rem', fontSize: '0.9rem' }}>
                Loading active sessions...
              </div>
            ) : sessionsError ? (
              <div style={{ color: 'hsl(var(--destructive))', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                ⚠️ {sessionsError}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                {sessions.map(s => {
                  const { os, browser, icon } = getDeviceIconAndName(s.userAgent);
                  return (
                    <div 
                      key={s.id} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        background: 'hsl(var(--card))',
                        border: s.isCurrent ? '1px solid hsl(var(--success) / 0.4)' : '1px solid hsl(var(--border) / 0.3)',
                        boxShadow: s.isCurrent ? '0 0 12px hsl(var(--success) / 0.05)' : 'none',
                        transition: 'transform 0.2s, border-color 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'hsl(var(--text-primary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {os} {browser && <span style={{ color: 'hsl(var(--text-muted))', fontWeight: 400 }}>({browser})</span>}
                            {s.isCurrent && (
                              <span style={{
                                fontSize: '0.7rem',
                                padding: '1px 6px',
                                borderRadius: '100px',
                                background: 'hsl(var(--success) / 0.15)',
                                color: 'hsl(var(--success))',
                                fontWeight: 600,
                              }}>
                                Current Device
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                            IP: {s.ipAddress} • Active: {formatDate(s.lastActiveAt)}
                          </div>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(s.id, s.isCurrent)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'hsl(var(--text-muted))',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            transition: 'color 0.2s, background-color 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.target.style.color = 'hsl(var(--destructive))';
                            e.target.style.background = 'hsl(var(--destructive) / 0.1)';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.color = 'hsl(var(--text-muted))';
                            e.target.style.background = 'none';
                          }}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <ConsentBanner />
    </div>
  );
}
