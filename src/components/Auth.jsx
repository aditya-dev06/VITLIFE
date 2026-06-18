import { useState, useEffect } from 'react';
import RotatingText from './RotatingText';

const COURSES_LIST = [
  { code: 'DSA', name: 'Data Structures & Algorithms' },
  { code: 'DBMS', name: 'Database Management Systems' },
  { code: 'OOP', name: 'Object-Oriented Programming' },
  { code: 'Numerical Methods', name: 'Numerical Methods & Computational Math' }
];

const getRegNumberAndProgram = (emailStr) => {
  const cleanEmail = emailStr.trim().toLowerCase();
  const regex = /^([a-zA-Z.-]+)\.([a-zA-Z0-9]+)@vitbhopal\.ac\.in$/;
  const match = cleanEmail.match(regex);
  if (match) {
    const regNum = match[2].toUpperCase();
    const progMatch = regNum.match(/^\d{2}([A-Z]{3})/);
    let program = 'VIT Bhopal Student';
    let isBim = false;
    if (progMatch) {
      const code = progMatch[1];
      const programMap = {
        'BIM': 'Integrated M.Tech CSE (Computational & Data Science)',
        'BCE': 'B.Tech Computer Science & Engineering',
        'BDS': 'B.Tech CSE (Data Science)',
        'BAI': 'B.Tech CSE (AI & ML)',
        'BCY': 'B.Tech CSE (Cyber Security)',
        'BEC': 'B.Tech Electronics & Communication Engineering',
        'BEE': 'B.Tech Electrical & Electronics Engineering',
        'BME': 'B.Tech Mechanical Engineering',
        'BBA': 'Bachelor of Business Administration',
        'MCA': 'Master of Computer Applications'
      };
      program = programMap[code] || `B.Tech/M.Tech (${code}) Student`;
      if (code === 'BIM') isBim = true;
    }
    return { regNum, program, isBim };
  }
  return null;
};

const Auth = ({ onLoginSuccess }) => {
  const [authState, setAuthState] = useState(() => {
    return sessionStorage.getItem('authState') || 'login';
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => {
    return sessionStorage.getItem('authEmail') || '';
  });
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [isVitBhopal, setIsVitBhopal] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [smtpDown, setSmtpDown] = useState(false);

  useEffect(() => {
    if (email) {
      sessionStorage.setItem('authEmail', email);
    } else {
      sessionStorage.removeItem('authEmail');
    }
  }, [email]);

  useEffect(() => {
    sessionStorage.setItem('authState', authState);
  }, [authState]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    fetch(`/api/health/smtp?t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
      .then(r => r.json())
      .then(d => setSmtpDown(!d.smtpHealthy))
      .catch(() => setSmtpDown(true));
  }, []);

  const handleCourseChange = (courseCode) => {
    if (selectedCourses.includes(courseCode)) {
      setSelectedCourses(selectedCourses.filter(c => c !== courseCode));
    } else {
      setSelectedCourses([...selectedCourses, courseCode]);
    }
  };

  const validateEmail = (emailStr) => {
    const cleanEmail = emailStr.trim().toLowerCase();
    if (isVitBhopal) {
      const regex = /^[a-zA-Z.-]+\.[a-zA-Z0-9]+@vitbhopal\.ac\.in$/;
      return regex.test(cleanEmail);
    } else {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(cleanEmail);
    }
  };

  const handleLoginSuccess = (token, user) => {
    sessionStorage.removeItem('authEmail');
    sessionStorage.removeItem('authState');
    if (onLoginSuccess) {
      onLoginSuccess(token, user);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const isSignUp = authState === 'signup';

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !validateEmail(email)) {
      if (isVitBhopal) {
        setError('Email must follow the pattern: firstname.registrationnumber@vitbhopal.ac.in (e.g., aditya.22bce10001@vitbhopal.ac.in)');
      } else {
        setError('Please enter a valid email address.');
      }
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = !isSignUp 
      ? { email, password }
      : { 
          name, 
          email, 
          password, 
          isVitBhopal, 
          courses: isVitBhopal ? selectedCourses : [],
          semester: parseInt(semester, 10)
        };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        if (!isSignUp && data.unverified) {
          setEmail(data.email || email);
          setAuthState('verify');
          setError('Email not verified. Please enter the verification code sent to your email.');
          setCooldown(60);
          return;
        }
        throw new Error(data.error || 'Authentication failed.');
      }

      if (isSignUp) {
        if (data.verified) {
          setAuthState('login');
          setSuccessMessage(data.message || 'Registration successful! Please sign in.');
        } else {
          setEmail(data.email || email);
          setAuthState('verify');
          setSuccessMessage(data.message || 'Verification code sent to your email.');
          setCooldown(60);
        }
      } else {
        handleLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed.');
      }

      handleLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setSuccessMessage('A new verification code has been sent.');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reset code.');
      }

      setSuccessMessage(data.message || 'If an account exists, a reset code has been sent.');
      setAuthState('reset');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!code || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setAuthState('login');
      setSuccessMessage(data.message || 'Password reset successful. You can now sign in.');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend reset code.');
      }

      setSuccessMessage('A new reset code has been sent.');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => {
    switch (authState) {
      case 'verify':
        return (
          <form onSubmit={handleVerifySubmit} className="auth-form">
            {error && <div className="auth-error-banner">⚠️ {error}</div>}
            {successMessage && <div className="auth-success-banner">✅ {successMessage}</div>}

            <div className="form-group">
              <label>Verification Code</label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="6-digit code" 
                value={code} 
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} 
                required 
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', fontWeight: 'bold' }}
              />
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <div className="auth-extra-actions">
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={handleResendCode}
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
              </button>
              <span className="auth-separator">|</span>
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setAuthState('login');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        );

      case 'forgot':
        return (
          <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
            {error && <div className="auth-error-banner">⚠️ {error}</div>}
            {successMessage && <div className="auth-success-banner">✅ {successMessage}</div>}

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>

            <div className="auth-extra-actions" style={{ justifyContent: 'center' }}>
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setAuthState('login');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPasswordSubmit} className="auth-form">
            {error && <div className="auth-error-banner">⚠️ {error}</div>}
            {successMessage && <div className="auth-success-banner">✅ {successMessage}</div>}

            <div className="form-group">
              <label>Reset Code</label>
              <input 
                type="text" 
                maxLength={6}
                placeholder="6-digit reset code" 
                value={code} 
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} 
                required 
                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input 
                type="password" 
                placeholder="New Password (min 6 characters)" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <div className="auth-extra-actions">
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={handleResendResetCode}
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
              </button>
              <span className="auth-separator">|</span>
              <button 
                type="button" 
                className="auth-link-btn" 
                onClick={() => {
                  setAuthState('login');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        );

      case 'login':
      case 'signup':
      default: {
        const isSignUp = authState === 'signup';
        return (
          <form onSubmit={handleAuthSubmit} className="auth-form">
            {error && <div className="auth-error-banner">⚠️ {error}</div>}
            {successMessage && <div className="auth-success-banner">✅ {successMessage}</div>}

            {isSignUp && (
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                placeholder={isSignUp && isVitBhopal ? "firstname.regnumber@vitbhopal.ac.in" : "Enter your email"} 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            {isSignUp && isVitBhopal && email && (() => {
              const parsed = getRegNumberAndProgram(email);
              if (parsed) {
                return (
                  <div className="detected-program-banner" style={{
                    fontSize: '0.8rem',
                    padding: '0.6rem 0.8rem',
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: 'hsl(var(--secondary))',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    lineHeight: '1.4'
                  }}>
                    ✅ <strong>Registration Number:</strong> {parsed.regNum} <br/>
                    🎓 <strong>Detected Program:</strong> {parsed.program}
                  </div>
                );
              }
              return null;
            })()}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                {!isSignUp && (
                  <button 
                    type="button" 
                    className="auth-link-btn" 
                    style={{ fontSize: '0.75rem', fontWeight: 'normal', textDecoration: 'underline' }}
                    onClick={() => {
                      setAuthState('forgot');
                      setError('');
                      setSuccessMessage('');
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>

            {isSignUp && (
              <>
                <div className="form-group-checkbox">
                  <input 
                    type="checkbox" 
                    id="vit-check" 
                    checked={isVitBhopal} 
                    onChange={(e) => {
                      setIsVitBhopal(e.target.checked);
                      setError('');
                    }} 
                  />
                  <label htmlFor="vit-check">I am a student of VIT Bhopal</label>
                </div>

                <div className="form-group">
                  <label>Current Status / Semester</label>
                  <select 
                    value={semester} 
                    onChange={(e) => setSemester(e.target.value)} 
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      outline: 'none'
                    }}
                  >
                    {isVitBhopal ? (
                      (() => {
                        const parsed = getRegNumberAndProgram(email);
                        const maxSem = (parsed && parsed.isBim) ? 10 : 8;
                        const options = [];
                        for (let i = 1; i <= maxSem; i++) {
                          options.push(
                            <option key={i} value={i.toString()} style={{ backgroundColor: '#18181b' }}>
                              Semester {i}
                            </option>
                          );
                        }
                        return options;
                      })()
                    ) : (
                      <>
                        <option value="0" style={{ backgroundColor: '#18181b' }}>Not a Student / Professional</option>
                        {[1,2,3,4,5,6,7,8].map(i => (
                          <option key={i} value={i.toString()} style={{ backgroundColor: '#18181b' }}>
                            Semester {i}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>

                {isVitBhopal && (
                  <div className="course-customizer glass-panel">
                    <div className="course-title">Select your active semester courses:</div>
                    <div className="course-grid">
                      {COURSES_LIST.map((course) => (
                        <div key={course.code} className="course-checkbox-item">
                          <input 
                            type="checkbox" 
                            id={`course-${course.code}`}
                            checked={selectedCourses.includes(course.code)}
                            onChange={() => handleCourseChange(course.code)}
                          />
                          <label htmlFor={`course-${course.code}`}>
                            <strong>{course.code}</strong>: {course.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : isSignUp ? 'Register Account' : 'Sign In'}
            </button>
          </form>
        );
      }
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">
        <div className="auth-brand">
          <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.1rem' }}>
            <span>VIT</span>
            <RotatingText
              texts={['HON', 'LIFE']}
              mainClassName="auth-rotating-text"
              staggerFrom="last"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-120%", opacity: 0 }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2500}
            />
          </div>
          <div className="auth-subtitle">Computational & Data Science Hub</div>
        </div>

        {smtpDown && (
          <div style={{
            background: 'linear-gradient(135deg, hsla(35, 90%, 55%, 0.15), hsla(0, 80%, 55%, 0.12))',
            border: '1px solid hsla(35, 90%, 55%, 0.4)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔧</span>
            <div>
              <div style={{ fontWeight: 700, color: 'hsl(35, 90%, 60%)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Maintenance Notice
              </div>
              <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
                New registrations and password resets are temporarily unavailable. Existing users can still sign in normally.
              </div>
            </div>
          </div>
        )}

        {(authState === 'login' || authState === 'signup') && (
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${authState === 'login' ? 'active' : ''}`}
              onClick={() => { setAuthState('login'); setError(''); setSuccessMessage(''); }}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${authState === 'signup' ? 'active' : ''}`}
              onClick={() => { setAuthState('signup'); setError(''); setSuccessMessage(''); }}
            >
              Create Account
            </button>
          </div>
        )}

        {(authState === 'verify' || authState === 'forgot' || authState === 'reset') && (
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: 'hsl(var(--text-primary))',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            {authState === 'verify' && 'Verify Your Email'}
            {authState === 'forgot' && 'Reset Password Request'}
            {authState === 'reset' && 'Set New Password'}
          </div>
        )}

        {renderForm()}
      </div>
    </div>
  );
};

export default Auth;
