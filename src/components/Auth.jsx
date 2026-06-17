import React, { useState } from 'react';

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
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isVitBhopal, setIsVitBhopal] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Prototype: firstname.registrationnumber@vitbhopal.ac.in
      const regex = /^[a-zA-Z.-]+\.[a-zA-Z0-9]+@vitbhopal\.ac\.in$/;
      return regex.test(cleanEmail);
    } else {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(cleanEmail);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin && !validateEmail(email)) {
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
    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
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
        throw new Error(data.error || 'Authentication failed.');
      }

      // Success
      if (onLoginSuccess) {
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">
        <div className="auth-brand">
          <div className="auth-logo">VITHON</div>
          <div className="auth-subtitle">Computational & Data Science Hub</div>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-banner">⚠️ {error}</div>}

          {!isLogin && (
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
              placeholder={!isLogin && isVitBhopal ? "firstname.regnumber@vitbhopal.ac.in" : "Enter your email"} 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          {!isLogin && isVitBhopal && email && (() => {
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
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {!isLogin && (
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
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;
