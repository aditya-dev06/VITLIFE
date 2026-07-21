import { useState } from 'react';

export default function FeedbackModal({ user, onClose }) {
  const [type, setType] = useState('Suggestion');
  const [name, setName] = useState(user ? (user.username || '') : '');
  const [email, setEmail] = useState(user ? (user.email || '') : '');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please write a message.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('ds_ai_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type,
          name: name || undefined,
          email: email || undefined,
          message
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback.');

      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.75)', border: '1px solid hsla(var(--border-glass))', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            💬 Share Feedback
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-secondary))', cursor: 'pointer', fontSize: '1.25rem', padding: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '3rem', animation: 'bounce 1s infinite' }}>🎉</span>
            <h3 style={{ margin: 0, color: 'hsl(var(--text-primary))', fontSize: '1.15rem', fontWeight: 700 }}>Thank you for your feedback!</h3>
            <p style={{ margin: 0, color: 'hsl(var(--text-muted))', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Your response has been sent to our development team. We appreciate your help in improving VIT Life!
            </p>
            <div style={{ width: '100%', height: '2px', background: 'hsla(var(--primary) / 0.2)', borderRadius: '2px', marginTop: '1rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: 'hsl(var(--primary))', width: '100%', animation: 'shrinkWidth 3s linear forwards' }} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '600' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {['Suggestion', 'Bug', 'Other'].map(t => {
                  const labelMap = { Suggestion: '💡 Suggest', Bug: '🐛 Bug', Other: '💬 General' };
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      style={{
                        padding: '0.65rem 0.5rem',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        borderRadius: '12px',
                        border: '1px solid',
                        borderColor: active ? 'hsl(var(--primary))' : 'hsla(var(--border-glass))',
                        background: active ? 'hsla(var(--primary) / 0.15)' : 'rgba(255,255,255,0.03)',
                        color: active ? 'hsl(var(--primary))' : 'hsl(var(--text-secondary))',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                    >
                      {labelMap[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid hsla(var(--border-glass))',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                  onBlur={(e) => e.target.style.borderColor = 'hsla(var(--border-glass))'}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email (Optional)</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid hsla(var(--border-glass))',
                    background: 'rgba(255,255,255,0.03)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                  onBlur={(e) => e.target.style.borderColor = 'hsla(var(--border-glass))'}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Message</label>
              <textarea
                placeholder={type === 'Bug' ? "Describe the bug and how to reproduce it..." : "Your suggestions, ideas, or feedback..."}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid hsla(var(--border-glass))',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: '1.5',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = 'hsl(var(--primary))'}
                onBlur={(e) => e.target.style.borderColor = 'hsla(var(--border-glass))'}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.85rem',
                fontSize: '0.88rem',
                fontWeight: '700',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, hsl(var(--primary)), #4f46e5)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px hsla(var(--primary) / 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px hsla(var(--primary) / 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 4px 12px hsla(var(--primary) / 0.25)';
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '0.2rem', animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"/>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Sending...
                </>
              ) : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
      <style>{`
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
