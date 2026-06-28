import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import TypewriterText from './TypewriterText';


/* ═══════════════════════════════════════════════════════════════
   ANIMATED HERO PANEL — Staggered reveals + floating feature cards
   ═══════════════════════════════════════════════════════════════ */


import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   3D WEBGL INTERACTIVE GLOBE — Draggable wireframe planet with particle rings
   ═══════════════════════════════════════════════════════════════ */
const ThreeDScene = ({ theme, onHoverNode }) => {
  const containerRef = useRef(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, targetRotationX: 0.3, targetRotationY: 0.5, currentRotationX: 0.3, currentRotationY: 0.5 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Color definitions
    const primaryColor = theme === 'light' ? 0x2a1cb8 : 0x635bff;
    const secondaryColor = theme === 'light' ? 0x0b7285 : 0x2be0f5;

    // 1. Core Globe (Wireframe Sphere)
    const globeGeo = new THREE.SphereGeometry(6, 25, 25);
    const globeMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    group.add(globeMesh);

    // 2. Outer Latitudes/Longitudes Rings (Slightly larger)
    const outerGeo = new THREE.IcosahedronGeometry(6.2, 2);
    const outerMat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // 3. Saturn-like Particle Ring
    const ringCount = 250;
    const ringGeo = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(ringCount * 3);
    for (let i = 0; i < ringCount * 3; i += 3) {
      const radius = 8.5 + Math.random() * 3.5;
      const angle = Math.random() * Math.PI * 2;
      ringPositions[i] = Math.cos(angle) * radius;
      ringPositions[i+1] = (Math.random() - 0.5) * 0.4;
      ringPositions[i+2] = Math.sin(angle) * radius;
    }
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringMat = new THREE.PointsMaterial({
      color: secondaryColor,
      size: 0.12,
      transparent: true,
      opacity: 0.7
    });
    const ringPoints = new THREE.Points(ringGeo, ringMat);
    group.add(ringPoints);

    // 4. Interactive Portal Location Nodes
    const nodesData = [
      { id: 'events', label: '📅 Events Portal', pos: new THREE.Vector3(4.2, 3.2, 3.2) },
      { id: 'timetable', label: '⏰ Timetable Sync', pos: new THREE.Vector3(-4.2, -2.2, 4.2) },
      { id: 'opps', label: '🚀 Opportunities Hub', pos: new THREE.Vector3(2.2, -4.2, -3.2) },
      { id: 'campus', label: '🏫 Campus Life Guide', pos: new THREE.Vector3(-3.2, 4.2, -3.2) }
    ];

    const nodeMeshes = [];
    nodesData.forEach(data => {
      const geo = new THREE.SphereGeometry(0.35, 16, 16);
      const mat = new THREE.MeshBasicMaterial({
        color: secondaryColor,
        transparent: true,
        opacity: 0.95
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(data.pos);
      mesh.userData = data;
      group.add(mesh);
      nodeMeshes.push(mesh);
    });

    // 5. Deep Space Galaxy Background Stars (Fixed in background)
    const starsCount = 1200;
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starsPos[i] = (Math.random() - 0.5) * 160;
      starsPos[i+1] = (Math.random() - 0.5) * 160;
      starsPos[i+2] = (Math.random() - 0.5) * 160;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.5
    });
    const backgroundStars = new THREE.Points(starsGeo, starsMat);
    scene.add(backgroundStars);

    // 6. Orbiting Satellite Planets Setup
    const satellite1 = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 1),
      new THREE.MeshBasicMaterial({ color: 0xff007f, wireframe: true, transparent: true, opacity: 0.7 })
    );
    group.add(satellite1);

    const satellite2 = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.5),
      new THREE.MeshBasicMaterial({ color: 0x9d4edd, wireframe: true, transparent: true, opacity: 0.6 })
    );
    group.add(satellite2);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Drag to spin logic
    const handleMouseDown = (e) => {
      dragRef.current.isDragging = true;
      dragRef.current.startX = e.clientX;
      dragRef.current.startY = e.clientY;
    };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      if (dragRef.current.isDragging) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;
        
        dragRef.current.targetRotationY += deltaX * 0.007;
        dragRef.current.targetRotationX += deltaY * 0.007;
        
        dragRef.current.startX = e.clientX;
        dragRef.current.startY = e.clientY;
      }
      
      // Calculate normalized mouse coordinates for light parallax
      pointerRef.current.x = (clientX / rect.width) * 2 - 1;
      pointerRef.current.y = -(clientY / rect.height) * 2 + 1;

      mouse.x = pointerRef.current.x;
      mouse.y = pointerRef.current.y;
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    let reqId;
    const animate = () => {
      reqId = requestAnimationFrame(animate);

      // Idle rotations (slower if user is dragging)
      const rotationSpeedFactor = dragRef.current.isDragging ? 0.1 : 1.0;
      globeMesh.rotation.y += 0.001 * rotationSpeedFactor;
      outerMesh.rotation.y -= 0.0005 * rotationSpeedFactor;
      ringPoints.rotation.y += 0.0015 * rotationSpeedFactor;

      // Orbit paths animation
      const clockTime = Date.now();
      
      const angle1 = clockTime * 0.0008;
      satellite1.position.x = Math.cos(angle1) * 10.5;
      satellite1.position.z = Math.sin(angle1) * 10.5;
      satellite1.position.y = Math.sin(angle1) * 10.5 * Math.sin(0.3);
      satellite1.rotation.y += 0.01;

      const angle2 = clockTime * 0.0005;
      satellite2.position.x = Math.cos(angle2) * 14.5;
      satellite2.position.z = Math.sin(angle2) * 14.5;
      satellite2.position.y = Math.sin(angle2) * 14.5 * Math.sin(-0.4);
      satellite2.rotation.x += 0.008;

      // Background stars slow rotation for stellar parallax
      backgroundStars.rotation.y += 0.0002;

      // Lerping rotation values
      dragRef.current.currentRotationX += (dragRef.current.targetRotationX - dragRef.current.currentRotationX) * 0.08;
      dragRef.current.currentRotationY += (dragRef.current.targetRotationY - dragRef.current.currentRotationY) * 0.08;
      
      group.rotation.x = dragRef.current.currentRotationX;
      group.rotation.y = dragRef.current.currentRotationY;

      // Subtle parallax response to mouse cursor coordinates
      group.position.x += (pointerRef.current.x * 0.5 - group.position.x) * 0.05;
      group.position.y += (pointerRef.current.y * 0.5 - group.position.y) * 0.05;

      // Raycast intersections for nodes
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hitObject = intersects[0].object;
        hitObject.scale.set(1.4, 1.4, 1.4);
        hitObject.material.color.setHex(0xff007f); // highlight color

        // Convert 3D position to 2D screen coordinate for tooltip
        const tempV = new THREE.Vector3();
        hitObject.getWorldPosition(tempV);
        tempV.project(camera);

        const screenX = ((tempV.x + 1) / 2) * width;
        const screenY = (-(tempV.y - 1) / 2) * height;

        onHoverNode({
          label: hitObject.userData.label,
          x: screenX,
          y: screenY
        });
      } else {
        nodeMeshes.forEach(mesh => {
          mesh.scale.set(1, 1, 1);
          mesh.material.color.setHex(secondaryColor);
        });
        onHoverNode(null);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(reqId);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [theme, onHoverNode]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 2, cursor: 'grab' }} />;
};

const AnimatedHeroPanel = ({ theme }) => {
  const [activeNode, setActiveNode] = useState(null);

  return (
    <div className="auth-hero-panel">
      {/* 3D Draggable Globe WebGL canvas */}
      <ThreeDScene theme={theme} onHoverNode={setActiveNode} />
      
      {/* Dynamic Hover Tooltip on 3D Globe Nodes */}
      {activeNode && (
        <div 
          className="auth-globe-node-tooltip"
          style={{
            position: 'absolute',
            left: `${activeNode.x}px`,
            top: `${activeNode.y - 45}px`,
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {activeNode.label}
        </div>
      )}
      
      <div className="auth-floating-orb auth-orb-1" />
      <div className="auth-floating-orb auth-orb-2" />
      <div className="auth-floating-orb auth-orb-3" />
      <div className="auth-hero-grid" />
      <div className="auth-hero-cyber-overlay" />

      <div className="auth-hero-content" style={{ pointerEvents: 'none' }}>
        {/* Horizontal minimalist brand logo display */}
        <div className="auth-hero-brand-new">
          <span className="brand-bold">VIT</span>
          <span className="brand-divider">|</span>
          <span className="brand-thin">LIFE</span>
        </div>

        {/* Tagline with line reveal */}
        <motion.p
          className="auth-hero-tagline-new"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        >
          Your Campus. Your Journey. One Platform.
        </motion.p>
        
        <p className="auth-hero-hint-new">
          Drag to rotate globe. Hover locations to explore.
        </p>
      </div>
    </div>
  );
};

const COURSES_LIST = [
  { code: 'DSA', name: 'Data Structures & Algorithms' },
  { code: 'DBMS', name: 'Database Management Systems' },
  { code: 'OOP', name: 'Object-Oriented Programming' },
  { code: 'Numerical Methods', name: 'Numerical Methods & Computational Math' }
];

const isStrongPassword = (password) => {
  if (typeof password !== 'string') return false;
  // Enforce strong password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

const getRegNumberAndProgram = (emailStr) => {
  const cleanEmail = emailStr.trim().toLowerCase();
  const regex = /^([a-zA-Z.-]+)\.([a-zA-Z0-9]+)@vitbhopal\.ac\.in$/;
  const match = cleanEmail.match(regex);
  if (match) {
    const regNum = match[2].toUpperCase();
    const progMatch = regNum.match(/^\d{2}([A-Z]{3})/);
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
        const branchMap = {
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
        const branchName = branchMap[branchPart] || `Computer Science & Engineering (${branchPart})`;
        
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

const Auth = ({ onLoginSuccess, theme }) => {
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

  const handleGuestContinue = () => {
    // Generate or reuse a persistent guest ID for this browser
    let guestId = localStorage.getItem('ds_guest_id');
    if (!guestId) {
      guestId = 'guest_' + crypto.randomUUID();
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

    // No token for guests — App.jsx handles isGuest separately
    if (onLoginSuccess) {
      onLoginSuccess(null, guestUser);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const isSignUp = authState === 'signup';

    // Multi-step signup interception
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

    if (!isStrongPassword(newPassword)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
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
                placeholder="Min 8 chars, mixed case, number & symbol" 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
              <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                Must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 digit, and 1 symbol (@$!%*?&).
              </small>
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

            {isSignUp ? (
              // ── SIGN UP CONDITIONAL STEPS ──
              signupStep === 1 ? (
                <>
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

                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      placeholder={isVitBhopal ? "firstname.regnumber@vitbhopal.ac.in" : "Enter your email"} 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      placeholder="Min 8 chars, mixed case, number & symbol" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                    <small style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.72rem', color: 'hsl(var(--text-muted))' }}>
                      Must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 digit, and 1 symbol (@$!%*?&).
                    </small>
                  </div>

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

                  <button type="submit" className="btn-primary auth-submit-btn" style={{ marginTop: '1rem' }}>
                    Continue
                  </button>
                </>
              ) : (
                <>
                  {isVitBhopal && email && (() => {
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
                    <label>Current Status / Semester</label>
                    <select 
                      value={semester} 
                      onChange={(e) => setSemester(e.target.value)} 
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'hsla(var(--text-primary) / 0.05)',
                        border: '1px solid hsla(var(--border-glass))',
                        color: 'hsl(var(--text-primary))',
                        outline: 'none'
                      }}
                    >
                      {isVitBhopal ? (
                        (() => {
                          const parsed = getRegNumberAndProgram(email);
                          const maxSem = (parsed && (parsed.isIntegrated || parsed.isBim)) ? 10 : 8;
                          const options = [];
                          for (let i = 1; i <= maxSem; i++) {
                            options.push(
                              <option key={i} value={i.toString()} style={{ backgroundColor: 'hsl(var(--bg-card))' }}>
                                Semester {i}
                              </option>
                            );
                          }
                          return options;
                        })()
                      ) : (
                        <>
                          <option value="0" style={{ backgroundColor: 'hsl(var(--bg-card))' }}>Not a Student / Professional</option>
                          {[1,2,3,4,5,6,7,8].map(i => (
                            <option key={i} value={i.toString()} style={{ backgroundColor: 'hsl(var(--bg-card))' }}>
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

                  <div className="form-group-checkbox" style={{ marginTop: '1.25rem', alignItems: 'flex-start' }}>
                    <input 
                      type="checkbox" 
                      id="consent-check" 
                      checked={consentChecked} 
                      onChange={(e) => setConsentChecked(e.target.checked)} 
                      required
                    />
                    <label htmlFor="consent-check" style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', lineHeight: '1.4' }}>
                      I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--secondary))', textDecoration: 'underline' }}>Terms & Conditions</a> and consent to data sharing/processing as per the <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(var(--secondary))', textDecoration: 'underline' }}>Privacy Policy</a>.
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ flex: 1, padding: '1rem' }}
                      onClick={() => setSignupStep(1)}
                    >
                      Back
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary auth-submit-btn" 
                      style={{ flex: 2 }}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Register'}
                    </button>
                  </div>
                </>
              )
            ) : (
              // ── SIGN IN DEFAULT RENDER ──
              <>
                <div className="form-group">
                  <label>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Password</label>
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
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>

                <div style={{ marginTop: '1.25rem', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '0.6rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: 0.85 }}
                    onClick={handleGuestContinue}
                    disabled={loading}
                  >
                    👤 Continue as Guest
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    Browse without an account. Progress won’t sync to the cloud.
                  </p>
                </div>

                <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
                  {loading ? 'Processing...' : 'Sign In'}
                </button>
              </>
            )}
          </form>
        );
      }
    }
  };

  // 3D Card Tilt States
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Spotlight Background Coordinates
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0 });
  const formPanelRef = useRef(null);

  const handleMouseMove = (e) => {
    // 1. Calculate spotlight position
    if (formPanelRef.current) {
      const rect = formPanelRef.current.getBoundingClientRect();
      setSpotlightPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    // 2. Calculate card tilt (only for desktop / hover state)
    const cardElement = e.currentTarget.querySelector('.auth-card');
    if (cardElement && window.innerWidth >= 769) {
      const rect = cardElement.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const mouseX = e.clientX - rect.left - width / 2;
      const mouseY = e.clientY - rect.top - height / 2;
      
      // Calculate rotation angles (max 12 degrees)
      const rX = -(mouseY / height) * 12;
      const rY = (mouseX / width) * 12;
      
      setTiltX(rX);
      setTiltY(rY);
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTiltX(0);
    setTiltY(0);
  };

  return (
    <div className="auth-wrapper">
      {/* ── Left Hero Panel (Desktop Only — hidden via CSS on mobile) ── */}
      <AnimatedHeroPanel theme={theme} />

      {/* ── Right Form Panel (With interactive spotlight background) ── */}
      <div 
        ref={formPanelRef}
        className="auth-form-panel"
        onMouseMove={handleMouseMove}
        style={{
          '--spotlight-x': `${spotlightPos.x}px`,
          '--spotlight-y': `${spotlightPos.y}px`
        }}
      >
        {/* Dynamic spot glow following cursor */}
        <div className="auth-spotlight-glow" />

        {/* 3D Tilt Card wrapper */}
        <div
          className="auth-card-tilt-container"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <motion.div
            className="glass-panel auth-card"
            style={{
              transform: isHovered && window.innerWidth >= 769
                ? `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.01, 1.01, 1.01)`
                : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
              transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Card inner glass reflection highlight */}
            <div className="auth-card-reflection" />

            <div className="auth-brand" style={{ transform: 'translateZ(30px)' }}>
              <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.1rem' }}>
                <span className="logo-gradient-text">VIT</span>
                <TypewriterText
                  words={isVitBhopal ? ['LIFE', 'BHOPAL'] : ['BHOPAL']}
                  className="auth-rotating-text"
                />
              </div>
              <div className="auth-subtitle">
                VIT Life - College Lifestyle & Management
              </div>
            </div>

            {smtpDown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  background: 'linear-gradient(135deg, hsla(35, 90%, 55%, 0.15), hsla(0, 80%, 55%, 0.12))',
                  border: '1px solid hsla(35, 90%, 55%, 0.4)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  transform: 'translateZ(10px)'
                }}
              >
                <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🔧</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'hsl(35, 90%, 60%)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    Maintenance Notice
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.4 }}>
                    New registrations and password resets are temporarily unavailable. Existing users can still sign in normally.
                  </div>
                </div>
              </motion.div>
            )}

            {(authState === 'login' || authState === 'signup') && (
              <div className="auth-tabs" style={{ transform: 'translateZ(20px)' }}>
                {/* Sliding active pill indicator background */}
                <div 
                  className="auth-tab-pill-bg" 
                  style={{
                    transform: `translateX(${authState === 'signup' ? '100%' : '0%'})`,
                    transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
                <button 
                  className={`auth-tab ${authState === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthState('login'); setSignupStep(1); setError(''); setSuccessMessage(''); }}
                  style={{ background: 'transparent', boxShadow: 'none' }}
                >
                  Sign In
                </button>
                <button 
                  className={`auth-tab ${authState === 'signup' ? 'active' : ''}`}
                  onClick={() => { setAuthState('signup'); setSignupStep(1); setError(''); setSuccessMessage(''); }}
                  style={{ background: 'transparent', boxShadow: 'none' }}
                >
                  Create Account
                </button>
              </div>
            )}

            {(authState === 'verify' || authState === 'forgot' || authState === 'reset') && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{
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
                  WebkitTextFillColor: 'transparent',
                  transform: 'translateZ(20px)'
                }}
              >
                {authState === 'verify' && 'Verify Your Email'}
                {authState === 'forgot' && 'Reset Password Request'}
                {authState === 'reset' && 'Set New Password'}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={authState}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ transform: 'translateZ(15px)' }}
              >
                {renderForm()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
