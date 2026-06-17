import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MongoClient } from 'mongodb';
import multer from 'multer';
import nodemailer from 'nodemailer';

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

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const OPPORTUNITIES_FILE = path.join(DATA_DIR, 'opportunities.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCRIPTS_DIR = path.join(path.dirname(__dirname), 'scripts');
const PYTHON_SCRIPT = path.join(SCRIPTS_DIR, 'fetch_opportunities.py');
const CLUBS_FILE = path.join(DATA_DIR, 'clubs.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const RECRUITMENTS_FILE = path.join(DATA_DIR, 'recruitments.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

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
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer config for poster uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB max
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

// Email Transporter Configuration
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

let smtpHealthy = false;
if (transporter) {
  transporter.verify()
    .then(() => {
      smtpHealthy = true;
      console.log('✅ SMTP connection verified successfully.');
    })
    .catch((err) => {
      smtpHealthy = false;
      console.error('❌ SMTP connection failed:', err.message);
    });
} else {
  console.warn('⚠️ SMTP not configured. Registration and password reset will be unavailable.');
}

const sendMailHelper = async (to, subject, text) => {
  if (!transporter || !smtpHealthy) {
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
    console.error(`Nodemailer error sending to ${to}:`, err);
    // Mark SMTP as unhealthy on send failure
    smtpHealthy = false;
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
  fs.writeFileSync(CLUBS_FILE, JSON.stringify({ clubs }, null, 2), 'utf-8');
};

const deleteClub = async (clubId) => {
  // Delete from clubs list in file
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

  // Delete from MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('clubs').deleteOne({ id: clubId });
      await db.collection('users').updateMany({ clubId: clubId }, { $set: { role: 'student' }, $unset: { clubId: "" } });
    } catch (err) {
      console.error("MongoDB deleteClub error:", err);
    }
  }
};


// ========== EVENTS HELPERS ==========
const getEvents = async (categoryFilter) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  let events = [];
  if (db) {
    try {
      const query = categoryFilter ? { category: categoryFilter } : {};
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
  // Save to local file
  let fileData = { events: [] };
  if (fs.existsSync(EVENTS_FILE)) {
    try { fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8')); } catch(e) {}
  }
  fileData.events.push(eventData);
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  // Sync to MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try { await db.collection('events').insertOne(eventData); } catch (err) {
      console.error("MongoDB saveEvent error:", err);
    }
  }
};

const deleteEvent = async (eventId) => {
  // Delete from file
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      fileData.events = (fileData.events || []).filter(e => e.id !== eventId);
      fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch(e) {}
  }
  // Delete from MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try { await db.collection('events').deleteOne({ id: eventId }); } catch (err) {
      console.error("MongoDB deleteEvent error:", err);
    }
  }
};

const updateEvent = async (eventId, updatedData) => {
  // Update in local file
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
  // Update in MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      await db.collection('events').updateOne({ id: eventId }, { $set: updatedData });
    } catch (err) {
      console.error("MongoDB updateEvent error:", err);
    }
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
  let fileData = { recruitments: [] };
  if (fs.existsSync(RECRUITMENTS_FILE)) {
    try { fileData = JSON.parse(fs.readFileSync(RECRUITMENTS_FILE, 'utf-8')); } catch(e) {}
  }
  fileData.recruitments.push(recData);
  fs.writeFileSync(RECRUITMENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try { await db.collection('recruitments').insertOne(recData); } catch (err) {
      console.error("MongoDB saveRecruitment error:", err);
    }
  }
};

const deleteRecruitment = async (recId) => {
  if (fs.existsSync(RECRUITMENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(RECRUITMENTS_FILE, 'utf-8'));
      fileData.recruitments = (fileData.recruitments || []).filter(r => r.id !== recId);
      fs.writeFileSync(RECRUITMENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
    } catch(e) {}
  }
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try { await db.collection('recruitments').deleteOne({ id: recId }); } catch (err) {
      console.error("MongoDB deleteRecruitment error:", err);
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
app.post('/api/auth/register', async (req, res) => {
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



    // Send email or fallback to console log
    await sendMailHelper(
      lowerEmail,
      'VIT Bhopal Opportunity Hub - Email Verification Code',
      `Hello ${name.trim()},\n\nThank you for registering. Your verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`
    );

    res.json({ success: true, message: 'Verification code sent.', email: lowerEmail });
  } catch (error) {
    res.status(500).json({ error: 'Server registration error: ' + error.message });
  }
});

// Verification Endpoint
app.post('/api/auth/verify', authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
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
app.post('/api/auth/resend-code', authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
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

    await sendMailHelper(
      lowerEmail,
      'VIT Bhopal Opportunity Hub - Resend Verification Code',
      `Hello ${user.name},\n\nYour new verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`
    );

    res.json({ success: true, message: 'New verification code sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resend code: ' + error.message });
  }
});

// 2. Login User (with verified checking)
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
      await saveUser(lowerEmail, user);
    }

    const token = generateToken(lowerEmail, user.passwordHash);

    const userProfile = { ...user };
    delete userProfile.passwordHash;
    delete userProfile.salt;

    res.json({ token, user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Server authentication error: ' + error.message });
  }
});

// Forgot Password Request Endpoint
app.post('/api/auth/forgot-password', authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
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

    await sendMailHelper(
      lowerEmail,
      'VIT Bhopal Opportunity Hub - Password Reset Code',
      `Hello ${user.name},\n\nWe received a request to reset your password. Your password reset code is: ${rawCode}\n\nThis code is valid for 15 minutes. If you did not request this, please ignore this email.`
    );

    res.json(genericSuccessResponse);
  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// Reset Password Execution Endpoint
app.post('/api/auth/reset-password', authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
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
app.get('/api/user/profile', authenticate, (req, res) => {
  const userProfile = { ...req.user };
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
    const { description, icon, memberCount, socialLinks } = req.body;

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
    const category = req.query.category || null;
    const events = await getEvents(category);
    res.json({ events });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events: ' + error.message });
  }
});

app.post('/api/events', authenticate, requireClubManager, async (req, res) => {
  try {
    const { title, description, clubId, clubName, category, date, time, venue, posterUrl, registrationLink, tags, registrationDeadline, eventStartDateTime, eventEndDateTime, price } = req.body;
    if (!title || !clubId || !category || !date) {
      return res.status(400).json({ error: 'Title, clubId, category, and date are required.' });
    }
    // Cross-Club Modification Defense
    if (req.user.role !== 'admin' && clubId !== req.user.clubId) {
      return res.status(403).json({ error: 'Forbidden: You are not authorized to create events for this club.' });
    }
    // URL Protocol Sanitization (XSS Defense)
    if (posterUrl && !isValidHttpUrl(posterUrl)) {
      return res.status(400).json({ error: 'Invalid poster URL protocol. Only HTTP/HTTPS is allowed.' });
    }
    if (registrationLink && !isValidHttpUrl(registrationLink)) {
      return res.status(400).json({ error: 'Invalid registration link protocol. Only HTTP/HTTPS is allowed.' });
    }

    const eventData = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title, description: description || '', clubId, clubName: clubName || '',
      category, date, time: time || '', venue: venue || '',
      posterUrl: posterUrl || '', registrationLink: registrationLink || '',
      tags: Array.isArray(tags) ? tags : [],
      registrationDeadline: registrationDeadline || '',
      eventStartDateTime: eventStartDateTime || '',
      eventEndDateTime: eventEndDateTime || '',
      price: price || '',
      createdBy: req.user.email,
      createdAt: new Date().toISOString()
    };
    await saveEvent(eventData);
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
    
    // Broken Object Level Authorization (IDOR) check
    if (req.user.role !== 'admin' && (req.user.role !== 'club_manager' || req.user.clubId !== event.clubId)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this event.' });
    }
    
    await deleteEvent(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event: ' + error.message });
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
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete recruitment: ' + error.message });
  }
});

// SMTP Health Check Endpoint
app.get('/api/health/smtp', (req, res) => {
  res.json({ smtpHealthy });
});

// --- FILE UPLOAD ---
app.post('/api/upload', authenticate, requireClubManager, (req, res) => {
  upload.single('poster')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Upload error: ' + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
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
    res.json({ success: true, message: `${targetUser.name} demoted to Student` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to demote user: ' + error.message });
  }
});

// Serve frontend build static files in production
const frontendBuild = path.join(path.dirname(__dirname), 'dist');
console.log(`Serving static files from: ${frontendBuild} (Exists: ${fs.existsSync(frontendBuild)})`);

app.use(express.static(frontendBuild));
app.use('/uploads', express.static(UPLOADS_DIR));

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
