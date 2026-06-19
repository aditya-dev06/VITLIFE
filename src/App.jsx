import { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Dashboard from './components/Dashboard';
import Roadmap from './components/Roadmap';
import Opportunities from './components/Opportunities';
import VITBhopalGuide from './components/VITBhopalGuide';
import CampusLife from './components/CampusLife';
import Auth from './components/Auth';
import RotatingText from './components/RotatingText';
import TermsAndConditions from './components/TermsAndConditions';
import PrivacyPolicy from './components/PrivacyPolicy';

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
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [xpPoints, setXpPoints] = useState(0);
  const [skills, setSkills] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('ds_ai_token');
    localStorage.removeItem('ds_ai_user');
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
          status: profile.skillsProgress[skill.id] || 'To Do'
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
        setSkills(INITIAL_SKILLS);
        setXpPoints(0);
        setUser(null);
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
    localStorage.setItem('ds_ai_token', newToken);
    localStorage.setItem('ds_ai_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
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

    // Compute updated progress object
    const newProgress = {};
    updated.forEach(s => {
      if (s.status !== 'To Do') {
        newProgress[s.id] = s.status;
      }
    });

    if (user) {
      const updatedUser = { ...user, skillsProgress: newProgress };
      setUser(updatedUser);
      localStorage.setItem('ds_ai_user', JSON.stringify(updatedUser));
    }

    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ skillsProgress: newProgress })
        });
      } catch (err) {
        console.error("Failed to sync skills with backend: ", err);
      }
    }
  };



  const handleUpdateSemester = async (newSemester) => {
    const semNum = parseInt(newSemester, 10) || 1;
    if (user) {
      const updatedUser = { ...user, semester: semNum };
      setUser(updatedUser);
      localStorage.setItem('ds_ai_user', JSON.stringify(updatedUser));
    }

    if (token) {
      try {
        await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ semester: semNum })
        });
      } catch (err) {
        console.error("Failed to sync semester with backend: ", err);
      }
    }
  };

  const handleUpdateProfile = async (newName, newSemester) => {
    if (!newName.trim()) return;
    const semNum = parseInt(newSemester, 10) || 1;
    if (user) {
      const updatedUser = { ...user, name: newName.trim(), semester: semNum };
      setUser(updatedUser);
      localStorage.setItem('ds_ai_user', JSON.stringify(updatedUser));
    }

    if (token) {
      try {
        const res = await fetch('/api/user/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: newName.trim(), semester: semNum })
        });
        if (res.ok) {
          setShowEditProfile(false);
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update profile.');
        }
      } catch (err) {
        console.error("Failed to sync profile with backend: ", err);
      }
    }
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

  const roadmapProgress = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;

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
      case 'campus':
        if (!user || !user.isVitBhopal) {
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
          />
        );
      default:
        return (
          <Dashboard 
            stats={stats} 
            user={user}
            opportunities={opportunities} 
            roadmapProgress={roadmapProgress}
            onNavigate={setActiveTab}
            onUpdateSemester={handleUpdateSemester}
            clubs={clubs}
            events={events}
            fetchEvents={fetchEvents}
            token={token}
          />
        );
    }
  };

  // Handle client-side routing for legal compliance documents
  if (window.location.pathname === '/terms') {
    return <TermsAndConditions />;
  }
  if (window.location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }

  // If loading user profile, show brief loading screen
  if (token && loading && !user) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--text-muted))', backgroundColor: 'hsl(var(--bg-deep))' }}>
        <h2>Syncing secure connection...</h2>
      </div>
    );
  }

  // Render Login/Signup if not authenticated
  if (!token) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
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
              <RotatingText
                texts={user && user.isVitBhopal ? ['HON', 'LIFE'] : ['HON']}
                mainClassName="brand-rotating-text"
                staggerFrom="last"
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "-120%", opacity: 0 }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={4500}
              />
            </div>
            <div className="branch-badge">
              {user && user.isVitBhopal ? 'VIT Bhopal Student' : 'Global User'}
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
            {user && user.isVitBhopal && (
              <li className={`nav-item ${activeTab === 'campus' ? 'active' : ''}`}>
                <button onClick={() => handleTabClick('campus')}>
                  🎪 Campus Life
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="sidebar-status">
          <div className="status-dot"></div>
          <span>Sync Status: Active</span>
        </div>

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
                  {user && user.isVitBhopal 
                    ? `${getRegNumber()} • Sem ${user.semester || 1}` 
                    : (user && user.semester && user.semester !== 0 ? `Sem ${user.semester}` : 'Global')}
                </div>
              </div>
            </div>
            <div className="profile-actions">
              {user && (
                <button 
                  className="profile-btn" 
                  onClick={() => setShowEditProfile(true)}
                  title="Edit Profile"
                >
                  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.15em" width="1.15em" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                </button>
              )}
              <button 
                className="profile-btn" 
                onClick={handleLogout}
                title="Log Out"
              >
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1.1em" width="1.1em" xmlns="http://www.w3.org/2000/svg">
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
      <main className="main-content">
        {/* Floating Top Navigation Bar */}
        <header className={`top-bar ${scrolled ? 'scrolled' : ''}`}>
          <nav className="top-bar-nav">
            <button className="top-bar-link" onClick={() => handleTabClick('dashboard')}>
              🏠 Home
            </button>
            <button className="top-bar-link" onClick={() => setShowAboutUs(true)}>
              ℹ️ About Us
            </button>
            <a 
              href="https://github.com/aditya-dev06/opportunity_hub" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="top-bar-link"
            >
              <svg height="1.15em" width="1.15em" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub
            </a>
          </nav>
        </header>

        {/* Mobile Header */}
        <div className="mobile-header">
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(true)}>
            ☰
          </button>
          <div className="mobile-brand-title">
            <span className="logo-gradient-text">VIT</span>
            <span style={{ color: 'hsl(var(--accent))', fontWeight: 800 }}>HON</span>
          </div>
          <div style={{ width: '40px' }}></div>
        </div>

        {renderActiveComponent()}
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
      <Analytics />
    </div>
  );
}

export default App;
