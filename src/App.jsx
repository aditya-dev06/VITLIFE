import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Roadmap from './components/Roadmap';
import Opportunities from './components/Opportunities';
import VITBhopalGuide from './components/VITBhopalGuide';
import PracticeArena from './components/PracticeArena';
import Auth from './components/Auth';

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
  const [token, setToken] = useState(localStorage.getItem('ds_ai_token'));
  const [user, setUser] = useState(null);
  const [xpPoints, setXpPoints] = useState(0);
  const [skills, setSkills] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  // Initialize and load user profile on token change or startup
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setSkills(INITIAL_SKILLS);
      setXpPoints(0);
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  // Load opportunities on token load
  useEffect(() => {
    fetchOpportunities();
  }, [token]);

  const fetchUserProfile = async () => {
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
  };

  const fetchOpportunities = async () => {
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
  };

  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('ds_ai_token', newToken);
    localStorage.setItem('ds_ai_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('ds_ai_token');
    localStorage.removeItem('ds_ai_user');
    setToken(null);
    setUser(null);
    setSkills(INITIAL_SKILLS);
    setXpPoints(0);
    setActiveTab('dashboard');
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

  // Sync XP changes to the Express server
  const handleAddXp = async (amount) => {
    const newXp = xpPoints + amount;
    setXpPoints(newXp);

    if (user) {
      const updatedUser = { ...user, xpPoints: newXp };
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
          body: JSON.stringify({ xpPoints: newXp })
        });
      } catch (err) {
        console.error("Failed to sync XP with backend: ", err);
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
      case 'practice':
        return <PracticeArena onAddXp={handleAddXp} />;
      default:
        return (
          <Dashboard 
            stats={stats} 
            user={user}
            opportunities={opportunities} 
            roadmapProgress={roadmapProgress}
            onNavigate={setActiveTab}
            onUpdateSemester={handleUpdateSemester}
          />
        );
    }
  };

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
      <aside className="sidebar">
        <div className="brand">
          <div>
            <div className="brand-logo">VITHON</div>
            <div className="branch-badge">
              {user && user.isVitBhopal ? 'VIT Bhopal Student' : 'Global User'}
            </div>
          </div>
        </div>

        <nav>
          <ul className="nav-list">
            <li className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('dashboard')}>
                🏠 Dashboard
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'roadmap' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('roadmap')}>
                🗺️ Skill Roadmap
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'opportunities' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('opportunities')}>
                🎯 Opportunities Hub
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'guide' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('guide')}>
                🏫 {user && user.isVitBhopal ? 'VIT Bhopal Guide' : 'DS & AI Guide'}
              </button>
            </li>
            <li className={`nav-item ${activeTab === 'practice' ? 'active' : ''}`}>
              <button onClick={() => setActiveTab('practice')}>
                🏆 Practice Arena
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <div className="avatar">
                {user && user.name ? user.name.substring(0, 2).toUpperCase() : 'DS'}
              </div>
              <div className="user-info" style={{ overflow: 'hidden', textOverflow: 'ellipsis', width: 'calc(100% - 50px)' }}>
                <div className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? user.name : 'CDS Student'}
                </div>
                <div className="college" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  {user && user.isVitBhopal 
                    ? `${getRegNumber()} • Sem ${user.semester || 1}` 
                    : (user && user.semester && user.semester !== 0 ? `Global Student • Sem ${user.semester}` : 'Global Member')}
                </div>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              🚪 Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel View */}
      <main className="main-content">
        {renderActiveComponent()}
      </main>
    </div>
  );
}

export default App;
