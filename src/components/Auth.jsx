import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import TypewriterText from './TypewriterText';

/* ═══════════════════════════════════════════════════════════════
   MODULE-LEVEL CONSTANTS & COMPILED REGEXES (Local Validation Speed)
   ═══════════════════════════════════════════════════════════════ */
const COURSES_LIST = [
  { code: 'DSA', name: 'Data Structures & Algorithms' },
  { code: 'DBMS', name: 'Database Management Systems' },
  { code: 'OOP', name: 'Object-Oriented Programming' },
  { code: 'Numerical Methods', name: 'Numerical Methods & Computational Math' }
];

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const VIT_EMAIL_REGEX = /^[a-zA-Z.-]+\.[a-zA-Z0-9]+@vitbhopal\.ac\.in$/;
const GENERAL_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REG_NUM_PARSE_REGEX = /^([a-zA-Z.-]+)\.([a-zA-Z0-9]+)@vitbhopal\.ac\.in$/;
const PROG_CODE_REGEX = /^\d{2}([A-Z]{3})/;

const BRANCH_MAP = {
  'CE': 'Computer Science & Engineering',
  'DS': 'Computer Science & Engineering (Data Science)',
  'AI': 'Computer Science & Engineering (AI & ML)',
  'CY': 'Computer Science & Engineering (Cyber Security)',
  'IM': 'Computer Science & Engineering (Computational & Data Science)',
  'IP': 'Computer Science & Engineering (Computational & Data Science)',
  'EC': 'Electronics & Communication Engineering',
  'EE': 'Electrical & Electronics Engineering',
  'ME': 'Mechanical Engineering'
};

const IS_DEV = Boolean(import.meta.env?.DEV || import.meta.env?.MODE === 'development');

/* ═══════════════════════════════════════════════════════════════
   JWT TOKEN VALIDATION (Clean Token Handling)
   ═══════════════════════════════════════════════════════════════ */
const isValidJWT = (token) => {
  if (typeof token !== 'string' || !token) return false;
  const parts = token.split('.');
  if (parts.length === 4) {
    const exp = parseInt(parts[2], 10);
    if (isNaN(exp)) return false;
    const now = Date.now();
    return exp > now - 5000;
  }
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    
    const nowInSec = Math.floor(Date.now() / 1000);
    // Expiration check with 5-second clock skew tolerance
    if (typeof payload.exp === 'number' && payload.exp <= nowInSec - 5) {
      return false;
    }
    // Not Before check with 5-second tolerance
    if (typeof payload.nbf === 'number' && payload.nbf > nowInSec + 5) {
      return false;
    }
    return typeof payload === 'object' && payload !== null;
  } catch {
    return false;
  }
};

/* ═══════════════════════════════════════════════════════════════
   CACHED GOOGLE AUTH CONFIG (Instant Loading)
   ═══════════════════════════════════════════════════════════════ */
let googleConfigPromise = null;
const fetchGoogleConfig = () => {
  const envClientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;
  if (envClientId) {
    return Promise.resolve({ googleClientId: envClientId });
  }
  if (!googleConfigPromise) {
    googleConfigPromise = fetch('/api/auth/config')
      .then(res => res.json())
      .catch(err => {
        console.error('Failed to fetch Google Auth configuration:', err);
        googleConfigPromise = null;
        return { googleClientId: '' };
      });
  }
  return googleConfigPromise;
};

// Eagerly pre-fetch Google config at module load time for instant loading
fetchGoogleConfig();

/* ═══════════════════════════════════════════════════════════════
   BUSINESS LOGIC & VALIDATION
   ═══════════════════════════════════════════════════════════════ */
const isStrongPassword = (password) => {
  if (typeof password !== 'string') return false;
  return STRONG_PASSWORD_REGEX.test(password);
};

const getRegNumberAndProgram = (emailStr) => {
  if (!emailStr || typeof emailStr !== 'string') return null;
  const cleanEmail = emailStr.trim().toLowerCase();
  const match = cleanEmail.match(REG_NUM_PARSE_REGEX);
  if (match) {
    const regNum = match[2].toUpperCase();
    const progMatch = regNum.match(PROG_CODE_REGEX);
    let program = 'VIT Bhopal Student';
    let isBim = false;
    let isIntegrated = false;
    if (progMatch) {
      const code = progMatch[1];
      if (code === 'MCA') {
        program = 'Master of Computer Applications';
      } else if (code === 'BBA') {
        program = 'Bachelor of Business Administration';
      } else {
        const typeChar = code.charAt(0);
        const branchPart = code.slice(1);
        const branchName = BRANCH_MAP[branchPart] || `Computer Science & Engineering (${branchPart})`;
        
        if (typeChar === 'B') {
          program = `B.Tech ${branchName}`;
        } else if (typeChar === 'M') {
          program = `Integrated M.Tech ${branchName}`;
          isIntegrated = true;
        } else {
          program = `B.Tech/M.Tech (${code}) Student`;
        }
        
        if (branchPart === 'IM' || code === 'BIM' || code === 'MIM') {
          isBim = true;
        }
      }
    }
    return { regNum, program, isBim, isIntegrated };
  }
  return null;
};

/* ═══════════════════════════════════════════════════════════════
   AURORA BACKGROUND — Animated gradient mesh blobs (pure CSS)
   ═══════════════════════════════════════════════════════════════ */
const AuroraBackground = () => (
  <div className="aurora-bg" aria-hidden="true">
    <div className="aurora-blob aurora-blob-1" />
    <div className="aurora-blob aurora-blob-2" />
    <div className="aurora-blob aurora-blob-3" />
    <div className="aurora-blob aurora-blob-4" />
    <div className="aurora-grain" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PARTICLE CONSTELLATION — Canvas2D interactive particle system
   ═══════════════════════════════════════════════════════════════ */
const ParticleField = ({ theme }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio, 2);

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const isMobile = width < 769;
    const count = isMobile ? 45 : 130;
    const connDist = isMobile ? 80 : 130;
    const mouseRadius = 160;

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 1.6 + 0.5,
      baseOpacity: Math.random() * 0.4 + 0.15,
      pulse: Math.random() * Math.PI * 2
    }));

    const onMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const onMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', resize);

    let rafId;
    let time = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, width, height);
      time += 0.01;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const isLight = themeRef.current === 'light';
      const pRGB = isLight ? '30, 41, 59' : '255, 255, 255';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRadius && dist > 0) {
          const force = (mouseRadius - dist) / mouseRadius;
          p.vx += (dx / dist) * force * 0.1;
          p.vy += (dy / dist) * force * 0.1;
        }

        p.vx *= 0.988;
        p.vy *= 0.988;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap edges
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Pulsing opacity
        const opacity = p.baseOpacity + Math.sin(time + p.pulse) * 0.08;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pRGB}, ${opacity})`;
        ctx.fill();

        // Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const cdx = p.x - p2.x;
          const cdy = p.y - p2.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cdist < connDist) {
            const alpha = (1 - cdist / connDist) * 0.1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${pRGB}, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="aurora-particles" />;
};

/* ═══════════════════════════════════════════════════════════════
   FLOATING INPUT — Premium input with autocomplete & security
   ═══════════════════════════════════════════════════════════════ */
const FloatingInput = ({ label, type = 'text', value, onChange, required, id, autoComplete, children, ...rest }) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const active = focused || (value && value.length > 0);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`floating-field ${active ? 'active' : ''} ${focused ? 'focused' : ''} ${type === 'password' ? 'password-field' : ''}`}>
      <input
        id={id}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={autoComplete}
        className="floating-input"
        placeholder=" "
        {...rest}
      />
      <label htmlFor={id} className="floating-label">{label}</label>
      <div className="floating-bar" />
      {type === 'password' && (
        <button
          type="button"
          className="aurora-password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={0}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
              <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      )}
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   AUTH COMPONENT — Aurora Gateway Login Page
   ═══════════════════════════════════════════════════════════════ */
const Auth = ({ onLoginSuccess, theme, setTheme, onShowFeedback }) => {
  // ── Authentication State ──
  const [authState, setAuthState] = useState(() => {
    return sessionStorage.getItem('authState') || 'login';
  });
  const [signupStep, setSignupStep] = useState(1);
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
  const [consentChecked, setConsentChecked] = useState(false);
  const [devCode, setDevCode] = useState('');

  // ── Refs for animation & interaction ──
  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const tiltRef = useRef({ cx: 0, cy: 0, tx: 0, ty: 0 });
  const googleInitializedRef = useRef(false);

  // ── Secure Field Cleaning Helper ──
  const clearSensitiveFields = useCallback(() => {
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCode('');
  }, []);

  // Clear credentials when component unmounts for security
  useEffect(() => {
    return () => {
      clearSensitiveFields();
    };
  }, [clearSensitiveFields]);

  // ── Session persistence ──
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

  // ── GSAP Entrance Animation ──
  useEffect(() => {
    if (!pageRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.aurora-blob',
        { scale: 0.3, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.8, stagger: 0.2 }
      )
      .fromTo('.aurora-card',
        { y: 60, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'back.out(1.4)' },
        '-=1.0'
      )
      .fromTo('.aurora-theme-toggle',
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.5 },
        '-=0.4'
      );
    }, pageRef);
    return () => ctx.revert();
  }, []);

  // ── Magnetic Card Tilt ──
  useEffect(() => {
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = tiltRef.current;
      t.cx += (t.tx - t.cx) * 0.07;
      t.cy += (t.ty - t.cy) * 0.07;
      if (cardRef.current && (Math.abs(t.cx) > 0.01 || Math.abs(t.cy) > 0.01)) {
        cardRef.current.style.transform =
          `perspective(1200px) rotateX(${t.cx.toFixed(3)}deg) rotateY(${t.cy.toFixed(3)}deg)`;
      }
    };
    animate();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCardMouseMove = useCallback((e) => {
    if (!cardRef.current || window.innerWidth < 769) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    tiltRef.current.tx = -(y - rect.height / 2) / rect.height * 8;
    tiltRef.current.ty = (x - rect.width / 2) / rect.width * 8;
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    tiltRef.current.tx = 0;
    tiltRef.current.ty = 0;
  }, []);

  // ── Cursor Glow ──
  const handlePageMouseMove = useCallback((e) => {
    if (pageRef.current) {
      pageRef.current.style.setProperty('--cursor-x', `${e.clientX}px`);
      pageRef.current.style.setProperty('--cursor-y', `${e.clientY}px`);
    }
  }, []);

  // ── Local Validation Speed: Memoized Registration & Program Extraction ──
  const parsedProgram = useMemo(() => {
    if (isVitBhopal && email) {
      return getRegNumberAndProgram(email);
    }
    return null;
  }, [isVitBhopal, email]);

  const validateEmail = useCallback((emailStr) => {
    const cleanEmail = emailStr.trim().toLowerCase();
    if (isVitBhopal) {
      return VIT_EMAIL_REGEX.test(cleanEmail);
    } else {
      return GENERAL_EMAIL_REGEX.test(cleanEmail);
    }
  }, [isVitBhopal]);

  // ── Clean JWT Token & Login Success Handler ──
  const handleLoginSuccess = useCallback((token, user) => {
    if (!user?.isGuest && !isValidJWT(token)) {
      setError('Authentication security error: Invalid or expired token received.');
      return;
    }

    sessionStorage.removeItem('authEmail');
    sessionStorage.removeItem('authState');
    clearSensitiveFields();

    if (onLoginSuccess) {
      onLoginSuccess(token, user);
    }
  }, [onLoginSuccess, clearSensitiveFields]);

  // ── Google Authentication Handler ──
  const handleGoogleLoginResponse = useCallback(async (googleResponse) => {
    const idToken = googleResponse.credential;
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Google authentication failed.');
      }

      handleLoginSuccess(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [handleLoginSuccess]);

  // ── Custom Google Login Trigger (Fallback & Custom Button) ──
  const handleCustomGoogleLogin = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchGoogleConfig();
      if (!data?.googleClientId) throw new Error('Google Sign-In is not configured.');
      
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google SDK is blocked or not loaded. Please disable your adblocker.');
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: data.googleClientId,
        scope: 'email profile',
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const response = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: tokenResponse.access_token })
              });

              const resData = await response.json();
              if (!response.ok) {
                throw new Error(resData.error || 'Google authentication failed.');
              }
              handleLoginSuccess(resData.token, resData.user);
            } catch (err) {
              setError(err.message);
              setLoading(false);
            }
          } else {
             setLoading(false);
          }
        },
        error_callback: (err) => {
          console.error(err);
          setError('Google authentication was cancelled or failed.');
          setLoading(false);
        }
      });
      client.requestAccessToken();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [handleLoginSuccess]);

  // ── Instant Google One-Tap & Sign-In SDK Initialization ──
  useEffect(() => {
    let isMounted = true;

    const initGoogleSDK = async () => {
      // Start fetching config in parallel with waiting for SDK load
      const configPromise = fetchGoogleConfig();

      // Check if window.google accounts SDK is available, poll briefly if async script is still loading
      if (!window.google?.accounts?.id) {
        let retries = 0;
        while (!window.google?.accounts?.id && retries < 20) {
          await new Promise(res => setTimeout(res, 100));
          retries++;
          if (!isMounted) return;
        }
      }

      if (!window.google?.accounts?.id || !isMounted) return;

      const data = await configPromise;
      if (!data?.googleClientId || !isMounted) return;

      try {
        window.google.accounts.id.initialize({
          client_id: data.googleClientId,
          callback: handleGoogleLoginResponse,
          hosted_domain: 'vitbhopal.ac.in',
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        });

        // Trigger Instant Google One-Tap Prompt (Desktop side-popup)
        window.google.accounts.id.prompt((notification) => {
          if (IS_DEV && notification.isNotDisplayed()) {
            console.log('[Google One-Tap] Prompt not displayed:', notification.getNotDisplayedReason());
          }
        });

        // Render Google Sign-In button dynamically into DOM containers with dark/light theme match
        const isDark = theme !== 'light';
        const buttonConfig = {
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          width: 320,
          shape: 'rectangular',
          logo_alignment: 'left'
        };

        const loginBtn = document.getElementById('google-signin-login');
        if (loginBtn) {
          loginBtn.innerHTML = '';
          window.google.accounts.id.renderButton(loginBtn, {
            ...buttonConfig,
            text: 'signin_with'
          });
        }

        const signupBtn = document.getElementById('google-signin-signup');
        if (signupBtn) {
          signupBtn.innerHTML = '';
          window.google.accounts.id.renderButton(signupBtn, {
            ...buttonConfig,
            text: 'signup_with'
          });
        }
      } catch (err) {
        console.error('Google One-Tap initialization error:', err);
      }
    };

    initGoogleSDK();

    return () => {
      isMounted = false;
    };
  }, [authState, signupStep, theme, handleGoogleLoginResponse]);

  // ── Course selector state ──
  const handleCourseChange = (courseCode) => {
    if (selectedCourses.includes(courseCode)) {
      setSelectedCourses(selectedCourses.filter(c => c !== courseCode));
    } else {
      setSelectedCourses([...selectedCourses, courseCode]);
    }
  };

  const handleGuestContinue = () => {
    let guestId = localStorage.getItem('ds_guest_id');
    if (!guestId) {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        guestId = 'guest_' + crypto.randomUUID();
      } else {
        const rndArr = new Uint8Array(8);
        if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(rndArr);
        guestId = 'guest_' + Date.now() + '_' + Array.from(rndArr, b => b.toString(36)).join('');
      }
      localStorage.setItem('ds_guest_id', guestId);
    }

    const guestUser = {
      id: guestId,
      name: 'Guest',
      email: guestId + '@guest.local',
      isGuest: true,
      isVitBhopal: false,
      semester: 1,
      xpPoints: 0,
      skillsProgress: {},
      timetable: JSON.parse(localStorage.getItem('ds_guest_timetable') || '[]'),
      role: 'guest',
      verified: true,
    };

    if (onLoginSuccess) {
      onLoginSuccess(null, guestUser);
    }
  };

  // ── Form Submissions ──
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const isSignUp = authState === 'signup';

    if (isSignUp && signupStep === 1) {
      if (!name || !email || !password) {
        setError('Please fill in all required fields.');
        return;
      }
      if (!validateEmail(email)) {
        if (isVitBhopal) {
          setError('Email must follow the pattern: firstname.registrationnumber@vitbhopal.ac.in (e.g., aditya.22bce10001@vitbhopal.ac.in)');
        } else {
          setError('Please enter a valid email address.');
        }
        return;
      }
      if (!isStrongPassword(password)) {
        setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
        return;
      }
      setSignupStep(2);
      return;
    }

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (isSignUp && !consentChecked) {
      setError('You must agree to the Terms & Conditions and Privacy Policy to register.');
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

    if (isSignUp && !isStrongPassword(password)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (!isSignUp && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    let targetEmail = email.trim().toLowerCase();
    if (targetEmail.endsWith('@vitbhopal')) {
      targetEmail += '.ac.in';
    }

    const url = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = !isSignUp 
      ? { email: targetEmail, password }
      : { 
          name: name.trim(), 
          email: targetEmail, 
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
          setDevCode(data.devCode || '');
          clearSensitiveFields();
          return;
        }
        throw new Error(data.error || 'Authentication failed.');
      }

      if (isSignUp) {
        if (data.verified) {
          setAuthState('login');
          setSuccessMessage(data.message || 'Registration successful! Please sign in.');
          setDevCode('');
          clearSensitiveFields();
        } else {
          setEmail(data.email || email);
          setAuthState('verify');
          setSuccessMessage(data.message || 'Verification code sent to your email.');
          setCooldown(60);
          setDevCode(data.devCode || '');
          clearSensitiveFields();
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
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() })
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
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code.');
      }

      setSuccessMessage('A new verification code has been sent.');
      setDevCode(data.devCode || '');
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
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reset code.');
      }

      setSuccessMessage(data.message || 'If an account exists, a reset code has been sent.');
      setDevCode(data.devCode || '');
      setAuthState('reset');
      setCooldown(60);
      clearSensitiveFields();
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

    if (!isStrongPassword(newPassword)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }

      setAuthState('login');
      setSuccessMessage(data.message || 'Password reset successful. You can now sign in.');
      clearSensitiveFields();
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
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend reset code.');
      }

      setSuccessMessage('A new reset code has been sent.');
      setDevCode(data.devCode || '');
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     FORM RENDERER
     ═══════════════════════════════════════════════════════════════ */
  const renderForm = () => {
    switch (authState) {
      case 'verify':
        return (
          <form onSubmit={handleVerifySubmit} className="aurora-form">
            {error && <div className="aurora-error-banner"><span>⚠️</span> {error}</div>}
            {successMessage && <div className="aurora-success-banner"><span>✅</span> {successMessage}</div>}
            {devCode && IS_DEV && (
              <div className="aurora-success-banner" style={{ border: '1px solid hsla(var(--primary) / 0.3)', background: 'hsla(var(--primary) / 0.08)', color: 'hsl(var(--primary))' }}>
                <span>🔧</span>
                <span><strong>[Development Mode]</strong> Since SMTP is down or unconfigured, use this code: <strong>{devCode}</strong></span>
              </div>
            )}

            <FloatingInput
              id="verify-code"
              label="6-Digit Code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              autoComplete="one-time-code"
              required
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontWeight: 700, fontSize: '1.2rem' }}
            />

            <button type="submit" className="aurora-submit-btn" disabled={loading}>
              {loading ? <span className="aurora-spinner" /> : 'Verify Email'}
            </button>

            <div className="aurora-extra-actions">
              <button type="button" className="aurora-link-btn" onClick={handleResendCode} disabled={loading || cooldown > 0}>
                {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
              </button>
              <span className="aurora-dot-sep">·</span>
              <button type="button" className="aurora-link-btn" onClick={() => { setAuthState('login'); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}>
                Back to Sign In
              </button>
            </div>
          </form>
        );

      case 'forgot':
        return (
          <form onSubmit={handleForgotPasswordSubmit} className="aurora-form">
            {error && <div className="aurora-error-banner"><span>⚠️</span> {error}</div>}
            {successMessage && <div className="aurora-success-banner"><span>✅</span> {successMessage}</div>}

            <FloatingInput
              id="forgot-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />

            <button type="submit" className="aurora-submit-btn" disabled={loading}>
              {loading ? <span className="aurora-spinner" /> : 'Send Reset Code'}
            </button>

            <div className="aurora-extra-actions" style={{ justifyContent: 'center' }}>
              <button type="button" className="aurora-link-btn" onClick={() => { setAuthState('login'); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}>
                ← Back to Sign In
              </button>
            </div>
          </form>
        );

      case 'reset':
        return (
          <form onSubmit={handleResetPasswordSubmit} className="aurora-form">
            {error && <div className="aurora-error-banner"><span>⚠️</span> {error}</div>}
            {successMessage && <div className="aurora-success-banner"><span>✅</span> {successMessage}</div>}
            {devCode && IS_DEV && (
              <div className="aurora-success-banner" style={{ border: '1px solid hsla(var(--primary) / 0.3)', background: 'hsla(var(--primary) / 0.08)', color: 'hsl(var(--primary))' }}>
                <span>🔧</span>
                <span><strong>[Development Mode]</strong> Since SMTP is down or unconfigured, use this code: <strong>{devCode}</strong></span>
              </div>
            )}

            <FloatingInput
              id="reset-code"
              label="Reset Code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              autoComplete="one-time-code"
              required
              style={{ textAlign: 'center', letterSpacing: '0.5em', fontWeight: 700, fontSize: '1.2rem' }}
            />

            <FloatingInput id="new-pass" label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
            <p className="aurora-form-hint">Min 8 chars · uppercase · lowercase · digit · symbol (@$!%*?&)</p>

            <FloatingInput id="confirm-pass" label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />

            <button type="submit" className="aurora-submit-btn" disabled={loading}>
              {loading ? <span className="aurora-spinner" /> : 'Reset Password'}
            </button>

            <div className="aurora-extra-actions">
              <button type="button" className="aurora-link-btn" onClick={handleResendResetCode} disabled={loading || cooldown > 0}>
                {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend Code'}
              </button>
              <span className="aurora-dot-sep">·</span>
              <button type="button" className="aurora-link-btn" onClick={() => { setAuthState('login'); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}>
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
          <form onSubmit={handleAuthSubmit} className="aurora-form">
            {error && <div className="aurora-error-banner"><span>⚠️</span> {error}</div>}
            {successMessage && <div className="aurora-success-banner"><span>✅</span> {successMessage}</div>}

            {isSignUp ? (
              signupStep === 1 ? (
                <>
                  <FloatingInput id="signup-name" label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  <FloatingInput id="signup-email" label={isVitBhopal ? 'VIT Bhopal Email' : 'Email Address'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                  <FloatingInput id="signup-password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
                  <p className="aurora-form-hint">Min 8 chars · uppercase · lowercase · digit · symbol (@$!%*?&)</p>

                  <div className="aurora-checkbox-row">
                    <input type="checkbox" id="vit-check" checked={isVitBhopal} onChange={(e) => { setIsVitBhopal(e.target.checked); setError(''); }} />
                    <label htmlFor="vit-check">I am a VIT Bhopal student</label>
                  </div>

                  <button type="submit" className="aurora-submit-btn">
                    Continue
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </button>

                  <div className="aurora-divider" style={{ margin: '0.75rem 0' }}><span>or</span></div>
                  
                  <button type="button" className="aurora-google-btn" onClick={handleCustomGoogleLogin} disabled={loading}>
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                    Continue with Google
                  </button>
                </>
              ) : (
                <>
                  {/* Step progress */}
                  <div className="aurora-steps">
                    <div className="aurora-step done">✓</div>
                    <div className="aurora-step-line" />
                    <div className="aurora-step current">2</div>
                  </div>

                  {/* Detected program */}
                  {isVitBhopal && email && parsedProgram && (
                    <div className="aurora-program-badge">
                      <span>✅ <strong>{parsedProgram.regNum}</strong></span>
                      <span>🎓 {parsedProgram.program}</span>
                    </div>
                  )}

                  {/* Semester select */}
                  <div className="floating-field active">
                    <select
                      id="signup-semester"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      required
                      aria-label="Current Semester"
                      className="aurora-select"
                    >
                      {isVitBhopal ? (
                        (() => {
                          const maxSem = (parsedProgram && (parsedProgram.isIntegrated || parsedProgram.isBim)) ? 10 : 8;
                          const options = [];
                          for (let i = 1; i <= maxSem; i++) {
                            options.push(<option key={i} value={i.toString()}>Semester {i}</option>);
                          }
                          return options;
                        })()
                      ) : (
                        <>
                          <option value="0">Not a Student / Professional</option>
                          {[1,2,3,4,5,6,7,8].map(i => (
                            <option key={i} value={i.toString()}>Semester {i}</option>
                          ))}
                        </>
                      )}
                    </select>
                    <label htmlFor="signup-semester" className="floating-label">Current Semester</label>
                  </div>

                  {/* Course selector */}
                  {isVitBhopal && (
                    <div className="aurora-course-panel">
                      <div className="aurora-course-title">Active Courses</div>
                      <div className="aurora-course-grid">
                        {COURSES_LIST.map((course) => (
                          <div key={course.code} className="aurora-checkbox-row compact">
                            <input
                              type="checkbox"
                              id={`course-${course.code}`}
                              checked={selectedCourses.includes(course.code)}
                              onChange={() => handleCourseChange(course.code)}
                            />
                            <label htmlFor={`course-${course.code}`}>
                              <strong>{course.code}</strong> — {course.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Consent */}
                  <div className="aurora-checkbox-row consent">
                    <input type="checkbox" id="consent-check" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} required />
                    <label htmlFor="consent-check">
                      I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms</a> & <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    </label>
                  </div>

                  <div className="aurora-btn-row">
                    <button type="button" className="aurora-back-btn" onClick={() => setSignupStep(1)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                      Back
                    </button>
                    <button type="submit" className="aurora-submit-btn" disabled={loading}>
                      {loading ? <span className="aurora-spinner" /> : 'Create Account'}
                    </button>
                  </div>
                </>
              )
            ) : (
              /* ── SIGN IN ── */
              <>
                <FloatingInput id="login-email" label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

                <FloatingInput id="login-password" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

                <div className="aurora-forgot-container">
                  <button
                    type="button"
                    className="aurora-forgot-link-standalone"
                    onClick={() => { setAuthState('forgot'); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="aurora-submit-btn" disabled={loading}>
                  {loading ? <span className="aurora-spinner" /> : 'Sign In'}
                </button>

                <div className="aurora-divider"><span>or</span></div>

                <button type="button" className="aurora-google-btn" onClick={handleCustomGoogleLogin} disabled={loading} style={{ marginBottom: '0.75rem' }}>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continue with Google
                </button>

                <button type="button" className="aurora-guest-btn" onClick={handleGuestContinue} disabled={loading}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Continue as Guest
                </button>
                <p className="aurora-guest-hint">Browse without an account. Progress won&apos;t sync to the cloud.</p>
              </>
            )}
          </form>
        );
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER — Full-Viewport Aurora Gateway Experience
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="aurora-page" ref={pageRef} onMouseMove={handlePageMouseMove}>
      {/* ── Immersive Background Layers ── */}
      <AuroraBackground />
      <ParticleField theme={theme} />
      <div className="aurora-cursor-glow" />

      {/* ── Theme Toggle ── */}
      {setTheme && (
        <button
          className="aurora-theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label="Toggle theme"
        >
          <span className="aurora-toggle-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          <span className="aurora-toggle-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      )}

      {/* ── Centered Glass Card ── */}
      <div className="aurora-card-container">
        <div
          ref={cardRef}
          className="aurora-card"
          onMouseMove={handleCardMouseMove}
          onMouseLeave={handleCardMouseLeave}
        >
          {/* Holographic shimmer overlay */}
          <div className="aurora-card-shimmer" />

          {/* Brand */}
          <div className="aurora-brand">
            <div className="aurora-brand-logo">
              <span className="aurora-brand-vit">VIT</span>
              <TypewriterText
                words={isVitBhopal ? ['LIFE', 'BHOPAL'] : ['BHOPAL']}
                className="aurora-brand-typewriter"
              />
            </div>
            <div className="aurora-brand-sub">Your Campus · Your Journey · One Platform</div>
          </div>

          {/* SMTP Down Notice */}
          {smtpDown && (
            <motion.div
              className="aurora-maintenance"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="aurora-maintenance-icon">🔧</span>
              <div>
                <strong>Maintenance Notice</strong>
                <p>New registrations and password resets are temporarily unavailable. Existing users can still sign in.</p>
              </div>
            </motion.div>
          )}

          {/* Tab Switcher */}
          {(authState === 'login' || authState === 'signup') && (
            <div className="aurora-tabs">
              <div
                className="aurora-tab-pill"
                style={{ transform: `translateX(${authState === 'signup' ? '100%' : '0'})` }}
              />
              <button
                className={`aurora-tab ${authState === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthState('login'); setSignupStep(1); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}
                style={{ background: 'transparent', boxShadow: 'none' }}
              >
                Sign In
              </button>
              <button
                className={`aurora-tab ${authState === 'signup' ? 'active' : ''}`}
                onClick={() => { setAuthState('signup'); setSignupStep(1); clearSensitiveFields(); setError(''); setSuccessMessage(''); }}
                style={{ background: 'transparent', boxShadow: 'none' }}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Section title for verify/forgot/reset */}
          {(authState === 'verify' || authState === 'forgot' || authState === 'reset') && (
            <motion.div
              className="aurora-section-title"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              {authState === 'verify' && '✉️ Verify Your Email'}
              {authState === 'forgot' && '🔐 Reset Password'}
              {authState === 'reset' && '🔑 New Password'}
            </motion.div>
          )}

          {/* Animated Form Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={authState + '-' + signupStep}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderForm()}
            </motion.div>
          </AnimatePresence>
        </div>
        {onShowFeedback && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center', position: 'relative', zIndex: 10 }}>
            <button
              onClick={onShowFeedback}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'hsl(var(--text-muted))',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                textDecoration: 'underline',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'hsl(var(--primary))'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--text-muted))'}
            >
              💬 Facing issues or have suggestions? Give Feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
