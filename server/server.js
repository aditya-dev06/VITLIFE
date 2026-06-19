import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MongoClient } from 'mongodb';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { rateLimit } from 'express-rate-limit';

// Force Node.js to prefer IPv4 over IPv6 to resolve connection unreachable errors on IPv4-only networks
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if present
const envPath = path.join(path.dirname(__dirname), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const firstEqual = trimmed.indexOf('=');
      if (firstEqual !== -1) {
        const key = trimmed.substring(0, firstEqual).trim();
        const val = trimmed.substring(firstEqual + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  });
}


const app = express();
const PORT = process.env.PORT || 5000;

// Trust Vercel's proxy for accurate client IP retrieval (express-rate-limit compliance)
app.set('trust proxy', 1);

app.use(compression());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url} - IP: ${req.ip} - Auth: ${req.headers.authorization || 'None'}`);
  const originalJson = res.json;
  res.json = function(body) {
    console.log(`[HTTP RESPONSE] ${req.method} ${req.url} -> Status: ${res.statusCode}`);
    return originalJson.call(this, body);
  };
  next();
});

// Rate Limiting configuration to prevent DDoS and brute-force (CodeQL Compliance)
const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 150 : 10000, // Limit each IP to 150 requests in prod, 10000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 15 : 1000, // Limit each IP to 15 auth requests in prod, 1000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api', apiLimiter);

const DATA_DIR = path.join(__dirname, 'data');
const OPPORTUNITIES_FILE = path.join(DATA_DIR, 'opportunities.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCRIPTS_DIR = path.join(path.dirname(__dirname), 'scripts');
const PYTHON_SCRIPT = path.join(SCRIPTS_DIR, 'fetch_opportunities.py');
const CLUBS_FILE = path.join(DATA_DIR, 'clubs.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const RECRUITMENTS_FILE = path.join(DATA_DIR, 'recruitments.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ACTIVITY_LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');

// Load Admin email dynamically from env or file config
let ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) {
  try {
    const configPath = path.join(DATA_DIR, 'admin_config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      ADMIN_EMAIL = config.adminEmail;
    }
  } catch (err) {
    console.error("Failed to load admin email from config:", err);
  }
}

const isAdminEmail = (email) => {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  if (ADMIN_EMAIL && cleanEmail === ADMIN_EMAIL.toLowerCase().trim()) return true;
  if (cleanEmail === 'aditya.25mip10104@vitbhopal.ac.in') return true;
  if (cleanEmail === 'aditya.dev.jp@gmail.com') return true;
  return false;
};

// Ensure database directories exist
if (!process.env.VERCEL) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("Could not create directories locally:", err.message);
  }
}

// Multer config for poster uploads (Using Memory Storage to support read-only Vercel environments)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max (matching frontend limit)
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images of type jpeg, jpg, png, or webp are allowed.'));
    }
  }
});

// Email Configuration (SMTP Transporter)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter = null;
if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
}

let smtpHealthy = transporter ? true : false;
let smtpError = null;
if (transporter) {
  transporter.verify()
    .then(() => {
      smtpHealthy = true;
      smtpError = null;
      console.log('✅ SMTP connection verified successfully.');
    })
    .catch((err) => {
      smtpError = err.message || String(err);
      console.warn('⚠️ SMTP connection verification failed on startup (will retry on actual send):', err.message);
      // Keep healthy so we don't preemptively block registration if SMTP is actually working (e.g. verify-probes blocked but sendMail works)
      smtpHealthy = true; 
    });
} else {
  console.warn('⚠️ Email service not configured. Registration and password reset will be unavailable.');
}

const sendMailHelper = async (to, subject, text) => {
  if (!smtpHealthy || !transporter) {
    throw new Error('Email service is currently unavailable. Please try again later.');
  }

  try {
    await transporter.sendMail({
      from: `"VIT Bhopal Opportunity Hub" <${smtpUser}>`,
      to,
      subject,
      text
    });
    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (err) {
    console.error("Nodemailer error sending to %s:", to, err);
    // Only set unhealthy on connection/auth errors
    const isConnectionOrAuthError = err.code === 'ECONNREFUSED' || err.code === 'EAUTH' || err.responseCode >= 500;
    if (isConnectionOrAuthError) {
      smtpHealthy = false;
    }
    throw new Error('Failed to send email. Please try again later.');
  }
};

const generateSecurityCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashSecurityCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

// Strict rate limiter to prevent brute force (5 attempts per IP + email combination every 15 minutes)
const rateLimitCache = new Map();
const authRateLimiter = (limit = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const ip = req.ip;
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const key = `${ip}:${email}`;
    const now = Date.now();
    
    if (rateLimitCache.has(key)) {
      const record = rateLimitCache.get(key);
      if (now - record.lastAttempt > windowMs) {
        rateLimitCache.set(key, { attempts: 1, lastAttempt: now });
      } else if (record.attempts >= limit) {
        const remainingMinutes = Math.ceil((windowMs - (now - record.lastAttempt)) / 60000);
        return res.status(429).json({ error: `Too many failed attempts. Please try again after ${remainingMinutes} minute(s).` });
      } else {
        record.attempts += 1;
        record.lastAttempt = now;
        rateLimitCache.set(key, record);
      }
    } else {
      rateLimitCache.set(key, { attempts: 1, lastAttempt: now });
    }
    next();
  };
};

// MongoDB Database Client Connection Setup
const MONGODB_URI = process.env.MONGODB_URI;
let db = null;
let client = null;
let dbConnectionError = null;
let dbConnectionStatus = "Initializing";
let dbConnectingPromise = null;

const ensureIndexes = async (database) => {
  try {
    await database.collection('uploads').createIndex({ filename: 1 }, { unique: true });
    await database.collection('users').createIndex({ email: 1 }, { unique: true });
    await database.collection('clubs').createIndex({ id: 1 }, { unique: true });
    await database.collection('events').createIndex({ id: 1 }, { unique: true });
    await database.collection('events').createIndex({ clubId: 1 });
    await database.collection('events').createIndex({ date: 1 });
    await database.collection('recruitments').createIndex({ id: 1 }, { unique: true });
    await database.collection('recruitments').createIndex({ clubId: 1 });
    console.log("✅ Database indexes verified/created successfully.");
  } catch (err) {
    console.error("❌ Failed to verify database indexes:", err.message);
  }
};

if (MONGODB_URI) {
  console.log("Connecting to MongoDB Atlas...");
  dbConnectionStatus = "Connecting";
  client = new MongoClient(MONGODB_URI);
  dbConnectingPromise = client.connect()
    .then(async c => {
      db = c.db();
      dbConnectionStatus = "Connected";
      dbConnectionError = null;
      console.log("Successfully connected to MongoDB Database!");
      ensureIndexes(db).catch(err => console.error("Index creation error:", err.message));

      // Zero-Delay Deployment: Fetch/Save persistent JWT secret from MongoDB if not provided via environment variables
      if (!process.env.JWT_SECRET) {
        try {
          const settingsColl = db.collection('settings');
          const doc = await settingsColl.findOne({ key: 'jwt_secret' });
          if (doc && doc.value) {
            JWT_SECRET = doc.value;
            console.log("🔒 Loaded persistent JWT_SECRET from MongoDB Atlas settings.");
          } else {
            const newSecret = crypto.randomBytes(64).toString('hex');
            await settingsColl.updateOne(
              { key: 'jwt_secret' },
              { $set: { value: newSecret } },
              { upsert: true }
            );
            JWT_SECRET = newSecret;
            console.log("🔒 Generated and saved new persistent JWT_SECRET in MongoDB Atlas settings.");
          }
        } catch (err) {
          console.warn("Could not retrieve persistent JWT_SECRET from settings collection:", err.message);
        }
      }
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
  console.warn("⚠️ WARNING: JWT_SECRET environment variable is not defined!");
  console.warn("In serverless/stateless environments like Vercel, a missing JWT_SECRET will cause users to be logged out randomly because each instance generates its own key.");
  console.warn("Please configure a persistent JWT_SECRET in your Vercel/environment variables.");
  if (fs.existsSync(SECRET_FILE)) {
    JWT_SECRET = fs.readFileSync(SECRET_FILE, 'utf8').trim();
  } else {
    JWT_SECRET = crypto.randomBytes(64).toString('hex');
    try {
      fs.writeFileSync(SECRET_FILE, JWT_SECRET, 'utf8');
    } catch (err) {
      console.warn("Could not save persistent secret key to disk fallback:", err.message);
    }
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
  try {
    fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(seeds, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save initial seeds to disk fallback:", err.message);
  }
};

if (!fs.existsSync(OPPORTUNITIES_FILE)) {
  writeInitialSeeds();
}

// User helper functions (local file fallback fallback)
const loadUsers = () => {
  if (!fs.existsSync(USERS_FILE)) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    } catch (err) {
      console.warn("Could not create empty users file fallback:", err.message);
    }
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save users to disk fallback:", err.message);
  }
};

// Database interface methods
const findUserByEmail = async (email) => {
  if (typeof email !== 'string') return null;
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
  if (typeof email !== 'string') return;
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
      return;
    } catch (err) {
      console.error("MongoDB saveOpportunities error:", err);
    }
  }
  try {
    fs.writeFileSync(OPPORTUNITIES_FILE, JSON.stringify(opportunitiesData, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save opportunities to disk fallback:", err.message);
  }
};

// ========== CLUBS HELPERS ==========
const getClubs = async () => {
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const clubs = await db.collection('clubs').find({}).toArray();
      if (clubs && clubs.length > 0) return clubs;
    } catch (err) {
      console.error("MongoDB getClubs error, falling back to file:", err);
    }
  }
  if (!fs.existsSync(CLUBS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8'));
    return data.clubs || [];
  } catch (e) { return []; }
};

const saveClubs = async (clubs) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      for (const club of clubs) {
        await db.collection('clubs').updateOne(
          { id: club.id },
          { $set: club },
          { upsert: true }
        );
      }
      return;
    } catch (err) {
      console.error("MongoDB saveClubs error, falling back to file:", err);
    }
  }
  try {
    fs.writeFileSync(CLUBS_FILE, JSON.stringify({ clubs }, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save clubs to disk fallback:", err.message);
  }
};

const deleteClub = async (clubId) => {
  if (typeof clubId !== 'string') return;
  // Delete from MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('clubs').deleteOne({ id: clubId });
      await db.collection('users').updateMany({ clubId: clubId }, { $set: { role: 'student' }, $unset: { clubId: "" } });
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB deleteClub error:", err);
    }
  }

  // Fallback to local files
  if (fs.existsSync(CLUBS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(CLUBS_FILE, 'utf-8'));
      fileData.clubs = (fileData.clubs || []).filter(c => c.id !== clubId);
      fs.writeFileSync(CLUBS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch(e) {}
  }

  // Demote managers in local users file
  try {
    const users = loadUsers();
    let updated = false;
    for (const email in users) {
      if (users[email].clubId === clubId) {
        users[email].role = 'student';
        delete users[email].clubId;
        updated = true;
      }
    }
    if (updated) {
      saveUsers(users);
    }
  } catch(e) {}
};


// ========== EVENTS HELPERS ==========
const getEvents = async (categoryFilter) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  let events = [];
  if (db) {
    try {
      const category = (typeof categoryFilter === 'string') ? categoryFilter : null;
      const query = category ? { category } : {};
      events = await db.collection('events').find(query).sort({ date: 1 }).toArray();
      if (events.length > 0) return events;
    } catch (err) {
      console.error("MongoDB getEvents error, falling back to file:", err);
    }
  }
  if (!fs.existsSync(EVENTS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    events = data.events || [];
    if (categoryFilter) events = events.filter(e => e.category === categoryFilter);
    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (e) { return []; }
};

const saveEvent = async (eventData) => {
  // Sync to MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('events').insertOne(eventData);
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB saveEvent error:", err);
    }
  }

  // Fallback to local file
  let fileData = { events: [] };
  if (fs.existsSync(EVENTS_FILE)) {
    try { fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8')); } catch(e) {}
  }
  fileData.events.push(eventData);
  try {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save event to disk fallback:", err.message);
  }
};

const deleteEvent = async (eventId) => {
  if (typeof eventId !== 'string') return;
  // Delete from MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('events').deleteOne({ id: eventId });
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB deleteEvent error:", err);
    }
  }

  // Fallback to local file
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      fileData.events = (fileData.events || []).filter(e => e.id !== eventId);
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch(e) {}
  }
};

const updateEvent = async (eventId, updatedData) => {
  if (typeof eventId !== 'string') return;
  // Update in MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('events').updateOne({ id: eventId }, { $set: updatedData });
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB updateEvent error:", err);
    }
  }

  // Fallback to local file
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      const idx = (fileData.events || []).findIndex(e => e.id === eventId);
      if (idx !== -1) {
        fileData.events[idx] = { ...fileData.events[idx], ...updatedData };
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
      }
    } catch(e) {}
  }
};

const deleteExpiredEvents = async () => {
  try {
    const now = new Date();
    let eventsList = [];
    
    if (dbConnectingPromise) await dbConnectingPromise;
    if (db) {
      eventsList = await db.collection('events').find({}).toArray();
    } else if (fs.existsSync(EVENTS_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
        eventsList = data.events || [];
      } catch (e) {}
    }

    const expiredEvents = eventsList.filter(event => {
      if (event.eventEndDateTime) {
        return now > new Date(event.eventEndDateTime);
      }
      if (event.eventStartDateTime) {
        const start = new Date(event.eventStartDateTime);
        start.setHours(start.getHours() + 2); // Default to 2-hour duration
        return now > start;
      }
      if (event.date) {
        let eventDate = new Date(event.date);
        if (event.time) {
          const timeParts = event.time.match(/(\d+):(\d+)/);
          if (timeParts) {
            eventDate.setHours(parseInt(timeParts[1], 10), parseInt(timeParts[2], 10), 0, 0);
          } else {
            eventDate.setHours(23, 59, 59, 999);
          }
        } else {
          eventDate.setHours(23, 59, 59, 999);
        }
        return now > eventDate;
      }
      return false;
    });

    for (const event of expiredEvents) {
      console.log(`Auto-deleting expired event: ${event.title} (ID: ${event.id})`);
      await deleteEvent(event.id);
      
      // Clear associated base64 image data from the 'uploads' collection
      if (db) {
        const cleanPosterUrls = [event.posterUrl, ...(event.posterUrls || [])].filter(Boolean);
        for (const pUrl of cleanPosterUrls) {
          if (pUrl.startsWith('/uploads/')) {
            const filename = pUrl.replace('/uploads/', '');
            await db.collection('uploads').deleteOne({ filename });
            // Local fallback delete
            const filePath = path.join(UPLOADS_DIR, filename);
            if (fs.existsSync(filePath)) {
              try { fs.unlinkSync(filePath); } catch (e) {}
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Auto-delete expired events failed:", err.message);
  }
};

// ========== RECRUITMENTS HELPERS ==========
const getRecruitments = async () => {
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const recs = await db.collection('recruitments').find({}).sort({ deadline: 1 }).toArray();
      if (recs.length > 0) return recs;
    } catch (err) {
      console.error("MongoDB getRecruitments error, falling back to file:", err);
    }
  }
  if (!fs.existsSync(RECRUITMENTS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(RECRUITMENTS_FILE, 'utf-8'));
    return data.recruitments || [];
  } catch (e) { return []; }
};

const saveRecruitment = async (recData) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('recruitments').insertOne(recData);
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB saveRecruitment error:", err);
    }
  }

  // Fallback to local file
  let fileData = { recruitments: [] };
  if (fs.existsSync(RECRUITMENTS_FILE)) {
    try { fileData = JSON.parse(fs.readFileSync(RECRUITMENTS_FILE, 'utf-8')); } catch(e) {}
  }
  fileData.recruitments.push(recData);
  try {
    fs.writeFileSync(RECRUITMENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save recruitment to disk fallback:", err.message);
  }
};

const deleteRecruitment = async (recId) => {
  if (typeof recId !== 'string') return;
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('recruitments').deleteOne({ id: recId });
      return; // Return early if MongoDB succeeds
    } catch (err) {
      console.error("MongoDB deleteRecruitment error:", err);
    }
  }

  // Fallback to local file
  if (fs.existsSync(RECRUITMENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(RECRUITMENTS_FILE, 'utf-8'));
      fileData.recruitments = (fileData.recruitments || []).filter(r => r.id !== recId);
      fs.writeFileSync(RECRUITMENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch(e) {}
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
      } else {
        program = `B.Tech/M.Tech (${code}) Student`;
      }
    }
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

// Custom Session Token generation and validation (with password hash segement for session revocation)
const generateToken = (email, passwordHash) => {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const hmac = crypto.createHmac('sha256', JWT_SECRET);
  const hashPiece = passwordHash.substring(0, 10);
  hmac.update(`${email}:${expiresAt}:${hashPiece}`);
  const signature = hmac.digest('hex');
  const base64Email = Buffer.from(email).toString('base64');
  return `${signature}.${base64Email}.${expiresAt}`;
};

const verifyToken = async (token) => {
  if (typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [signature, base64Email, expiresAtStr] = parts;
    const email = Buffer.from(base64Email, 'base64').toString('utf-8');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) return null;

    const user = await findUserByEmail(email);
    if (!user) return null;

    const hmac = crypto.createHmac('sha256', JWT_SECRET);
    const hashPiece = user.passwordHash.substring(0, 10);
    hmac.update(`${email}:${expiresAt}:${hashPiece}`);
    const expectedSignature = hmac.digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return user;
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
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  req.user = user;
  next();
};


// Role-based access middleware
const requireClubManager = (req, res, next) => {
  if (!req.user || (req.user.role !== 'club_manager' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied. Club Manager role required.' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }
  next();
};

const logActivity = async (email, action, req) => {
  const logEntry = {
    email: email || 'anonymous',
    action,
    ip: req ? req.ip : 'unknown',
    userAgent: (req && req.headers) ? req.headers['user-agent'] : 'unknown',
    timestamp: new Date().toISOString()
  };
  console.log(`[Activity Log] ${logEntry.email} - ${logEntry.action} - IP: ${logEntry.ip}`);

  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('activity_logs').insertOne(logEntry);
      return;
    } catch (err) {
      console.error("MongoDB logActivity error, falling back to file:", err);
    }
  }

  // Fallback to local file
  try {
    let logs = [];
    if (fs.existsSync(ACTIVITY_LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(ACTIVITY_LOGS_FILE, 'utf-8'));
    }
    logs.push(logEntry);
    fs.writeFileSync(ACTIVITY_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not save activity log to disk fallback:", err.message);
  }
};


// Migration: ensure existing admin user has role set
(async () => {
  if (dbConnectingPromise) await dbConnectingPromise;
  const adminEmails = [ADMIN_EMAIL, 'aditya.25mip10104@vitbhopal.ac.in', 'aditya.dev.jp@gmail.com'].filter(Boolean);
  for (const email of adminEmails) {
    const adminUser = await findUserByEmail(email);
    if (adminUser && adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      await saveUser(email, adminUser);
      console.log(`Migrated admin user role for ${email}.`);
    }
  }
})();

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

// 1. Register User (with email verification support & unverified recycling)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    if (!smtpHealthy) {
      return res.status(503).json({ error: '🔧 Registration is temporarily unavailable due to maintenance. Please try again later.' });
    }
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
    if (existingUser && existingUser.verified !== false) {
      return res.status(400).json({ error: 'User already exists with this email.' });
    }

    // Hash password securely with dynamic salt
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    // Generate secure 6-digit verification code
    const rawCode = generateSecurityCode();
    const hashedCode = hashSecurityCode(rawCode);
    const codeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

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
      skillsProgress: {},
      role: isAdminEmail(lowerEmail) ? 'admin' : 'student',
      verified: false,
      verificationCode: hashedCode,
      verificationExpires: codeExpires,
      lastCodeSentAt: Date.now(),
      createdAt: new Date().toISOString()
    };

    await saveUser(lowerEmail, newUser);
    await logActivity(lowerEmail, 'register_request', req);



    // Send email or fallback to console log
    // Await email sending to ensure it completes in serverless environments
    try {
      await sendMailHelper(
        lowerEmail,
        'VIT Bhopal Opportunity Hub - Email Verification Code',
        `Hello ${name.trim()},\n\nThank you for registering. Your verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`
      );
      console.log(`Verification email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
      console.log(`TO: ${lowerEmail}`);
      console.log(`SUBJECT: VIT Bhopal Opportunity Hub - Email Verification Code`);
      console.log(`Your verification code is: ${rawCode}`);
      console.log(`================================================================`);
    }

    res.json({ success: true, message: 'Verification code sent.', email: lowerEmail });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error: ' + error.message });
  }
});

// Verification Endpoint
app.post('/api/auth/verify', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ error: 'Account is already verified.' });
    }

    const hashedInput = hashSecurityCode(code.trim());
    if (user.verificationCode !== hashedInput || Date.now() > user.verificationExpires) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Verify account
    user.verified = true;
    delete user.verificationCode;
    delete user.verificationExpires;
    delete user.lastCodeSentAt;

    await saveUser(lowerEmail, user);
    await logActivity(lowerEmail, 'email_verified', req);

    const token = generateToken(lowerEmail, user.passwordHash);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed: ' + error.message });
  }
});

// Resend Verification Code Endpoint
app.post('/api/auth/resend-code', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    if (!smtpHealthy) {
      return res.status(503).json({ error: '🔧 Email service is temporarily unavailable. Please try again later.' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.verified) {
      return res.status(400).json({ error: 'Account is already verified.' });
    }



    // 60-second cooldown gate
    const now = Date.now();
    if (user.lastCodeSentAt && now - user.lastCodeSentAt < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - user.lastCodeSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec} second(s) before requesting another code.` });
    }

    const rawCode = generateSecurityCode();
    const hashedCode = hashSecurityCode(rawCode);

    user.verificationCode = hashedCode;
    user.verificationExpires = now + 15 * 60 * 1000;
    user.lastCodeSentAt = now;

    await saveUser(lowerEmail, user);

    // Await email sending to ensure it completes in serverless environments
    try {
      await sendMailHelper(
        lowerEmail,
        'VIT Bhopal Opportunity Hub - Resend Verification Code',
        `Hello ${user.name},\n\nYour new verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`
      );
      console.log(`Resend verification email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background resend email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
      console.log(`TO: ${lowerEmail}`);
      console.log(`SUBJECT: VIT Bhopal Opportunity Hub - Resend Verification Code`);
      console.log(`Your verification code is: ${rawCode}`);
      console.log(`================================================================`);
    }

    res.json({ success: true, message: 'New verification code sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend code: ' + error.message });
  }
});

// 2. Login User (with verified checking)
app.post('/api/auth/login', authLimiter, async (req, res) => {
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

    // Strict Lockout for Unverified Logins
    if (user.verified === false) {
      return res.status(400).json({
        error: 'Email not verified.',
        unverified: true,
        email: lowerEmail
      });
    }

    // Ensure admin email always gets admin role
    if (isAdminEmail(lowerEmail) && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Dynamic program update on login
    if (user.isVitBhopal) {
      const parsed = parseVitBhopalEmail(lowerEmail);
      if (parsed && user.program !== parsed.program) {
        user.program = parsed.program;
      }
    }

    await saveUser(lowerEmail, user);
    await logActivity(lowerEmail, 'login', req);

    const token = generateToken(lowerEmail, user.passwordHash);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Server authentication error: ' + error.message });
  }
});

// 2b. Demo Login Route for local testing
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const { type } = req.body;
    let email = '';
    let name = '';
    let isVitBhopal = false;
    let program = '';
    let courses = [];
    let semester = '1';
    let role = 'student';

    if (type === 'student') {
      email = 'demo.student@vitbhopal.ac.in';
      name = 'Demo VIT Student';
      isVitBhopal = true;
      program = 'Integrated M.Tech CSE (Computational & Data Science)';
      courses = ['DSA', 'DBMS', 'Linear Algebra'];
      semester = '3';
      role = 'student';
    } else if (type === 'global') {
      email = 'demo.global@gmail.com';
      name = 'Demo Global User';
      isVitBhopal = false;
      semester = '0';
      role = 'user';
    } else {
      return res.status(400).json({ error: 'Invalid demo user type.' });
    }

    // Check if user already exists
    let user = await findUserByEmail(email);
    if (!user) {
      // Create user
      user = {
        name,
        isVitBhopal,
        semester,
        courses,
        program,
        verified: true,
        role,
        skillsProgress: {},
        passwordHash: 'dummyhash',
        salt: 'dummysalt',
        createdAt: new Date().toISOString()
      };
      await saveUser(email, user);
    } else {
      // Ensure the existing user is verified for testing
      user.verified = true;
      await saveUser(email, user);
    }

    await logActivity(email, 'demo-login', req);

    const token = generateToken(email, user.passwordHash);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Demo authentication error: ' + error.message });
  }
});

// Forgot Password Request Endpoint
app.post('/api/auth/forgot-password', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    if (!smtpHealthy) {
      return res.status(503).json({ error: '🔧 Password reset is temporarily unavailable due to maintenance. Please try again later.' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);

    // Prevents Account Harvesting by returning generic success even if user not found
    const genericSuccessResponse = { success: true, message: 'If an account with that email exists, a reset code has been sent.' };

    if (!user) {
      return res.json(genericSuccessResponse);
    }

    // Cooldown gate (60 seconds)
    const now = Date.now();
    if (user.lastResetSentAt && now - user.lastResetSentAt < 60 * 1000) {
      const waitSec = Math.ceil((60 * 1000 - (now - user.lastResetSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSec} second(s) before requesting another reset code.` });
    }

    const rawCode = generateSecurityCode();
    const hashedCode = hashSecurityCode(rawCode);

    user.resetCode = hashedCode;
    user.resetExpires = now + 15 * 60 * 1000;
    user.lastResetSentAt = now;

    await saveUser(lowerEmail, user);

    // Await email sending to ensure it completes in serverless environments
    try {
      await sendMailHelper(
        lowerEmail,
        'VIT Bhopal Opportunity Hub - Password Reset Code',
        `Hello ${user.name},\n\nWe received a request to reset your password. Your password reset code is: ${rawCode}\n\nThis code is valid for 15 minutes. If you did not request this, please ignore this email.`
      );
      console.log(`Password reset email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background reset email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
      console.log(`TO: ${lowerEmail}`);
      console.log(`SUBJECT: VIT Bhopal Opportunity Hub - Password Reset Code`);
      console.log(`Your verification code is: ${rawCode}`);
      console.log(`================================================================`);
    }

    res.json(genericSuccessResponse);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Reset Password Execution Endpoint
app.post('/api/auth/reset-password', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.resetCode || !user.resetExpires) {
      return res.status(400).json({ error: 'No active password reset request found.' });
    }

    const hashedInput = hashSecurityCode(code.trim());
    if (user.resetCode !== hashedInput || Date.now() > user.resetExpires) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    // Cryptographically secure password update
    const salt = generateSalt();
    const passwordHash = hashPassword(newPassword, salt);

    user.passwordHash = passwordHash;
    user.salt = salt;
    user.verified = true; // Auto-verify email upon proving mailbox ownership

    // Clear reset and verification credentials
    delete user.resetCode;
    delete user.resetExpires;
    delete user.lastResetSentAt;
    delete user.verificationCode;
    delete user.verificationExpires;
    delete user.lastCodeSentAt;

    await saveUser(lowerEmail, user);
    res.json({ success: true, message: 'Password reset successful. You can now sign in with your new password.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password: ' + error.message });
  }
});

// 3. Get User Profile Progress
app.get('/api/user/profile', authenticate, async (req, res) => {
  const userProfile = { ...req.user };
  if (userProfile.isVitBhopal) {
    const parsed = parseVitBhopalEmail(userProfile.email);
    if (parsed && userProfile.program !== parsed.program) {
      userProfile.program = parsed.program;
      const user = await findUserByEmail(userProfile.email);
      if (user) {
        user.program = parsed.program;
        await saveUser(userProfile.email, user);
      }
    }
  }
  delete userProfile.passwordHash;
  delete userProfile.salt;
  res.json(userProfile);
});

// 4. Update User Profile Progress / Stats
app.post('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, xpPoints, skillsProgress, courses, semester } = req.body;
    const user = await findUserByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty.' });
      }
      user.name = name.trim();
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
    await logActivity(req.user.email, 'update_profile', req);

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
      const user = await verifyToken(token);
      if (user) {
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

  if (process.env.VERCEL) {
    res.write("STATUS_FAILED: Scraper daemon is not supported in the serverless production environment. Please run the research scraper in your local development environment.\n");
    res.end();
    return;
  }

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

// ================= CAMPUS LIFE ROUTES =================

// URL validation helper (XSS Prevention: only HTTP/HTTPS or local uploads)
const isValidHttpUrl = (str) => {
  if (!str) return true; // optional links are fine if empty
  if (str.startsWith('/uploads/')) return true;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

// --- CLUBS ---
app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await getClubs();
    res.json({ clubs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clubs: ' + error.message });
  }
});

app.get('/api/clubs/:id', async (req, res) => {
  try {
    const clubs = await getClubs();
    const club = clubs.find(c => c.id === req.params.id);
    if (!club) return res.status(404).json({ error: 'Club not found.' });
    const events = await getEvents();
    const recruitments = await getRecruitments();
    res.json({
      club,
      events: events.filter(e => e.clubId === club.id),
      recruitments: recruitments.filter(r => r.clubId === club.id)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch club: ' + error.message });
  }
});

app.put('/api/clubs/:id', authenticate, requireClubManager, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, icon, memberCount, socialLinks, category } = req.body;

    if (req.user.role !== 'admin' && req.user.clubId !== id) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to edit this club.' });
    }

    const clubs = await getClubs();
    const clubIndex = clubs.findIndex(c => c.id === id);
    if (clubIndex === -1) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    const club = clubs[clubIndex];

    if (icon && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/uploads/'))) {
      if (!isValidHttpUrl(icon)) {
        return res.status(400).json({ error: 'Invalid icon URL protocol. Only HTTP/HTTPS or local uploads allowed.' });
      }
    }

    if (description !== undefined) club.description = description;
    if (icon !== undefined) club.icon = icon;
    if (category !== undefined) {
      if (!category.trim()) {
        return res.status(400).json({ error: 'Club category cannot be empty.' });
      }
      club.category = category.trim();
    }
    if (memberCount !== undefined) {
      const parsedCount = parseInt(memberCount, 10);
      if (isNaN(parsedCount) || parsedCount < 0) {
        return res.status(400).json({ error: 'Active members count must be a non-negative integer.' });
      }
      club.memberCount = parsedCount;
    }
    if (socialLinks !== undefined) {
      club.socialLinks = {
        instagram: socialLinks.instagram || '',
        linkedin: socialLinks.linkedin || ''
      };
    }

    clubs[clubIndex] = club;
    await saveClubs(clubs);
    await logActivity(req.user.email, `edit_club: ${id}`, req);

    res.json({ success: true, message: 'Club updated successfully.', club });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update club: ' + error.message });
  }
});

app.post('/api/clubs', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, category, description, icon, socialLinks } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Club name is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Club category is required.' });
    }

    const clubs = await getClubs();
    const cleanName = name.trim();
    const baseId = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let clubId = `club-${baseId}`;
    
    // De-duplicate if ID already exists
    let counter = 1;
    while (clubs.some(c => c.id === clubId)) {
      clubId = `club-${baseId}-${counter}`;
      counter++;
    }

    const newClub = {
      id: clubId,
      name: cleanName,
      category: category.trim(),
      description: (description || '').trim(),
      icon: (icon || '🏛️').trim(),
      memberCount: 0,
      socialLinks: {
        instagram: (socialLinks?.instagram || '').trim(),
        linkedin: (socialLinks?.linkedin || '').trim()
      }
    };

    clubs.push(newClub);
    await saveClubs(clubs);
    await logActivity(req.user.email, `create_club: ${clubId}`, req);

    res.json({ success: true, message: 'Club created successfully.', club: newClub });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create club: ' + error.message });
  }
});

app.delete('/api/clubs/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const clubs = await getClubs();
    const club = clubs.find(c => c.id === id);
    if (!club) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    await deleteClub(id);
    await logActivity(req.user.email, `delete_club: ${id}`, req);
    res.json({ success: true, message: 'Club deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete club: ' + error.message });
  }
});

// GET club managers / leaders and their designations
app.get('/api/clubs/:id/managers', async (req, res) => {
  try {
    const { id } = req.params;
    let managers = [];
    if (dbConnectingPromise) await dbConnectingPromise;
    if (db) {
      try {
        const dbUsers = await db.collection('users').find({ role: 'club_manager', clubId: id }).toArray();
        managers = dbUsers.map(u => ({ name: u.name, email: u.email, role: u.role, clubId: u.clubId }));
      } catch (err) {
        console.error("MongoDB get club managers error:", err);
      }
    }
    if (managers.length === 0) {
      const localUsers = loadUsers();
      managers = Object.values(localUsers)
        .filter(u => u.role === 'club_manager' && u.clubId === id)
        .map(u => ({ name: u.name, email: u.email, role: u.role, clubId: u.clubId }));
    }
    res.json({ managers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch club managers: ' + error.message });
  }
});


// --- EVENTS ---
app.get('/api/events', async (req, res) => {
  try {
    await deleteExpiredEvents();
    const category = req.query.category || null;
    const events = await getEvents(category);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events: ' + error.message });
  }
});

app.post('/api/events', authenticate, requireClubManager, async (req, res) => {
  try {
    const { title, description, clubId, clubName, category, date, time, venue, posterUrl, posterUrls, schedulePosterUrl, registrationLink, tags, registrationDeadline, eventStartDateTime, eventEndDateTime, price } = req.body;
    if (!title || !clubId || !category || !date) {
      return res.status(400).json({ error: 'Title, clubId, category, and date are required.' });
    }
    // Chronological Date Validation
    if (eventStartDateTime && eventEndDateTime && new Date(eventEndDateTime) < new Date(eventStartDateTime)) {
      return res.status(400).json({ error: 'Event end date/time must be after the start date/time.' });
    }
    if (registrationDeadline && eventStartDateTime && new Date(registrationDeadline) > new Date(eventStartDateTime)) {
      return res.status(400).json({ error: 'Registration deadline must be before the event starts.' });
    }
    // Cross-Club Modification Defense
    if (req.user.role !== 'admin' && clubId !== req.user.clubId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to create events for this club.' });
    }
    // URL Protocol Sanitization (XSS Defense)
    if (posterUrl && !isValidHttpUrl(posterUrl)) {
      return res.status(400).json({ error: 'Invalid poster URL protocol. Only HTTP/HTTPS is allowed.' });
    }
    if (posterUrls && Array.isArray(posterUrls)) {
      for (const url of posterUrls) {
        if (url && !isValidHttpUrl(url)) {
          return res.status(400).json({ error: 'Invalid poster URL protocol in list. Only HTTP/HTTPS is allowed.' });
        }
      }
    }
    if (schedulePosterUrl && !isValidHttpUrl(schedulePosterUrl)) {
      return res.status(400).json({ error: 'Invalid schedule poster URL protocol. Only HTTP/HTTPS is allowed.' });
    }
    if (registrationLink && !isValidHttpUrl(registrationLink)) {
      return res.status(400).json({ error: 'Invalid registration link protocol. Only HTTP/HTTPS is allowed.' });
    }

    const eventData = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title, description: description || '', clubId, clubName: clubName || '',
      category, date, time: time || '', venue: venue || '',
      posterUrl: posterUrl || (posterUrls && posterUrls[0]) || '',
      posterUrls: Array.isArray(posterUrls) ? posterUrls : (posterUrl ? [posterUrl] : []),
      schedulePosterUrl: schedulePosterUrl || '',
      registrationLink: registrationLink || '',
      tags: Array.isArray(tags) ? tags : [],
      registrationDeadline: registrationDeadline || '',
      eventStartDateTime: eventStartDateTime || '',
      eventEndDateTime: eventEndDateTime || '',
      price: price || '',
      createdBy: req.user.email,
      createdAt: new Date().toISOString()
    };
    await saveEvent(eventData);
    await logActivity(req.user.email, `create_event: ${eventData.id}`, req);
    res.json({ success: true, event: eventData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event: ' + error.message });
  }
});

app.delete('/api/events/:id', authenticate, async (req, res) => {
  try {
    const events = await getEvents();
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    
    // Broken Object Level Authorization (IDOR) check: Admin OR Club Manager OR Creator
    const isAuthorized = req.user.role === 'admin' || 
                         (req.user.role === 'club_manager' && req.user.clubId === event.clubId) ||
                         (event.createdBy === req.user.email);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this event.' });
    }
    
    await deleteEvent(req.params.id);
    await logActivity(req.user.email, `delete_event: ${req.params.id}`, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event: ' + error.message });
  }
});

app.put('/api/events/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const events = await getEvents();
    const event = events.find(e => e.id === id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Authorization check: Admin OR Club Manager of the host club OR Event Creator
    const isAuthorized = req.user.role === 'admin' || 
                         (req.user.role === 'club_manager' && req.user.clubId === event.clubId) ||
                         (event.createdBy === req.user.email);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to edit this event.' });
    }

    const { title, description, category, date, time, venue, posterUrl, posterUrls, schedulePosterUrl, registrationLink, tags, registrationDeadline, eventStartDateTime, eventEndDateTime, price } = req.body;

    if (!title || !category || !date) {
      return res.status(400).json({ error: 'Title, category, and date are required.' });
    }

    // Chronological Date Validation
    if (eventStartDateTime && eventEndDateTime && new Date(eventEndDateTime) < new Date(eventStartDateTime)) {
      return res.status(400).json({ error: 'Event end date/time must be after the start date/time.' });
    }
    if (registrationDeadline && eventStartDateTime && new Date(registrationDeadline) > new Date(eventStartDateTime)) {
      return res.status(400).json({ error: 'Registration deadline must be before the event starts.' });
    }

    // URL Protocol Sanitization (XSS Defense)
    if (posterUrl && !isValidHttpUrl(posterUrl)) {
      return res.status(400).json({ error: 'Invalid poster URL protocol. Only HTTP/HTTPS is allowed.' });
    }
    if (posterUrls && Array.isArray(posterUrls)) {
      for (const url of posterUrls) {
        if (url && !isValidHttpUrl(url)) {
          return res.status(400).json({ error: 'Invalid poster URL protocol in list. Only HTTP/HTTPS is allowed.' });
        }
      }
    }
    if (schedulePosterUrl && !isValidHttpUrl(schedulePosterUrl)) {
      return res.status(400).json({ error: 'Invalid schedule poster URL protocol. Only HTTP/HTTPS is allowed.' });
    }
    if (registrationLink && !isValidHttpUrl(registrationLink)) {
      return res.status(400).json({ error: 'Invalid registration link protocol. Only HTTP/HTTPS is allowed.' });
    }

    const updatedData = {
      title,
      description: description || '',
      category,
      date,
      time: time || '',
      venue: venue || '',
      posterUrl: posterUrl || (posterUrls && posterUrls[0]) || '',
      posterUrls: Array.isArray(posterUrls) ? posterUrls : (posterUrl ? [posterUrl] : []),
      schedulePosterUrl: schedulePosterUrl || '',
      registrationLink: registrationLink || '',
      tags: Array.isArray(tags) ? tags : [],
      registrationDeadline: registrationDeadline || '',
      eventStartDateTime: eventStartDateTime || '',
      eventEndDateTime: eventEndDateTime || '',
      price: price || ''
    };

    await updateEvent(id, updatedData);
    await logActivity(req.user.email, `edit_event: ${id}`, req);

    res.json({ success: true, event: { ...event, ...updatedData } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event: ' + error.message });
  }
});

// Admin pin/promote route
app.put('/api/events/:id/pin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { pinned } = req.body;
    
    const events = await getEvents();
    const event = events.find(e => e.id === id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    
    await updateEvent(id, { pinned: !!pinned });
    await logActivity(req.user.email, `${pinned ? 'pin_event' : 'unpin_event'}: ${id}`, req);
    res.json({ success: true, message: `Event ${pinned ? 'pinned' : 'unpinned'} successfully.` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to pin event: ' + error.message });
  }
});

// --- RECRUITMENTS ---
app.get('/api/recruitments', async (req, res) => {
  try {
    const recruitments = await getRecruitments();
    res.json({ recruitments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recruitments: ' + error.message });
  }
});

app.post('/api/recruitments', authenticate, requireClubManager, async (req, res) => {
  try {
    const { clubId, clubName, title, positions, description, eligibility, deadline, applicationLink } = req.body;
    if (!clubId || !title || !deadline) {
      return res.status(400).json({ error: 'clubId, title, and deadline are required.' });
    }
    // Cross-Club Modification Defense
    if (req.user.role !== 'admin' && clubId !== req.user.clubId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to create recruitments for this club.' });
    }
    // URL Protocol Sanitization (XSS Defense)
    if (applicationLink && !isValidHttpUrl(applicationLink)) {
      return res.status(400).json({ error: 'Invalid application link protocol. Only HTTP/HTTPS is allowed.' });
    }

    const recData = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubId, clubName: clubName || '', title,
      positions: Array.isArray(positions) ? positions : [],
      description: description || '', eligibility: eligibility || '',
      deadline, applicationLink: applicationLink || '',
      createdBy: req.user.email,
      createdAt: new Date().toISOString()
    };
    await saveRecruitment(recData);
    await logActivity(req.user.email, `create_recruitment: ${recData.id}`, req);
    res.json({ success: true, recruitment: recData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create recruitment: ' + error.message });
  }
});

app.delete('/api/recruitments/:id', authenticate, async (req, res) => {
  try {
    const recruitments = await getRecruitments();
    const rec = recruitments.find(r => r.id === req.params.id);
    if (!rec) return res.status(404).json({ error: 'Recruitment not found.' });
    
    // Broken Object Level Authorization (IDOR) check
    if (req.user.role !== 'admin' && (req.user.role !== 'club_manager' || req.user.clubId !== rec.clubId)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this recruitment.' });
    }
    
    await deleteRecruitment(req.params.id);
    await logActivity(req.user.email, `delete_recruitment: ${req.params.id}`, req);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recruitment: ' + error.message });
  }
});

// SMTP Health Check Endpoint
app.get('/api/health/smtp', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  if (!smtpHealthy && transporter) {
    try {
      await transporter.verify();
      smtpHealthy = true;
      smtpError = null;
      console.log('✅ SMTP connection dynamically recovered and verified.');
    } catch (err) {
      smtpError = err.message || String(err);
    }
  }

  res.json({
    smtpHealthy,
    smtpError,
    smtpHost: process.env.SMTP_HOST || null,
    smtpPort: process.env.SMTP_PORT || null,
    smtpUser: process.env.SMTP_USER || null,
    hasPass: !!process.env.SMTP_PASS
  });
});


// --- FILE UPLOAD ---
app.post('/api/upload', authenticate, requireClubManager, (req, res) => {
  upload.single('poster')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
    const base64Data = req.file.buffer.toString('base64');

    if (dbConnectingPromise) await dbConnectingPromise;
    if (db) {
      try {
        await db.collection('uploads').insertOne({
          filename: uniqueName,
          contentType: req.file.mimetype,
          data: base64Data,
          uploadDate: new Date()
        });
        return res.json({ success: true, url: `/uploads/${uniqueName}` });
      } catch (dbErr) {
        console.error("MongoDB Atlas upload failed, attempting local fallback:", dbErr);
      }
    }

    // Local fallback: write to disk if MongoDB is down or not configured (e.g. local dev)
    try {
      const filePath = path.join(UPLOADS_DIR, uniqueName);
      await fs.promises.writeFile(filePath, req.file.buffer);
      res.json({ success: true, url: `/uploads/${uniqueName}` });
    } catch (fsErr) {
      console.error("Local fallback upload failed:", fsErr);
      res.status(500).json({ error: 'Failed to save upload locally.' });
    }
  });
});

// --- ADMIN ROUTES ---
app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  try {
    if (dbConnectingPromise) await dbConnectingPromise;
    let users = [];
    if (db) {
      try {
        users = await db.collection('users').find({}, {
          projection: { name: 1, email: 1, role: 1, clubId: 1, registrationNumber: 1, program: 1, _id: 0 }
        }).toArray();
      } catch (err) {
        console.error("MongoDB admin/users error:", err);
      }
    }
    if (users.length === 0) {
      const localUsers = loadUsers();
      users = Object.values(localUsers).map(u => ({
        name: u.name, email: u.email, role: u.role || 'student',
        clubId: u.clubId || null, registrationNumber: u.registrationNumber || '', program: u.program || ''
      }));
    }
    
    const usersWithFlag = users.map(u => ({
      ...u,
      isPrimaryAdmin: isAdminEmail(u.email)
    }));
    
    res.json({ users: usersWithFlag });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

app.post('/api/admin/promote', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, role, clubId } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }
    if (role !== 'admin' && role !== 'club_manager') {
      return res.status(400).json({ error: 'Invalid role. Must be admin or club_manager.' });
    }
    if (role === 'club_manager' && !clubId) {
      return res.status(400).json({ error: 'clubId is required for club_manager promotion.' });
    }
    
    const targetUser = await findUserByEmail(email);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Safeguards
    if (isAdminEmail(targetUser.email)) {
      return res.status(400).json({ error: 'Cannot modify primary admin role.' });
    }
    if (targetUser.email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot modify your own role.' });
    }
    
    targetUser.role = role;
    if (role === 'admin') {
      delete targetUser.clubId;
    } else {
      targetUser.clubId = clubId;
    }
    
    await saveUser(email, targetUser);
    await logActivity(req.user.email, `promote_user: ${email} to ${role}`, req);
    res.json({ success: true, message: `${targetUser.name} promoted to ${role === 'admin' ? 'Admin' : `Club Manager for ${clubId}`}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to promote user: ' + error.message });
  }
});

app.post('/api/admin/demote', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    
    const targetUser = await findUserByEmail(email);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Safeguards
    if (isAdminEmail(targetUser.email)) {
      return res.status(400).json({ error: 'Cannot modify primary admin role.' });
    }
    if (targetUser.email.toLowerCase() === req.user.email.toLowerCase()) {
      return res.status(400).json({ error: 'Cannot modify your own role.' });
    }
    
    targetUser.role = 'student';
    delete targetUser.clubId;
    
    await saveUser(email, targetUser);
    await logActivity(req.user.email, `demote_user: ${email}`, req);
    res.json({ success: true, message: `${targetUser.name} demoted to Student` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to demote user: ' + error.message });
  }
});

// Serve frontend build static files in production
const frontendBuild = path.join(path.dirname(__dirname), 'dist');
console.log(`Serving static files from: ${frontendBuild} (Exists: ${fs.existsSync(frontendBuild)})`);

app.use(express.static(frontendBuild, {
  maxAge: '1d', // Cache index.html / files under dist for 1 day
  etag: true
}));
// Serve uploaded files dynamically from MongoDB Atlas or local disk fallback
app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  // Sanitize the filename to prevent path traversal
  const safeFilename = path.basename(filename);

  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const fileDoc = await db.collection('uploads').findOne({ filename: safeFilename });
      if (fileDoc) {
        const imgBuffer = Buffer.from(fileDoc.data, 'base64');
        res.setHeader('Content-Type', fileDoc.contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        return res.send(imgBuffer);
      }
    } catch (dbErr) {
      console.error("MongoDB Atlas retrieve upload error:", dbErr);
    }
  }

  // Local fallback: serve from disk if it exists
  const filePath = path.resolve(UPLOADS_DIR, safeFilename);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    return res.sendFile(filePath);
  }

  res.status(404).json({ error: 'File not found.' });
});

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

// 3. Scheduler: Run crawler automatically every day at 10 AM local time
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

const scheduleDailyScraper = () => {
  const now = new Date();
  
  // Create Date object for today at 10:00:00 AM local time
  const nextTenAm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);

  // If it's already past 10 AM today, schedule for 10 AM tomorrow
  if (now >= nextTenAm) {
    nextTenAm.setDate(nextTenAm.getDate() + 1);
  }

  const msUntilTenAm = nextTenAm - now;
  const minsUntilTenAm = Math.round(msUntilTenAm / 1000 / 60);
  console.log(`[Scheduler] Daily scraper scheduled to run at ${nextTenAm.toString()} (in ${minsUntilTenAm} minutes).`);

  setTimeout(() => {
    runCrawlerSilently();
    // After running once, continue running every 24 hours
    setInterval(runCrawlerSilently, 24 * 60 * 60 * 1000);
  }, msUntilTenAm);

  // Check if we missed today's 10 AM run (or if the last run is older than 24 hours)
  getOpportunities().then((data) => {
    const lastUpdateStr = data.lastUpdated;
    let runImmediately = false;

    if (!lastUpdateStr) {
      runImmediately = true;
    } else {
      const normalizedStr = lastUpdateStr.replace(/-/g, '/');
      const lastUpdateDate = new Date(normalizedStr);
      if (!isNaN(lastUpdateDate.getTime())) {
        const todayTenAm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);
        if (now >= todayTenAm && lastUpdateDate < todayTenAm) {
          runImmediately = true;
        } else if (now - lastUpdateDate > 24 * 60 * 60 * 1000) {
          runImmediately = true;
        }
      } else {
        runImmediately = true;
      }
    }

    if (runImmediately) {
      console.log(`[Scheduler] Missed run detected (last run: ${lastUpdateStr || 'Never'}). Executing scraper immediately...`);
      runCrawlerSilently();
    }
  }).catch((err) => {
    console.error(`[Scheduler] Error checking last update timestamp: ${err.message}`);
  });
};

if (!process.env.VERCEL) {
  scheduleDailyScraper();

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Express Backend running on port ${PORT}`);
    console.log(`=========================================`);
  });
}

export default app;
