import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useProfileSync } from './hooks/useTimetableSync';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import TypewriterText from './components/TypewriterText';
import Dock from './components/Dock';
import { motion, AnimatePresence } from 'motion/react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Roadmap = lazy(() => import('./components/Roadmap'));
const Opportunities = lazy(() => import('./components/Opportunities'));
const CampusLife = lazy(() => import('./components/CampusLife'));
const TimetablePage = lazy(() => import('./components/TimetablePage'));
const VITBhopalGuide = lazy(() => import('./components/VITBhopalGuide'));
const Auth = lazy(() => import('./components/Auth'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));


// Default Initial Skills Database
const INITIAL_SKILLS = [
  // LEVEL 1
  {
    id: "l1-la",
    level: 1,
    name: "Linear Algebra & Matrices",
    category: "Math Foundations",
    status: "To Do",
    description: "Vectors, matrix operations, eigenvalues, eigenvectors, and singular value decomposition (SVD). The core geometry behind ML representations.",
    resources: [
      { name: "MIT Gilbert Strang Lectures", link: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/" },
      { name: "3Blue1Brown Essence of Linear Algebra", link: "https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab" }
    ],
    assignment: "Implement SVD from scratch using Python's NumPy library and use it to compress an image."
  },
  {
    id: "l1-ps",
    level: 1,
    name: "Probability & Statistics",
    category: "Math Foundations",
    status: "To Do",
    description: "Probability distributions (Normal, Binomial, Poisson), Bayes theorem, hypothesis testing, confidence intervals, and t-tests.",
    resources: [
      { name: "StatQuest: Statistics Fundamentals", link: "https://youtube.com/playlist?list=PLblh5JKOoLUK0FLuzwntyYI10UQFUhsY9" },
      { name: "Harvard Stat 110 (Probability)", link: "https://online.harvard.edu/courses/introduction-probability" }
    ],
    assignment: "Conduct a t-test and calculate confidence intervals on a sample student grade dataset using scipy.stats."
  },
  {
    id: "l1-py",
    level: 1,
    name: "Python Core & Data Wrangling",
    category: "Programming",
    status: "To Do",
    description: "Mastering Python syntax, object-oriented concepts, and core libraries: NumPy, Pandas, Matplotlib, and Seaborn for data manipulation.",
    resources: [
      { name: "Kaggle Learn: Python & Pandas", link: "https://www.kaggle.com/learn" },
      { name: "Python for Data Analysis (Book Reference)", link: "https://wesmckinney.com/book/" }
    ],
    assignment: "Clean and explore the Titanic dataset on Kaggle: handle missing values, engineer 2 features, and plot correlations."
  },
  {
    id: "l1-dsa",
    level: 1,
    name: "Data Structures & Algorithms",
    category: "CSE Core",
    status: "To Do",
    description: "Linked lists, stacks, queues, trees, graphs, sorting, searching, and recursion. Matches VIT Bhopal course CSE2002.",
    resources: [
      { name: "Abdul Bari DSA Series", link: "https://www.youtube.com/user/abdulbari5400" },
      { name: "GeeksforGeeks DSA Self-Paced", link: "https://www.geeksforgeeks.org/data-structures/" }
    ],
    assignment: "Implement a Binary Search Tree (BST) and write recursive functions for In-order, Pre-order, and Post-order traversals."
  },

  // LEVEL 2
  {
    id: "l2-nm",
    level: 2,
    name: "Numerical Methods & SciPy",
    category: "Computational Math",
    status: "To Do",
    description: "Root-finding algorithms, numerical integration, Euler and Runge-Kutta methods for solving ODEs. Essential for engineering simulations.",
    resources: [
      { name: "Numerical Recipes in Python / C", link: "http://numerical.recipes/" },
      { name: "Coursera: Scientific Computing", link: "https://www.coursera.org/learn/scientific-computing" }
    ],
    assignment: "Write a Python script solving a 2D projectile motion simulation using Runge-Kutta 4th Order (RK4) method and plot the trajectory."
  },
  {
    id: "l2-sql",
    level: 2,
    name: "SQL & DBMS",
    category: "Databases",
    status: "To Do",
    description: "Relational database modeling, normalization, transaction ACID properties, and complex SQL joins, aggregations, and subqueries. Matches CSE3001.",
    resources: [
      { name: "SQLBolt: Interactive SQL Tutorials", link: "https://sqlbolt.com/" },
      { name: "Mode Analytics: SQL Tutorial", link: "https://mode.com/sql-tutorial/" }
    ],
    assignment: "Create a database schema for an e-commerce platform and write queries containing inner, left, and aggregate GROUP BY operations."
  },
  {
    id: "l2-ml",
    level: 2,
    name: "Classical Machine Learning",
    category: "AI Core",
    status: "To Do",
    description: "Supervised and unsupervised models: Linear/Logistic Regression, Support Vector Machines, Random Forests, K-Means Clustering, and PCA.",
    resources: [
      { name: "Andrew Ng ML Specialization", link: "https://www.coursera.org/specializations/machine-learning-introduction" },
      { name: "Scikit-Learn Official User Guide", link: "https://scikit-learn.org/stable/user_guide.html" }
    ],
    assignment: "Implement a Logistic Regression classification model from scratch using NumPy gradient descent and train it on Iris dataset."
  },
  {
    id: "l2-git",
    level: 2,
    name: "Git & Version Control",
    category: "Tools",
    status: "To Do",
    description: "Branching, merging, pulling, committing, pull requests, resolving merge conflicts, and structuring project repositories on GitHub.",
    resources: [
      { name: "GitHub Skills: Introduction to GitHub", link: "https://skills.github.com/" },
      { name: "Git Simple Guide", link: "https://rogerdudler.github.io/git-guide/" }
    ],
    assignment: "Create a GitHub repository, push code, make a secondary branch, edit code, commit, merge with main, resolving a mock conflict."
  },

  // LEVEL 3
  {
    id: "l3-dl",
    level: 3,
    name: "Neural Networks & PyTorch",
    category: "Deep Learning",
    status: "To Do",
    description: "Multi-Layer Perceptrons, backpropagation, SGD, Adam, activation functions, regularization, and implementing deep nets using PyTorch.",
    resources: [
      { name: "Andrej Karpathy Neural Networks: Zero to Hero", link: "https://karpathy.ai/zero-to-hero.html" },
      { name: "PyTorch Deep Learning Boot Camp", link: "https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html" }
    ],
    assignment: "Build and train a 3-layer Convolutional Neural Network (CNN) in PyTorch to classify CIFAR-10 images with >75% accuracy."
  },
  {
    id: "l3-cv",
    level: 3,
    name: "Computer Vision",
    category: "AI Specialization",
    status: "To Do",
    description: "Image classification, object detection (YOLO), semantic segmentation, and convolutional architectures (ResNet, EfficientNet).",
    resources: [
      { name: "Stanford CS231n: CNNs for Computer Vision", link: "http://cs231n.stanford.edu/" },
      { name: "Fast.ai: Practical Deep Learning for Coders", link: "https://course.fast.ai/" }
    ],
    assignment: "Use transfer learning with a pre-trained ResNet-50 in PyTorch to classify a custom dataset of medical images (e.g. skin lesions)."
  },
  {
    id: "l3-nlp",
    level: 3,
    name: "Natural Language Processing",
    category: "AI Specialization",
    status: "To Do",
    description: "Tokenization, word embeddings (Word2Vec, GloVe), Recurrent Neural Networks (RNNs), LSTMs, GRUs, and attention mechanisms.",
    resources: [
      { name: "Stanford CS224n: NLP with Deep Learning", link: "http://web.stanford.edu/class/cs224n/" },
      { name: "Hugging Face NLP Course", link: "https://huggingface.co/learn/nlp-course" }
    ],
    assignment: "Build a movie review sentiment classifier using pre-trained Word2Vec embeddings and a bi-directional LSTM in PyTorch."
  },
  {
    id: "l3-bd",
    level: 3,
    name: "HPC & Big Data Systems",
    category: "Computational Science",
    status: "To Do",
    description: "Parallel programming paradigms, MapReduce framework, Apache Spark, Hadoop, and writing distributed data processing jobs using PySpark.",
    resources: [
      { name: "Berkeley CS267: High Performance Computing", link: "https://sites.google.com/lbl.gov/cs267-spr2024" },
      { name: "Databricks Spark Tutorials", link: "https://www.databricks.com/learn/training/login" }
    ],
    assignment: "Write a PySpark script to run statistical aggregation and filtering on a 5GB CSV file containing historical sensor readings."
  },

  // LEVEL 4
  {
    id: "l4-gen",
    level: 4,
    name: "Generative AI & LLMs",
    category: "Cutting-Edge AI",
    status: "To Do",
    description: "Transformers (Self-Attention, Encoder-Decoder), BERT, GPT models, Prompt Engineering, RAG (Retrieval-Augmented Generation), and LangChain.",
    resources: [
      { name: "DeepLearning.AI: Generative AI with LLMs", link: "https://www.deeplearning.ai/courses/generative-ai-with-llms/" },
      { name: "Hugging Face Transformer Documentation", link: "https://huggingface.co/docs/transformers" }
    ],
    assignment: "Build a local chatbot that answers questions based on uploaded PDF files using LangChain, OpenAI API or local Ollama (Llama3), and ChromaDB."
  },
  {
    id: "l4-ops",
    level: 4,
    name: "MLOps & Deployment",
    category: "Engineering",
    status: "To Do",
    description: "FastAPI endpoints, containerization with Docker, CI/CD pipelines, MLflow tracking, and model monitoring in production environments.",
    resources: [
      { name: "Made With ML (Goku Mohandas)", link: "https://madewithml.com/" },
      { name: "MLOps Zoomcamp (DataTalksClub)", link: "https://github.com/DataTalksClub/mlops-zoomcamp" }
    ],
    assignment: "Create a FastAPI web API serving a scikit-learn model, containerize it using a Dockerfile, and push it to Docker Hub."
  },
  {
    id: "l4-sciml",
    level: 4,
    name: "Scientific ML & PINNs",
    category: "Computational Science",
    status: "To Do",
    description: "Physics-Informed Neural Networks (PINNs), solving partial differential equations using neural networks, and SciML software (Julia/Python SciML).",
    resources: [
      { name: "MIT 18.337J: Scientific Machine Learning", link: "https://github.com/mitmath/18337" },
      { name: "PINNs Tutorial (Maziar Raissi)", link: "https://github.com/maziarraissi/PINNs" }
    ],
    assignment: "Write a Physics-Informed Neural Network in PyTorch to solve the 1D Burger's Equation and plot the approximate solution."
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('ds_ai_token'));
  const [user, setUser] = useState(null);
  // Offline-first profile sync
  const { syncStatus: profileSyncStatus, saveProfileUpdate } = useProfileSync(token);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [xpPoints, setXpPoints] = useState(0);
  const [skills, setSkills] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [navHidden, setNavHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [showMobileProfileSheet, setShowMobileProfileSheet] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('ds_ai_theme') || 'dark');
  const [installPrompt, setInstallPrompt] = useState(null); // PWA install prompt
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'light') {
      root.classList.add('light-theme');
      body.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
      body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);

      // Direction: hide when scrolling down past 60px, reveal when scrolling up
      if (currentY <= 20) {
        setNavHidden(false);
      } else if (currentY > lastScrollY.current + 6 && currentY > 60) {
        setNavHidden(true);
      } else if (currentY < lastScrollY.current - 6) {
        setNavHidden(false);
      }
      lastScrollY.current = currentY;

      // Progress bar
      const el = document.querySelector('.main-content');
      if (el) {
        const scrollTop = el.scrollTop || currentY;
        const maxScroll = (el.scrollHeight || document.body.scrollHeight) - window.innerHeight;
        setScrollProgress(maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    const tagName = e.target.tagName.toLowerCase();
    if (
      tagName === 'input' || 
      tagName === 'textarea' || 
      tagName === 'select' || 
      tagName === 'button' || 
      e.target.closest('.course-grid') || 
      e.target.closest('.segmented-control') ||
      e.target.closest('.filter-sheet-categories') ||
      e.target.closest('.quick-list')
    ) {
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === 0 || touchStartY.current === 0) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 75) {
      const tabs = user 
        ? ['dashboard', 'opportunities', 'timetable', 'guide', 'campus'] 
        : ['dashboard', 'opportunities', 'guide'];

      const currentIndex = tabs.indexOf(activeTab);
      if (currentIndex !== -1) {
        if (diffX > 0 && currentIndex < tabs.length - 1) {
          handleTabClick(tabs[currentIndex + 1]);
        } else if (diffX < 0 && currentIndex > 0) {
          handleTabClick(tabs[currentIndex - 1]);
        }
      }
    }

    touchStartX.current = 0;
    touchStartY.current = 0;
  };



  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setShowMobileProfileSheet(false);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ds_ai_token');
    localStorage.removeItem('ds_ai_user');
    localStorage.removeItem('ds_guest_user');  // also clear guest session
    setToken(null);
    setUser(null);
    setSkills(INITIAL_SKILLS);
    setXpPoints(0);
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
  }, []);

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profile = await res.json();
        setUser(profile);
        setXpPoints(profile.xpPoints || 0);

        // Map skills with their progress stored on server
        const mappedSkills = INITIAL_SKILLS.map(skill => ({
          ...skill,
          status: profile.skillsProgress?.[skill.id] || 'To Do'
        }));
        setSkills(mappedSkills);
      } else {
        // Token invalid/expired
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to load user profile: ", err);
      // Offline fallback: try reading cached profile if exists
      const cachedUser = localStorage.getItem('ds_ai_user');
      if (cachedUser) {
        const profile = JSON.parse(cachedUser);
        setUser(profile);
        setXpPoints(profile.xpPoints || 0);
        const mappedSkills = INITIAL_SKILLS.map(skill => ({
          ...skill,
          status: profile.skillsProgress?.[skill.id] || 'To Do'
        }));
        setSkills(mappedSkills);
      }
    } finally {
      setLoading(false);
    }
  }, [token, handleLogout]);

  const fetchOpportunities = useCallback(async () => {
    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/opportunities', { headers });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setLastUpdated(data.lastUpdated || '');
      } else {
        console.error("Failed to fetch opportunities from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, [token]);

  const fetchClubs = useCallback(async () => {
    try {
      const res = await fetch('/api/clubs');
      if (res.ok) {
        const data = await res.json();
        setClubs(data.clubs || []);
      } else {
        console.error("Failed to fetch clubs from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      } else {
        console.error("Failed to fetch events from Express API");
      }
    } catch (error) {
      console.error("Error communicating with backend: ", error);
    }
  }, []);

  // Initialize and load user profile on token change or startup
  useEffect(() => {
    if (token) {
      Promise.resolve().then(() => {
        fetchUserProfile();
      });
    } else {
      Promise.resolve().then(() => {
        // Check for a saved guest session first
        const savedGuest = localStorage.getItem('ds_guest_user');
        if (savedGuest) {
          try {
            const guestUser = JSON.parse(savedGuest);
            setUser(guestUser);
          } catch {
            localStorage.removeItem('ds_guest_user');
          }
        } else {
          setSkills(INITIAL_SKILLS);
          setXpPoints(0);
          setUser(null);
        }
        setLoading(false);
      });
    }
  }, [token, fetchUserProfile]);

  // Load opportunities on token load
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchOpportunities();
      fetchClubs();
      fetchEvents();
    });
  }, [token, fetchOpportunities, fetchClubs, fetchEvents]);

  const handleLoginSuccess = (newToken, newUser) => {
    if (newUser?.isGuest) {
      // Guest: no token, persist guest user locally
      localStorage.setItem('ds_guest_user', JSON.stringify(newUser));
      setToken(null);
      setUser(newUser);
    } else {
      localStorage.setItem('ds_ai_token', newToken);
      localStorage.setItem('ds_ai_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    }
  };

  // Sync skill status changes to the Express server
  const handleUpdateSkillStatus = async (skillId, newStatus) => {
    const updated = skills.map(skill => {
      if (skill.id === skillId) {
        return { ...skill, status: newStatus };
      }
      return skill;
    });
    setSkills(updated);

    const newProgress = {};
    updated.forEach(s => {
      if (s.status !== 'To Do') {
        newProgress[s.id] = s.status;
      }
    });

    await saveProfileUpdate({ skillsProgress: newProgress }, user, setUser);
  };

  const handleUpdateSemester = async (newSemester) => {
    const semNum = parseInt(newSemester, 10) || 1;
    await saveProfileUpdate({ semester: semNum }, user, setUser);
  };

  const handleUpdateProfile = async (newName, newSemester) => {
    if (!newName.trim()) return;
    const semNum = parseInt(newSemester, 10) || 1;
    await saveProfileUpdate({ name: newName.trim(), semester: semNum }, user, setUser);
    setShowEditProfile(false);
  };

  const handleUpdateTimetable = async (newTimetable) => {
    await saveProfileUpdate({ timetable: newTimetable }, user, setUser);
  };

  // Extract student registration number from college email (firstname.regnumber@vitbhopal.ac.in)
  const getRegNumber = () => {
    if (!user || !user.isVitBhopal || !user.email) return '';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return parts[1].toUpperCase();
    }
    return '';
  };

  // Statistics calculation
  const totalSkills = skills.length;
  const completedSkills = skills.filter(s => s.status === 'Completed').length;
  const inProgressSkills = skills.filter(s => s.status === 'In Progress').length;
  const inProgressSkillsList = skills.filter(s => s.status === 'In Progress');

  const stats = {
    totalSkills,
    completedSkills,
    inProgressSkills,
    inProgressSkillsList,
    xpPoints
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'roadmap':
        return (
          <Roadmap 
            skills={skills} 
            userCourses={user ? user.courses : []}
            userSemester={user ? user.semester : 1}
            onUpdateSkillStatus={handleUpdateSkillStatus} 
          />
        );
      case 'opportunities':
        return (
          <Opportunities 
            initialOpportunities={opportunities} 
            lastUpdated={lastUpdated} 
            onRefreshData={fetchOpportunities}
          />
        );
      case 'guide':
        return (
          <VITBhopalGuide 
            isVitBhopal={user ? user.isVitBhopal : false} 
            userSemester={user ? user.semester : 1}
            userProgram={user ? user.program : ''}
          />
        );
      case 'timetable':
        if (!user) {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <TimetablePage 
            user={user}
            onUpdateTimetable={handleUpdateTimetable}
            syncStatus={profileSyncStatus}
          />
        );
      case 'campus':
        if (!user) {
          setActiveTab('dashboard');
          return null;
        }
        return (
          <CampusLife 
            user={user} 
            token={token} 
            clubs={clubs}
            events={events}
            fetchClubs={fetchClubs}
            fetchEvents={fetchEvents}
            initialSelectedEventId={highlightedEventId}
            clearInitialSelectedEvent={() => setHighlightedEventId(null)}
          />
        );
      default:
        return (
          <Dashboard 
            stats={stats} 
            user={user}
            opportunities={opportunities} 
            onNavigate={setActiveTab}
            onUpdateSemester={handleUpdateSemester}
            clubs={clubs}
            events={events}
            fetchEvents={fetchEvents}
            token={token}
            theme={theme}
            onNavigateToEvent={(eventId) => {
              setHighlightedEventId(eventId);
              setActiveTab('campus');
            }}
          />
        );
    }
  };

  // Handle client-side routing for legal compliance documents
  if (window.location.pathname === '/terms') {
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-deep))' }}>
          <h2>Loading Terms & Conditions...</h2>
        </div>
      }>
        <TermsAndConditions />
      </Suspense>
    );
  }
  if (window.location.pathname === '/privacy') {
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-deep))' }}>
          <h2>Loading Privacy Policy...</h2>
        </div>
      }>
        <PrivacyPolicy />
      </Suspense>
    );
  }

  // If loading user profile, show brief loading screen
  if (token && loading && !user) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-deep))' }}>
        <h2>Syncing secure connection...</h2>
      </div>
    );
  }

  // Render Login/Signup if not authenticated (guests bypass this with user.isGuest)
  if (!token && !user?.isGuest) {
    return (
      <Suspense fallback={
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-deep))' }}>
          <h2>Loading Secure Authentication...</h2>
        </div>
      }>
        <Auth onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-mobile-close" onClick={() => setMobileMenuOpen(false)}>
          ✕
        </div>
        <div className="brand">
          <div>
            <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
              <span className="logo-gradient-text">VIT</span>
              <TypewriterText
                words={user?.isGuest ? ['GUEST'] : (user && user.isVitBhopal ? ['LIFE', 'BHOPAL'] : ['BHOPAL'])}
                className="brand-rotating-text"
              />
            </div>
            <div className="branch-badge">
              {user?.isGuest ? '👤 Guest Session' : (user && user.isVitBhopal ? 'VIT Bhopal Student' : 'Global User')}
            </div>
          </div>
        </div>

        <nav>
          <ul className="nav-list">
            <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => handleTabClick('dashboard')}>
                🏠 Dashboard
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'roadmap' ? 'active' : ''}`}>
              <button onClick={() => handleTabClick('roadmap')}>
                🗺️ Skill Roadmap
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'opportunities' ? 'active' : ''}`}>
              <button onClick={() => handleTabClick('opportunities')}>
                🎯 Opportunities Hub
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'guide' ? 'active' : ''}`}>
              <button onClick={() => handleTabClick('guide')}>
                🏫 {user && user.isVitBhopal ? 'VIT Bhopal Guide' : 'DS & AI Guide'}
              </button>
            </li>
            {user && (
              <li className={`nav-item ${activeTab === 'campus' ? 'active' : ''}`}>
                <button onClick={() => handleTabClick('campus')}>
                  🎪 College Life
                </button>
              </li>
            )}
            {/* Timetable available to all including guests (saves locally) */}
            {user && (
              <li className={`nav-item ${activeTab === 'timetable' ? 'active' : ''}`}>
                <button onClick={() => handleTabClick('timetable')}>
                  📅 Schedule
                </button>
              </li>
            )}
            {/* Mobile-only navigation links */}
            <li className="nav-item mobile-only-nav-item">
              <button onClick={() => { setShowAboutUs(true); setMobileMenuOpen(false); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                About Us
              </button>
            </li>
            <li className="nav-item mobile-only-nav-item">
              <button onClick={() => { window.open('https://github.com/aditya-dev06', '_blank', 'noopener,noreferrer'); setMobileMenuOpen(false); }}>
                <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub Profile
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-status">
          <div className={`status-dot ${
            user?.isGuest 
              ? 'status-dot--guest' 
              : profileSyncStatus === 'synced' 
                ? 'status-dot--synced' 
                : profileSyncStatus === 'syncing' 
                  ? 'crawling' 
                  : 'status-dot--pending'
          }`}></div>
          <span>
            {user?.isGuest 
              ? 'Local only — not synced' 
              : profileSyncStatus === 'synced' 
                ? 'Sync Status: Synced' 
                : profileSyncStatus === 'syncing' 
                  ? 'Sync Status: Syncing...' 
                  : 'Sync Status: Offline (Pending)'}
          </span>
        </div>

        {/* PWA Install Button — shown only when browser fires beforeinstallprompt */}
        {installPrompt && (
          <button
            className="pwa-install-btn"
            onClick={handleInstallApp}
            title="Install app to your device"
          >
            {/* Download-to-device SVG icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Install App
          </button>
        )}

        <div className="sidebar-footer">
          <div className="user-profile-capsule">
            <div className="user-profile">
              <div className="avatar">
                {user && user.name ? user.name.substring(0, 2).toUpperCase() : 'DS'}
              </div>
              <div className="user-info">
                <div className="name" title={user ? user.name : 'CDS Student'}>
                  {user ? user.name : 'CDS Student'}
                </div>
                <div className="college">
                  {user?.isGuest
                    ? 'Guest • Not signed in'
                    : (user && user.isVitBhopal
                      ? `${getRegNumber()} • Sem ${user.semester || 1}`
                      : (user && user.semester && user.semester !== 0 ? `Sem ${user.semester}` : 'Global'))}
                </div>
              </div>
            </div>
            <div className="profile-actions">
              {user?.isGuest ? (
                // Guest: Show Sign Up CTA — clicking clears guest session and returns to Auth
                <button
                  className="profile-btn"
                  onClick={handleLogout}
                  title="Create Account"
                  style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.55rem', letterSpacing: '0.03em', color: 'hsl(var(--primary))' }}
                >
                  Sign&nbsp;Up
                </button>
              ) : (
                // Verified user: show edit-profile gear button
                <button
                  className="profile-btn"
                  onClick={() => setShowEditProfile(true)}
                  title="Edit Profile"
                >
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              )}
              <button 
                className="profile-btn" 
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                title="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" height="1.15em" width="1.15em">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" height="1.15em" width="1.15em">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
              <button 
                className="profile-btn" 
                onClick={handleLogout}
                title="Log Out"
              >
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {mobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Main Panel View */}
      <main 
        className="main-content"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating Top Navigation Bar */}
        <header className={`top-bar ${scrolled ? 'scrolled' : ''} ${navHidden ? 'nav-hidden' : ''}`} style={{ '--scroll-progress': scrollProgress }}>
          {/* Scroll progress bar */}
          <div className="top-bar-progress" />
          {/* Animated shimmer line */}
          <div className="top-bar-shimmer" />

          {/* Mobile website branding & profile row: visible initially, collapses/disappears on scroll down */}
          <div className="top-bar-mobile-header-row">
            <div className="top-bar-mobile-brand">
              <span className="logo-gradient-text" style={{ fontWeight: 800 }}>VIT</span>
              <TypewriterText
                words={user?.isGuest ? ['GUEST'] : (user && user.isVitBhopal ? ['LIFE', 'BHOPAL'] : ['BHOPAL'])}
                className="brand-rotating-text"
              />
            </div>

            {/* Mobile Header Actions (Profile & Theme togglers) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {/* PWA Install button — mobile */}
              {installPrompt && (
                <button
                  className="top-bar-mobile-theme-btn pwa-install-btn-mobile"
                  onClick={handleInstallApp}
                  title="Install App"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'hsl(var(--primary))' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Install
                </button>
              )}
              <button 
                className="top-bar-mobile-theme-btn"
                onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                title="Toggle Light/Dark Theme"
                style={{ display: 'flex' }}
              >
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              <button 
                className="top-bar-mobile-profile-btn"
                onClick={() => setShowMobileProfileSheet(true)}
                title="Profile & Settings"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>

          <nav className="top-bar-nav">
            <button className="top-bar-link" onClick={() => handleTabClick('dashboard')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Home
            </button>
            <button className="top-bar-link" onClick={() => setShowAboutUs(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              About Us
            </button>
            <a 
              href="https://github.com/aditya-dev06" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="top-bar-link"
            >
              <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </nav>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <Suspense fallback={
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', minHeight: '50vh' }}>
                <h3>Loading...</h3>
              </div>
            }>
              {renderActiveComponent()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {showEditProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
          onSave={handleUpdateProfile}
        />
      )}
      {showAboutUs && (
        <div className="modal-overlay" onClick={() => setShowAboutUs(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ℹ️ About Opportunity Hub
              </h2>
              <button onClick={() => setShowAboutUs(false)} style={{
                background: 'transparent',
                border: 'none',
                color: 'hsl(var(--text-secondary))',
                cursor: 'pointer',
                fontSize: '1.25rem'
              }}>
                ✕
              </button>
            </div>
            <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>
                Welcome to <strong>Opportunity Hub</strong>, a premium, centralized ecosystem designed for student developers and tech enthusiasts. Our goal is to connect you with the latest events, hackathons, club recruitment, and skill roadmaps.
              </p>
              <p>
                Built by a dedicated team at the <strong>VIT Life Developer Network</strong>. We focus on modern interactions, premium aesthetics, and responsive performance.
              </p>
              <div style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--text-primary))', marginBottom: '0.5rem' }}>Core Mission</h3>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <li>Promote collaborative peer learning and mentorship</li>
                  <li>Provide real-time visibility into club activities</li>
                  <li>Enable interactive project showreels and skill maps</li>
                </ul>
              </div>
              <div style={{ borderTop: '1px solid hsla(var(--border-glass))', paddingTop: '1rem', fontSize: '0.85rem', color: 'hsl(var(--text-muted))', display: 'flex', justifyContent: 'space-between' }}>
                <span>Version 2.1.0</span>
                <span>© {new Date().getFullYear()} VIT Life Devs</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation (Dock) */}
      {(() => {
        const dockItems = [
          {
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Home',
            onClick: () => handleTabClick('dashboard'),
            className: activeTab === 'dashboard' ? 'active' : ''
          },
          {
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <circle cx="12" cy="12" r="10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Opps',
            onClick: () => handleTabClick('opportunities'),
            className: activeTab === 'opportunities' ? 'active' : ''
          },
          ...(user ? [{
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Schedule',
            onClick: () => handleTabClick('timetable'),
            className: activeTab === 'timetable' ? 'active' : ''
          }] : []),
          {
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'Guide',
            onClick: () => handleTabClick('guide'),
            className: activeTab === 'guide' ? 'active' : ''
          },
          ...(user ? [{
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="20" height="20">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ),
            label: 'College Life',
            onClick: () => handleTabClick('campus'),
            className: activeTab === 'campus' ? 'active' : ''
          }] : [])
        ];

        return (
          <Dock
            items={dockItems}
            panelHeight={52}
            baseItemSize={40}
            magnification={58}
            outerClassName={navHidden ? 'nav-hidden' : ''}
          />
        );
      })()}

      {/* Mobile Profile Settings Bottom Sheet */}
      {showMobileProfileSheet && (
        <div className="modal-overlay" onClick={() => setShowMobileProfileSheet(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'hsl(var(--text-primary))' }}>
                👤 Account & Settings
              </h2>
              <button 
                onClick={() => setShowMobileProfileSheet(false)} 
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
            
            {/* User Info Block */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              marginBottom: '1.25rem'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.1rem'
              }}>
                {user && user.name ? user.name.substring(0, 2).toUpperCase() : 'DS'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'hsl(var(--text-primary))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? user.name : 'CDS Student'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                  {user && user.isVitBhopal 
                    ? `${getRegNumber()} • Sem ${user.semester || 1}` 
                    : (user && user.semester && user.semester !== 0 ? `Sem ${user.semester}` : 'Global User')}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>ONLINE</span>
              </div>
            </div>

            {/* Settings Actions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => { setShowEditProfile(true); setShowMobileProfileSheet(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
              >
                ✏️ Edit Profile Name/Sem
              </button>
              <button 
                onClick={() => { setShowAboutUs(true); setShowMobileProfileSheet(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
              >
                ℹ️ About Platform
              </button>
              <a 
                href="https://github.com/aditya-dev06" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '10px',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxSizing: 'border-box'
                }}
              >
                🐙 Visit GitHub
              </a>
            </div>

            {/* Logout Action */}
            <button 
              onClick={() => { handleLogout(); setShowMobileProfileSheet(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.9rem',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '10px',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}

function EditProfileModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user?.name || '');
  const [semester, setSemester] = useState(user?.semester || 1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { alert('Name cannot be empty.'); return; }
    setLoading(true);
    await onSave(name.trim(), parseInt(semester, 10) || 1);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'hsl(var(--text-primary))', margin: 0 }}>
            ✏️ Edit Profile
          </h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
            fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '0.4rem', display: 'block' }}>Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Your name" 
              required 
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--text-secondary))', marginBottom: '0.4rem', display: 'block' }}>Semester</label>
            <select 
              value={semester} 
              onChange={e => setSemester(e.target.value)} 
              required
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
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

export default App;
