import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MongoClient } from 'mongodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const OPPORTUNITIES_FILE = path.join(DATA_DIR, 'opportunities.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCRIPTS_DIR = path.join(path.dirname(__dirname), 'scripts');
const PYTHON_SCRIPT = path.join(SCRIPTS_DIR, 'fetch_opportunities.py');

// Ensure database directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// MongoDB Database Client Connection Setup
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;
let client = null;
let dbConnectionError = null;
let dbConnectionStatus = "Initializing";
let dbConnectingPromise = null;

if (MONGODB_URI) {
  console.log("Connecting to MongoDB Atlas...");
  dbConnectionStatus = "Connecting";
  client = new MongoClient(MONGODB_URI);
  dbConnectingPromise = client.connect()
    .then(c => {
      db = c.db();
      dbConnectionStatus = "Connected";
      dbConnectionError = null;
      console.log("Successfully connected to MongoDB Database!");
    })
    .catch(err => {
      dbConnectionStatus = "Failed";
      dbConnectionError = err.message || String(err);
      console.error("Failed to connect to MongoDB Atlas, falling back to local files:", err);
    });
} else {
  dbConnectionStatus = "Local Fallback Mode (No MONGODB_URI)";
  console.log("No MONGODB_URI set, running in local fallback file mode.");
}

// Load or generate a persistent secret so session tokens remain valid across server restarts
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (fs.existsSync(SECRET_FILE)) {
    JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } else {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    fs.writeFileSync(SECRET_FILE, JWT_SECRET, 'utf8');
  }
}

// Seed opportunities if empty
const writeInitialSeeds = () => {
  const seeds = {
    lastUpdated: new Date().toISOString().replace('T', ' ').substring(0, 19),
    count: 16,
    opportunities: [
      {
        id: "c1",
        title: "Smart India Hackathon (SIH) 2026",
        type: "hackathon",
        organization: "Ministry of Education, India",
        link: "https://sih.gov.in/",
        deadline: "Registration closes soon",
        matchScore: 98,
        description: "India's biggest national hackathon solving product development and digital solutions problems. Highly recognized for VIT Bhopal students.",
        tags: ["Hackathon", "National", "VIT Recommended", "Team Event"]
      },
      {
        id: "c2",
        title: "Google Summer of Code (GSoC) 2026",
        type: "internship",
        organization: "Google & Open Source Organizations",
        link: "https://summerofcode.withgoogle.com/",
        deadline: "Applications open early next year",
        matchScore: 95,
        description: "A global program focused on bringing student developers into open-source software development. Work on computational data science or ML tools.",
        tags: ["Internship", "Remote", "Stipend", "Open Source"]
      },
      {
        id: "c3",
        title: "IBM Data Science Professional Certificate",
        type: "certificate",
        organization: "IBM via Coursera",
        link: "https://www.coursera.org/professional-certificates/ibm-data-science",
        deadline: "Self-paced",
        matchScore: 92,
        description: "Get started in Data Science with Python, SQL, data visualization, analysis, and machine learning. Excellent for 2nd year portfolio building.",
        tags: ["Course", "Free Audit", "Python", "SQL"]
      },
      {
        id: "c4",
        title: "Kaggle Machine Learning & Deep Learning Micro-Courses",
        type: "course",
        organization: "Kaggle",
        link: "https://www.kaggle.com/learn",
        deadline: "Self-paced",
        matchScore: 94,
        description: "Hands-on, bite-sized tutorials covering Python, Pandas, Machine Learning, Deep Learning, and Computer Vision. Includes free certificates of completion.",
        tags: ["Course", "Free Certificate", "Hands-on", "Data Science"]
      },
      {
        id: "c5",
        title: "ISRO Computational Science & Data Analytics Summer Internship",
        type: "internship",
        organization: "ISRO - Indian Space Research Organisation",
        link: "https://www.isro.gov.in/",
        deadline: "Check local VIT coordinator / official site",
        matchScore: 97,
        description: "Prestigious computational and space data analysis internship. Perfect match for Integrated M.Tech Computational and Data Science students.",
        tags: ["Internship", "Research", "Computational Science", "India"]
      },
      {
        id: "c6",
        title: "Hugging Face Deep RL and NLP Course",
        type: "course",
        organization: "Hugging Face",
        link: "https://huggingface.co/learn",
        deadline: "Self-paced",
        matchScore: 90,
        description: "Free, open-source course on Deep Reinforcement Learning and NLP using Transformers, Datasets, and Accelerate libraries. Ideal for AI specializations.",
        tags: ["Course", "AI", "Transformers", "NLP"]
      },
      {
        id: "c7",
        title: "Devpost Global AI & LLM Hackathon Series",
        type: "hackathon",
        organization: "Devpost",
        link: "https://devpost.com/hackathons?themes[]=AI%2FML",
        deadline: "Ongoing weekly",
        matchScore: 88,
        description: "Build innovative AI/ML applications, agents, or models. Participate in global virtual hackathons with large cash prizes and networking.",
        tags: ["Hackathon", "Remote", "AI/ML", "Cash Prizes"]
      },
      {
        id: "c8",
        title: "Unstop Data Science Hackathons & Hiring Challenges",
        type: "hackathon",
        organization: "Unstop",
        link: "https://unstop.com/hackathons?filters=data-science",
        deadline: "Varies by competition",
        matchScore: 93,
        description: "Explore and register for active hackathons, coding challenges, and internships curated for college students in India.",
        tags: ["Hackathon", "India", "College Students", "Coding"]
      },
      {
        id: "c9",
        title: "Major League Hacking (MLH) Hackathon Season",
        type: "hackathon",
        organization: "Major League Hacking",
        link: "https://mlh.io/seasons/2026/events",
        deadline: "Ongoing events",
        matchScore: 96,
        description: "The official student hackathon league. Compete in weekly global digital and in-person hackathons. Highly valuable for building developer portfolios.",
        tags: ["Hackathon", "Global", "Student Event", "Weekly"]
      },
      {
        id: "c10",
        title: "TCS CodeVita 2026 - Global Coding Contest",
        type: "hackathon",
        organization: "Tata Consultancy Services",
        link: "https://www.tcscodevita.com/",
        deadline: "Check official portal",
        matchScore: 97,
        description: "One of the world's largest coding competitions for college students. Top performers secure direct interview invites for prime roles.",
        tags: ["Hackathon", "Coding Contest", "Placements", "India"]
      },
      {
        id: "c11",
        title: "Microsoft Imagine Cup 2026",
        type: "hackathon",
        organization: "Microsoft",
        link: "https://imaginecup.microsoft.com/",
        deadline: "Check portal for registration",
        matchScore: 95,
        description: "A global competition for student developers to build innovative technology projects using Microsoft Azure. Huge cash prizes and mentoring from industry leaders.",
        tags: ["Hackathon", "Global", "Azure", "Mentor Support"]
      },
      {
        id: "c12",
        title: "Amazon ML Challenge 2026",
        type: "hackathon",
        organization: "Amazon India",
        link: "https://www.amazon.science/",
        deadline: "Varies (usually mid-year)",
        matchScore: 98,
        description: "An annual competition designed to test machine learning modeling skills on real-world datasets. Top ranks get direct interview opportunities at Amazon.",
        tags: ["Hackathon", "Machine Learning", "Amazon", "Placements"]
      },
      {
        id: "c13",
        title: "Google Girl Hackathon 2026",
        type: "hackathon",
        organization: "Google India",
        link: "https://buildyourfuture.withgoogle.com/",
        deadline: "Announced annually",
        matchScore: 96,
        description: "A coding and system design challenge for female engineering students across India, designed to create a pipeline for internship and full-time hiring.",
        tags: ["Hackathon", "Coding Contest", "Women in Tech", "Google"]
      },
      {
        id: "c14",
        title: "Kaggle Active Data Science Competitions",
        type: "hackathon",
        organization: "Kaggle (Google)",
        link: "https://www.kaggle.com/competitions",
        deadline: "Ongoing",
        matchScore: 94,
        description: "Solve challenging machine learning problems on real datasets. Gold/Silver medals are highly respected on resumes for Data Science roles.",
        tags: ["Hackathon", "Data Science", "Machine Learning", "Kaggle"]
      },
      {
        id: "c15",
        title: "LeetCode Weekly & Biweekly Contests",
        type: "hackathon",
        organization: "LeetCode",
        link: "https://leetcode.com/contest/",
        deadline: "Every Sunday & alternate Saturdays",
        matchScore: 95,
        description: "Improve your speed and accuracy in solving DSA problems. Crucial preparation for top tier technical screening tests.",
        tags: ["Coding Contest", "DSA", "Weekly", "Practice"]
      },
      {
        id: "c16",
        title: "Flipkart Runway Season 6",
        type: "internship",
        organization: "Flipkart",
        link: "https://unstop.com/competitions/flipkart-runway",
        deadline: "Check Unstop portal",
        matchScore: 94,
        description: "Engineering challenge for female students offering direct summer internships at Flipkart. Focuses on coding, analytical ability, and innovation.",
        tags: ["Internship Challenge", "Women in Tech", "Flipkart", "Summer Intern"]
      }
    ]
  };
  fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(seeds, null, 2), 'utf-8');
};

if (!fs.existsSync(OPPORTUNITIES_FILE)) {
  writeInitialSeeds();
}

// User helper functions (local file fallback fallback)
const loadUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
};

const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

// Database interface methods
const findUserByEmail = async (email) => {
  const lowerEmail = email.toLowerCase().trim();
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      return await db.collection('users').findOne({ email: lowerEmail });
    } catch (err) {
      console.error("MongoDB findUserByEmail error, falling back to file:", err);
    }
  }
  const users = loadUsers();
  return users[lowerEmail] || null;
};

const saveUser = async (email, userData) => {
  const lowerEmail = email.toLowerCase().trim();
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      await db.collection('users').updateOne(
        { email: lowerEmail },
        { $set: userData },
        { upsert: true }
      );
      return;
    } catch (err) {
      console.error("MongoDB saveUser error, falling back to file:", err);
    }
  }
  const users = loadUsers();
  users[lowerEmail] = userData;
  saveUsers(users);
};

const getOpportunities = async () => {
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      const data = await db.collection('opportunities').findOne({ type: 'metadata' });
      if (data) {
        return {
          lastUpdated: data.lastUpdated,
          opportunities: data.opportunities || []
        };
      }
    } catch (err) {
      console.error("MongoDB getOpportunities error, falling back to file:", err);
    }
  }
  if (!fs.existsSync(OPPORTUNITIES_FILE)) {
    writeInitialSeeds();
  }
  try {
    const data = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
    return {
      lastUpdated: data.lastUpdated,
      opportunities: data.opportunities || []
    };
  } catch (e) {
    return { lastUpdated: '', opportunities: [] };
  }
};

const saveOpportunities = async (opportunitiesData) => {
  fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(opportunitiesData, null, 2), 'utf-8');
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      await db.collection('opportunities').updateOne(
        { type: 'metadata' },
        { $set: {
            type: 'metadata',
            lastUpdated: opportunitiesData.lastUpdated,
            opportunities: opportunitiesData.opportunities
          }
        },
        { upsert: true }
      );
      console.log("Successfully synced opportunities to MongoDB Atlas!");
    } catch (err) {
      console.error("MongoDB saveOpportunities error:", err);
    }
  }
};

// Parser to extract registration number and program name from VIT email
const parseVitBhopalEmail = (email) => {
  const cleanEmail = email.trim().toLowerCase();
  const vitRegex = /^([a-zA-Z.-]+)\.([a-zA-Z0-9]+)@vitbhopal\.ac\.in$/;
  const match = cleanEmail.match(vitRegex);
  if (!match) return null;

  const registrationNumber = match[2].toUpperCase();
  const progMatch = registrationNumber.match(/^\d{2}([A-Z]{3})/);
  let program = 'VIT Bhopal Student';
  
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
  }

  return { registrationNumber, program };
};

// PBKDF2 Password Hashing
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

const hashPassword = (password, salt) => {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return hash.toString('hex');
};

// Custom Session Token generation and validation (zero dependencies, cryptographically secure)
const generateToken = (email) => {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  hmac.update(`${email}:${expiresAt}`);
  const signature = hmac.digest('hex');
  const base64Email = Buffer.from(email).toString('base64');
  return `${signature}.${base64Email}.${expiresAt}`;
};

const verifyToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [signature, base64Email, expiresAtStr] = parts;
    const email = Buffer.from(base64Email, 'base64').toString('utf-8');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) return null;

    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    hmac.update(`${email}:${expiresAt}`);
    const expectedSignature = hmac.digest('hex');

    if (signature === expectedSignature) {
      return email;
    }
  } catch (e) {
    return null;
  }
  return null;
};

// Express Authenticated Route Middleware
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  const email = verifyToken(token);
  if (!email) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'User does not exist.' });
  }

  req.user = user;
  next();
};

// ================= DIAGNOSTICS =================
app.get('/api/db-status', (req, res) => {
  res.json({
    status: dbConnectionStatus,
    connected: !!db,
    error: dbConnectionError,
    uriConfigured: !!MONGODB_URI,
    uriObfuscated: MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ':****@') : null
  });
});

// ================= AUTH ROUTES =================

// 1. Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, isVitBhopal, courses, semester } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    let registrationNumber = '';
    let program = 'Global Member';

    // Verification logic
    if (isVitBhopal) {
      // Prototype: firstname.registrationnumber@vitbhopal.ac.in
      const vitRegex = /^[a-zA-Z.-]+\.[a-zA-Z0-9]+@vitbhopal\.ac\.in$/;
      if (!vitRegex.test(lowerEmail)) {
        return res.status(400).json({
          error: 'College email must follow the prototype: firstname.registrationnumber@vitbhopal.ac.in'
        });
      }
      const parsed = parseVitBhopalEmail(lowerEmail);
      if (parsed) {
        registrationNumber = parsed.registrationNumber;
        program = parsed.program;
      }
    } else {
      const generalRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!generalRegex.test(lowerEmail)) {
        return res.status(400).json({ error: 'Invalid email address format.' });
      }
    }

    const existingUser = await findUserByEmail(lowerEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email.' });
    }

    // Hash password securely with dynamic salt
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // Create user profile
    const newUser = {
      name: name.trim(),
      email: lowerEmail,
      isVitBhopal: !!isVitBhopal,
      registrationNumber,
      program,
      semester: semester ? parseInt(semester, 10) : 1,
      courses: Array.isArray(courses) ? courses : [],
      passwordHash,
      salt,
      xpPoints: 0,
      skillsProgress: {}, // skillId -> 'To Do' | 'In Progress' | 'Completed'
      createdAt: new Date().toISOString()
    };

    await saveUser(lowerEmail, newUser);

    const token = generateToken(lowerEmail);

    // Remove sensitive data before sending back response
    const userProfile = { ...newUser };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error: ' + error.message });
  }
});

// 2. Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(lowerEmail);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Server authentication error: ' + error.message });
  }
});

// 3. Get User Profile Progress
app.get('/api/user/profile', authenticate, (req, res) => {
  const userProfile = { ...req.user };
  delete userProfile.passwordHash;
  delete userProfile.salt;
  res.json(userProfile);
});

// 4. Update User Profile Progress / Stats
app.post('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { xpPoints, skillsProgress, courses, semester } = req.body;
    const user = await findUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (xpPoints !== undefined) {
      user.xpPoints = parseInt(xpPoints, 10) || 0;
    }
    if (skillsProgress !== undefined) {
      user.skillsProgress = skillsProgress;
    }
    if (courses !== undefined) {
      user.courses = Array.isArray(courses) ? courses : [];
    }
    if (semester !== undefined) {
      user.semester = parseInt(semester, 10) || 1;
    }

    await saveUser(req.user.email, user);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ error: 'Server profile update error: ' + error.message });
  }
});

// ================= OPPORTUNITY & SCRAPER ROUTES =================

// 1. GET Route: Fetch opportunities (with personalization based on active courses)
app.get('/api/opportunities', async (req, res) => {
  try {
    const data = await getOpportunities();
    let opps = data.opportunities || [];

    // Personalization check: If a valid authentication token is passed, boost match score for selected courses
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const email = verifyToken(token);
      if (email) {
        const user = await findUserByEmail(email);
        if (user && user.isVitBhopal && user.courses.length > 0) {
          // Boost matching opportunities
          opps = opps.map(opp => {
            let boost = 0;
            const text = (opp.title + " " + opp.description + " " + opp.tags.join(" ")).toLowerCase();
            
            user.courses.forEach(course => {
              if (course === 'DBMS' && (text.includes('sql') || text.includes('database') || text.includes('dbms'))) {
                boost += 10;
              }
              if (course === 'DSA' && (text.includes('dsa') || text.includes('algorithms') || text.includes('coding') || text.includes('structures'))) {
                boost += 10;
              }
              if (course === 'Numerical Methods' && (text.includes('computational') || text.includes('mathematics') || text.includes('scientific') || text.includes('modeling'))) {
                boost += 10;
              }
              if (course === 'OOP' && (text.includes('oop') || text.includes('object-oriented') || text.includes('programming') || text.includes('python'))) {
                boost += 5;
              }
            });

            if (boost > 0) {
              return { 
                ...opp, 
                matchScore: Math.min(opp.matchScore + boost, 99),
                tags: [...new Set([...opp.tags, "Course Match"])]
              };
            }
            return opp;
          });
        }
      }
    }

    res.json({
      lastUpdated: data.lastUpdated,
      count: opps.length,
      opportunities: opps
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to read database: " + error.message });
  }
});

// 2. POST Route: Trigger research and stream logs in real time
app.post('/api/research', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'X-Accel-Buffering': 'no',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write("STATUS_START: Starting scraper process...\n");

  const pythonPath = process.platform === 'win32' 
    ? path.join(path.dirname(__dirname), 'venv', 'Scripts', 'python.exe')
    : path.join(path.dirname(__dirname), 'venv', 'bin', 'python');

  const cmd = fs.existsSync(pythonPath) ? pythonPath : 'python';

  console.log(`Executing crawler: ${cmd} ${PYTHON_SCRIPT}`);
  const child = spawn(cmd, [PYTHON_SCRIPT]);

  child.stdout.on('data', (data) => {
    res.write(data.toString());
  });

  child.stderr.on('data', (data) => {
    res.write(`ERROR: ${data.toString()}`);
  });

  child.on('close', async (code) => {
    if (code === 0) {
      try {
        if (fs.existsSync(OPPORTUNITIES_FILE)) {
          const fileData = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
          await saveOpportunities(fileData);
        }
        res.write("\nSTATUS_SUCCESS: Scraper executed successfully and database updated!\n");
      } catch (err) {
        res.write(`\nSTATUS_SUCCESS: Scraper executed successfully, but failed to sync to MongoDB: ${err.message}\n`);
      }
    } else {
      res.write(`\nSTATUS_FAILED: Scraper process exited with code ${code}\n`);
    }
    res.end();
  });

  child.on('error', (err) => {
    res.write(`\nSTATUS_FAILED: Failed to start scraper process: ${err.message}\n`);
    res.end();
  });
});

// Serve frontend build static files in production
const frontendBuild = path.join(path.dirname(__dirname), 'dist');
console.log(`Serving static files from: ${frontendBuild} (Exists: ${fs.existsSync(frontendBuild)})`);

app.use(express.static(frontendBuild));

// Fallback all non-API GET requests to index.html for React routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    const indexPath = path.join(frontendBuild, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend build index.html not found. Please run npm run build.');
    }
  } else {
    next();
  }
});

// 3. Scheduler: Run crawler automatically every 24 hours
const runCrawlerSilently = () => {
  const pythonPath = process.platform === 'win32'
    ? path.join(path.dirname(__dirname), 'venv', 'Scripts', 'python.exe')
    : path.join(path.dirname(__dirname), 'venv', 'bin', 'python');

  const cmd = fs.existsSync(pythonPath) ? pythonPath : 'python';
  
  console.log(`[Scheduler] Triggering daily crawler run...`);
  const child = spawn(cmd, [PYTHON_SCRIPT]);

  child.stdout.on('data', (data) => {
    console.log(`[Scheduler Scraper] ${data.toString().trim()}`);
  });

  child.on('close', async (code) => {
    console.log(`[Scheduler Scraper] Completed with exit code ${code}`);
    if (code === 0) {
      try {
        if (fs.existsSync(OPPORTUNITIES_FILE)) {
          const fileData = JSON.parse(fs.readFileSync(OPPORTUNITIES_FILE, 'utf-8'));
          await saveOpportunities(fileData);
          console.log(`[Scheduler Scraper] Synced crawled opportunities to MongoDB Atlas successfully.`);
        }
      } catch (err) {
        console.error(`[Scheduler Scraper] Failed to sync crawled opportunities: ${err.message}`);
      }
    }
  });
};

const DAILY_INTERVAL = 24 * 60 * 60 * 1000;
setInterval(runCrawlerSilently, DAILY_INTERVAL);

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Express Backend running on port ${PORT}`);
  console.log(`=========================================`);
});
