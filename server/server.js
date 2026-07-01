import express from 'express';
import cors from 'cors';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { MongoClient, ObjectId } from 'mongodb';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { rateLimit } from 'express-rate-limit';
import { v2 as cloudinary } from 'cloudinary';

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
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  const corsOptions = { credentials: true };
  
  if (!origin) {
    corsOptions.origin = true;
    return callback(null, corsOptions);
  }

  // Allow same-origin requests dynamically by checking host header
  const host = req.header('Host');
  if (host) {
    const hostWithProtocolHttp = `http://${host}`;
    const hostWithProtocolHttps = `https://${host}`;
    if (origin === hostWithProtocolHttp || origin === hostWithProtocolHttps) {
      corsOptions.origin = true;
      return callback(null, corsOptions);
    }
  }

  // Check env-configured allowed origins
  if (ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    corsOptions.origin = true;
    return callback(null, corsOptions);
  }

  // Check localhost/dev origins
  try {
    const parsed = new URL(origin);
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) {
      corsOptions.origin = true;
      return callback(null, corsOptions);
    }
  } catch {}

  // Block other origins
  corsOptions.origin = false;
  return callback(new Error('CORS blocked for this origin'), corsOptions);
}));

// Security helper: strips all sensitive fields from user objects before API responses
function sanitizeUser(userObj) {
  const safe = { ...userObj };
  delete safe.passwordHash;
  delete safe.salt;
  delete safe.verificationCode;
  delete safe.verificationExpires;
  delete safe.lastCodeSentAt;
  delete safe.resetCode;
  delete safe.resetExpires;
  delete safe.lastResetSentAt;
  return safe;
}

app.use(express.json({ limit: '15mb' }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

app.use((req, res, next) => {
  let maskedAuth = 'None';
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;
    const lowerHeader = authHeader.trim().toLowerCase();
    if (lowerHeader.startsWith('bearer ')) {
      maskedAuth = 'Bearer [MASKED]';
    } else if (lowerHeader.startsWith('basic ')) {
      maskedAuth = 'Basic [MASKED]';
    } else {
      maskedAuth = '[MASKED]';
    }
  }
  console.log(`[HTTP] ${req.method} ${req.url} - IP: ${req.ip} - Auth: ${maskedAuth}`);
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

const uploadsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: isProd ? 120 : 5000, // Limit each IP to 120 image requests in prod, 5000 in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many image requests, please try again later.' }
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
const PAPERS_FILE = path.join(DATA_DIR, 'papers.json');

// Active Sessions Management
const MAX_SESSIONS_PER_USER = 10;
const inMemorySessions = new Map();

// SSE active connections list
let sseClients = [];

const notifySessionRevoked = (tokenHash) => {
  const client = sseClients.find(c => c.tokenHash === tokenHash);
  if (client) {
    try {
      client.res.write(`data: ${JSON.stringify({
        type: 'revoked',
        message: 'Your session has been revoked from another device.'
      })}\n\n`);
      client.res.end();
    } catch (err) {
      console.error("Failed to notify client:", err.message);
    }
  }
};

const notifyAllOtherSessionsRevoked = (email, currentTokenHash) => {
  const otherClients = sseClients.filter(c => c.email === email && c.tokenHash !== currentTokenHash);
  for (const client of otherClients) {
    try {
      client.res.write(`data: ${JSON.stringify({
        type: 'revoked',
        message: 'Your session has been revoked because you logged out all other devices.'
      })}\n\n`);
      client.res.end();
    } catch (err) {
      console.error("Failed to notify client on bulk revocation:", err.message);
    }
  }
};

// Periodic cleanup of expired in-memory sessions
setInterval(() => {
  const now = Date.now();
  for (const [hash, session] of inMemorySessions.entries()) {
    if (now > new Date(session.expiresAt).getTime()) {
      inMemorySessions.delete(hash);
    }
  }
}, 30 * 60 * 1000); // 30 minutes

const parseUserAgent = (uaString) => {
  const ua = uaString || '';
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';
  let deviceType = 'Desktop';

  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    deviceType = 'Mobile';
    if (/ipad/i.test(ua)) {
      deviceType = 'Tablet';
    }
  }

  if (/windows/i.test(ua)) {
    os = 'Windows';
  } else if (/macintosh|mac os x/i.test(ua)) {
    os = 'macOS';
  } else if (/android/i.test(ua)) {
    os = 'Android';
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = 'iOS';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
  }

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
    browser = 'Safari';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Firefox';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opr/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceType, os, browser };
};

const getSessionHash = (token) => {
  const parts = token.split('.');
  const signature = parts[0];
  return crypto.createHash('sha256').update(signature).digest('hex');
};

const createSession = async (email, token, req) => {
  try {
    if (dbConnectingPromise) await dbConnectingPromise;

    const parts = token.split('.');
    const signature = parts[0];
    const expiresAtVal = parseInt(parts[2], 10);
    const tokenHash = crypto.createHash('sha256').update(signature).digest('hex');

    const ua = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const { deviceType, os, browser } = parseUserAgent(ua);

    const sessionDoc = {
      email: email.toLowerCase().trim(),
      tokenHash,
      userAgent: ua,
      ip,
      deviceType,
      os,
      browser,
      lastActive: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(expiresAtVal)
    };

    if (db) {
      try {
        // Enforce FIFO Session Limit
        const sessionCount = await db.collection('sessions').countDocuments({ email: sessionDoc.email });
        if (sessionCount >= MAX_SESSIONS_PER_USER) {
          const oldestSession = await db.collection('sessions')
            .find({ email: sessionDoc.email })
            .sort({ createdAt: 1 })
            .limit(1)
            .toArray();
          if (oldestSession.length > 0) {
            await db.collection('sessions').deleteOne({ _id: oldestSession[0]._id });
            notifySessionRevoked(oldestSession[0].tokenHash);
          }
        }
        await db.collection('sessions').insertOne(sessionDoc);
        return;
      } catch (err) {
        console.error("MongoDB createSession error, falling back to memory:", err.message);
      }
    }

    // Fallback to in-memory map
    const userSessions = Array.from(inMemorySessions.values()).filter(s => s.email === sessionDoc.email);
    if (userSessions.length >= MAX_SESSIONS_PER_USER) {
      userSessions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const oldest = userSessions[0];
      inMemorySessions.delete(oldest.tokenHash);
      notifySessionRevoked(oldest.tokenHash);
    }
    inMemorySessions.set(tokenHash, sessionDoc);
  } catch (err) {
    console.error("Error creating session:", err.message);
  }
};

const verifySession = async (token) => {
  try {
    if (dbConnectingPromise) await dbConnectingPromise;

    const tokenHash = getSessionHash(token);

    if (db) {
      try {
        const session = await db.collection('sessions').findOne({ tokenHash });
        if (session) {
          // Update lastActive asynchronously
          db.collection('sessions').updateOne(
            { _id: session._id },
            { $set: { lastActive: new Date() } }
          ).catch(err => console.error("Failed to update lastActive for session:", err.message));
          return true;
        }
        return false;
      } catch (err) {
        console.error("MongoDB verifySession error, falling back to memory:", err.message);
      }
    }

    const session = inMemorySessions.get(tokenHash);
    if (session) {
      session.lastActive = new Date();
      return true;
    }
    return false;
  } catch (err) {
    console.error("Error verifying session:", err.message);
    return false;
  }
};

const getUserSessions = async (email) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  const lowerEmail = email.toLowerCase().trim();
  if (db) {
    try {
      const list = await db.collection('sessions').find({ email: lowerEmail }).toArray();
      return list.map(s => ({
        id: s._id.toString(),
        userAgent: s.userAgent,
        deviceType: s.deviceType,
        os: s.os,
        browser: s.browser,
        ip: s.ip,
        lastActive: s.lastActive,
        createdAt: s.createdAt,
        tokenHash: s.tokenHash
      }));
    } catch (err) {
      console.error("MongoDB getUserSessions error, falling back to memory:", err.message);
    }
  }

  return Array.from(inMemorySessions.values())
    .filter(s => s.email === lowerEmail)
    .map(s => ({
      id: s.tokenHash,
      userAgent: s.userAgent,
      deviceType: s.deviceType,
      os: s.os,
      browser: s.browser,
      ip: s.ip,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      tokenHash: s.tokenHash
    }));
};

const revokeSession = async (sessionId, email) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  const lowerEmail = email.toLowerCase().trim();
  if (db) {
    try {
      let query = { email: lowerEmail };
      try {
        query._id = new ObjectId(sessionId);
      } catch {
        query._id = sessionId;
      }
      const res = await db.collection('sessions').deleteOne(query);
      return res.deletedCount > 0;
    } catch (err) {
      console.error("MongoDB revokeSession error, falling back to memory:", err.message);
    }
  }

  // Fallback in-memory map
  const session = inMemorySessions.get(sessionId);
  if (session && session.email === lowerEmail) {
    inMemorySessions.delete(sessionId);
    return true;
  }
  return false;
};

const revokeAllSessionsExcept = async (email, currentToken) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  const lowerEmail = email.toLowerCase().trim();
  const signature = currentToken.split('.')[0];
  const currentTokenHash = crypto.createHash('sha256').update(signature).digest('hex');

  if (db) {
    try {
      await db.collection('sessions').deleteMany({
        email: lowerEmail,
        tokenHash: { $ne: currentTokenHash }
      });
      return;
    } catch (err) {
      console.error("MongoDB revokeAllSessionsExcept error, falling back to memory:", err.message);
    }
  }

  // Fallback in-memory map
  for (const [key, session] of inMemorySessions.entries()) {
    if (session.email === lowerEmail && session.tokenHash !== currentTokenHash) {
      inMemorySessions.delete(key);
    }
  }
};

const deleteSession = async (token) => {
  if (dbConnectingPromise) await dbConnectingPromise;
  const signature = token.split('.')[0];
  const tokenHash = crypto.createHash('sha256').update(signature).digest('hex');

  if (db) {
    try {
      await db.collection('sessions').deleteOne({ tokenHash });
      return;
    } catch (err) {
      console.error("MongoDB deleteSession error, falling back to memory:", err.message);
    }
  }

  // Fallback in-memory map
  for (const [key, session] of inMemorySessions.entries()) {
    if (session.tokenHash === tokenHash) {
      inMemorySessions.delete(key);
    }
  }
};

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

const isSafeEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === '__proto__' || cleanEmail === 'constructor' || cleanEmail === 'prototype') {
    return false;
  }
  if (cleanEmail.includes('__proto__') || cleanEmail.includes('constructor') || cleanEmail.includes('prototype')) {
    return false;
  }
  return true;
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

// Configure Cloudinary if credentials are provided in process.env
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log("☁️ Cloudinary configured successfully.");
} else {
  console.log("⚠️ Cloudinary credentials missing. File uploads will fallback to local disk/database storage.");
}

// Upload buffer helper for Cloudinary
const uploadToCloudinary = (fileBuffer, folder = 'vitlife_events', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

// Automatic Expired Events & Assets Cleanup System (older than 30 days)
const cleanupExpiredEvents = async () => {
  console.log("🧹 Running expired events cleanup task...");
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  // Helper to extract Cloudinary Public ID
  const getCloudinaryPublicId = (url) => {
    if (!url) return null;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        if (parsed.hostname !== 'res.cloudinary.com') return null;
        const parts = parsed.pathname.split(/\/image\/upload\/(?:v\d+\/)?/);
        if (parts.length < 2) return null;
        const pathAndExt = parts[1];
        const lastDot = pathAndExt.lastIndexOf('.');
        if (lastDot === -1) return pathAndExt;
        return pathAndExt.substring(0, lastDot);
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  // Helper to delete an image asset (Cloudinary / DB / Local)
  const deleteImage = async (url) => {
    if (!url) return;
    try {
      // 1. Cloudinary
      let isCloudinary = false;
      try {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          const parsed = new URL(url);
          isCloudinary = parsed.hostname === 'res.cloudinary.com';
        }
      } catch (e) {}

      if (isCloudinary && isCloudinaryConfigured) {
        const publicId = getCloudinaryPublicId(url);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
          console.log(`🧹 Deleted Cloudinary image: ${publicId}`);
        }
      }
      // 2. Local uploads / MongoDB base64
      else if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
        let filename = '';
        if (url.startsWith('/uploads/')) {
          filename = url.replace('/uploads/', '');
        } else {
          filename = url.split('/uploads/')[1];
        }
        const safeFilename = path.basename(filename);

        // Delete from MongoDB uploads
        if (dbConnectingPromise) await dbConnectingPromise;
        if (db) {
          try {
            await db.collection('uploads').deleteOne({ filename: safeFilename });
            console.log(`🧹 Deleted MongoDB upload: ${safeFilename}`);
          } catch (dbErr) {
            console.error("Failed to delete upload from MongoDB:", dbErr.message);
          }
        }

        // Delete from local disk
        const filePath = path.join(UPLOADS_DIR, safeFilename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`🧹 Deleted local cache image file: ${safeFilename}`);
          } catch (fsErr) {
            console.error("Failed to delete local image file:", fsErr.message);
          }
        }
      }
    } catch (err) {
      console.error(`Error deleting image asset (${url}):`, err.message);
    }
  };

  // 1. Clean up from MongoDB
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const allEvents = await db.collection('events').find({}).toArray();
      const expiredEvents = allEvents.filter(event => {
        let eventTime = null;
        if (event.eventEndDateTime) {
          eventTime = new Date(event.eventEndDateTime).getTime();
        } else if (event.eventStartDateTime) {
          eventTime = new Date(event.eventStartDateTime).getTime();
        } else if (event.date) {
          eventTime = new Date(event.date).getTime();
        }
        return eventTime && eventTime < thirtyDaysAgo;
      });

      console.log(`🧹 Found ${expiredEvents.length} expired events in MongoDB.`);

      for (const event of expiredEvents) {
        // Collect all image URLs
        const imagesToDelete = [];
        if (event.posterUrl) imagesToDelete.push(event.posterUrl);
        if (event.schedulePosterUrl) imagesToDelete.push(event.schedulePosterUrl);
        if (Array.isArray(event.posterUrls)) {
          event.posterUrls.forEach(url => {
            if (url && !imagesToDelete.includes(url)) {
              imagesToDelete.push(url);
            }
          });
        }

        // Delete all images
        for (const url of imagesToDelete) {
          await deleteImage(url);
        }

        // Delete the event document
        await db.collection('events').deleteOne({ id: event.id });
        console.log(`🧹 Deleted expired event from MongoDB: "${event.title}" (ID: ${event.id})`);
      }
    } catch (err) {
      console.error("MongoDB expired events cleanup failed:", err.message);
    }
  }

  // 2. Clean up from local events.json file
  if (fs.existsSync(EVENTS_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
      const localEvents = fileData.events || [];
      const activeEvents = [];
      let deletedCount = 0;

      for (const event of localEvents) {
        let eventTime = null;
        if (event.eventEndDateTime) {
          eventTime = new Date(event.eventEndDateTime).getTime();
        } else if (event.eventStartDateTime) {
          eventTime = new Date(event.eventStartDateTime).getTime();
        } else if (event.date) {
          eventTime = new Date(event.date).getTime();
        }

        if (eventTime && eventTime < thirtyDaysAgo) {
          // Collect and delete images
          const imagesToDelete = [];
          if (event.posterUrl) imagesToDelete.push(event.posterUrl);
          if (event.schedulePosterUrl) imagesToDelete.push(event.schedulePosterUrl);
          if (Array.isArray(event.posterUrls)) {
            event.posterUrls.forEach(url => {
              if (url && !imagesToDelete.includes(url)) {
                imagesToDelete.push(url);
              }
            });
          }

          for (const url of imagesToDelete) {
            await deleteImage(url);
          }

          console.log(`🧹 Deleted expired event from events.json: "${event.title}" (ID: ${event.id})`);
          deletedCount++;
        } else {
          activeEvents.push(event);
        }
      }

      if (deletedCount > 0) {
        fileData.events = activeEvents;
        fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
        console.log(`🧹 Updated events.json, removed ${deletedCount} expired events.`);
      }
    } catch (err) {
      console.error("Local events.json cleanup failed:", err.message);
    }
  }
};

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

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getHtmlEmailTemplate = (name, title, heading, bodyText, code, expiryText) => {
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const safeBodyText = escapeHtml(bodyText);
  const safeCode = escapeHtml(code);
  const safeExpiryText = escapeHtml(expiryText);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff; color: #111827; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 480px; margin: 0 auto; padding: 20px 0;">
    <!-- Logo Header -->
    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.03em; color: #111827; margin-bottom: 32px;">
      VIT<span style="color: #4f46e5;">LIFE</span>
    </div>
    
    <!-- Heading -->
    <h2 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #111827; margin: 0 0 16px 0;">
      ${safeHeading}
    </h2>
    
    <!-- Body text -->
    <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 28px 0;">
      ${safeBodyText}
    </p>
    
    <!-- Verification Code Block -->
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5; font-weight: 700; margin-bottom: 8px;">
        Verification Code
      </div>
      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #111827; margin: 0; padding-left: 0.25em;">
        ${safeCode}
      </div>
    </div>
    
    <!-- Expiry / Security Note -->
    <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin: 0 0 32px 0;">
      <strong>Note:</strong> ${safeExpiryText} Never share this code with anyone. Our support team will never ask for this code.
    </p>
    
    <!-- Divider line -->
    <hr style="border: 0; border-top: 1px solid #f3f4f6; margin: 0 0 24px 0;" />
    
    <!-- Footer -->
    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 6px 0; line-height: 1.4;">
      © ${new Date().getFullYear()} VIT Life. Built for VIT Bhopal Campus.
    </p>
    <p style="font-size: 12px; color: #9ca3af; margin: 0; line-height: 1.4;">
      This is an automated transmission. Please do not reply to this mailbox.
    </p>
  </div>
</body>
</html>
  `;
};

const sendMailHelper = async (to, subject, text, html) => {
  if (!smtpHealthy || !transporter) {
    throw new Error('Email service is currently unavailable. Please try again later.');
  }

  try {
    await transporter.sendMail({
      from: `"VIT Life Support" <${smtpUser}>`,
      to,
      subject,
      text,
      html
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
  return async (req, res, next) => {
    const ip = req.ip;
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    const key = `${ip}:${email}`;
    const now = Date.now();

    if (db) {
      try {
        const col = db.collection('rate_limits');
        const record = await col.findOne({ key });
        if (record) {
          const lastAttemptTime = record.lastAttempt instanceof Date ? record.lastAttempt.getTime() : record.lastAttempt;
          if (now - lastAttemptTime > windowMs) {
            await col.updateOne({ key }, { $set: { attempts: 1, lastAttempt: new Date(now) } });
          } else if (record.attempts >= limit) {
            const remainingMinutes = Math.ceil((windowMs - (now - lastAttemptTime)) / 60000);
            return res.status(429).json({ error: `Too many failed attempts. Please try again after ${remainingMinutes} minute(s).` });
          } else {
            await col.updateOne({ key }, { $inc: { attempts: 1 }, $set: { lastAttempt: new Date(now) } });
          }
        } else {
          await col.updateOne({ key }, { $set: { attempts: 1, lastAttempt: new Date(now) } }, { upsert: true });
        }
        return next();
      } catch (err) {
        console.error("MongoDB rate-limiting error, falling back to memory:", err.message);
      }
    }

    // Fallback to in-memory rate-limiter
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
let lastPassVitianSyncTime = 0;
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
    await database.collection('events').createIndex({ category: 1 });
    await database.collection('recruitments').createIndex({ id: 1 }, { unique: true });
    await database.collection('recruitments').createIndex({ clubId: 1 });
    await database.collection('recruitments').createIndex({ deadline: 1 });
    await database.collection('opportunities').createIndex({ type: 1 });
    await database.collection('opportunities').createIndex({ matchScore: -1 });
    await database.collection('opportunities').createIndex({ tags: 1 });
    await database.collection('settings').createIndex({ key: 1 }, { unique: true });
    await database.collection('activity_logs').createIndex({ timestamp: -1 });
    await database.collection('activity_logs').createIndex({ email: 1 });
    await database.collection('rate_limits').createIndex({ key: 1 }, { unique: true });
    await database.collection('rate_limits').createIndex({ lastAttempt: 1 }, { expireAfterSeconds: 900 });
    
    // Active Sessions Indexes
    await database.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true });
    await database.collection('sessions').createIndex({ email: 1 });
    await database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index automatically deletes expired sessions
    
    console.log("✅ Database indexes verified/created successfully.");
  } catch (err) {
    console.error("❌ Failed to verify database indexes:", err.message);
  }
};

if (MONGODB_URI) {
  console.log("Connecting to MongoDB Atlas...");
  dbConnectionStatus = "Connecting";
  client = new MongoClient(MONGODB_URI, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
  });

  dbConnectingPromise = client.connect()
    .then(async c => {
      db = c.db();
      dbConnectionStatus = "Connected";
      dbConnectionError = null;
      console.log("Successfully connected to MongoDB Database!");
      ensureIndexes(db).catch(err => console.error("Index creation error:", err.message));
      
      // Seed papers in MongoDB if empty
      try {
        const paperCount = await db.collection('papers').countDocuments();
        if (paperCount === 0 && fs.existsSync(PAPERS_FILE)) {
          const seeds = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8'));
          if (seeds && seeds.length > 0) {
            await db.collection('papers').insertMany(seeds);
            console.log(`Seeded ${seeds.length} papers to MongoDB Atlas.`);
          }
        }
      } catch (e) {
        console.error("Error seeding papers to MongoDB:", e.message);
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

let JWT_SECRET = null;
let jwtSecretPromise = null;

const getLocalFallbackSecret = () => {
  const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
  if (fs.existsSync(SECRET_FILE)) {
    try {
      const fileSecret = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (fileSecret.length >= 32) {
        return fileSecret;
      }
    } catch (err) {
      console.warn("Could not read local secret key file:", err.message);
    }
  }

  const newSecret = crypto.randomBytes(64).toString('hex');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SECRET_FILE, newSecret, 'utf8');
  } catch (err) {
    console.warn("Could not save persistent secret key to disk fallback:", err.message);
  }
  return newSecret;
};

const ensureJwtSecret = async () => {
  if (JWT_SECRET) return JWT_SECRET;
  if (jwtSecretPromise) return jwtSecretPromise;

  jwtSecretPromise = (async () => {
    // 1. Check environment variable first
    let secret = process.env.JWT_SECRET;
    if (secret && secret.trim().length >= 32) {
      JWT_SECRET = secret.trim();
      return JWT_SECRET;
    }

    // 2. Try fetching from MongoDB Atlas if available
    if (MONGODB_URI) {
      try {
        if (dbConnectingPromise) {
          await dbConnectingPromise;
        }
        if (db) {
          const settingsColl = db.collection('settings');
          const doc = await settingsColl.findOne({ key: 'jwt_secret' });
          if (doc && doc.value && doc.value.trim().length >= 32) {
            JWT_SECRET = doc.value.trim();
            console.log("🔒 Loaded persistent JWT_SECRET from MongoDB Atlas settings.");
            return JWT_SECRET;
          } else {
            const newSecret = crypto.randomBytes(64).toString('hex');
            try {
              const res = await settingsColl.findOneAndUpdate(
                { key: 'jwt_secret' },
                { $setOnInsert: { value: newSecret } },
                { upsert: true, returnDocument: 'after' }
              );
              const finalDoc = await settingsColl.findOne({ key: 'jwt_secret' });
              if (finalDoc && finalDoc.value && finalDoc.value.trim().length >= 32) {
                JWT_SECRET = finalDoc.value.trim();
              } else {
                JWT_SECRET = newSecret;
              }
            } catch (updateErr) {
              const finalDoc = await settingsColl.findOne({ key: 'jwt_secret' });
              if (finalDoc && finalDoc.value && finalDoc.value.trim().length >= 32) {
                JWT_SECRET = finalDoc.value.trim();
              } else {
                JWT_SECRET = newSecret;
              }
            }
            console.log("🔒 Generated and saved persistent JWT_SECRET in MongoDB Atlas settings.");
            return JWT_SECRET;
          }
        }
      } catch (err) {
        console.warn("Could not retrieve persistent JWT_SECRET from settings collection:", err.message);
      }
    }

    // 3. Fallback to local files
    JWT_SECRET = getLocalFallbackSecret();
    return JWT_SECRET;
  })();

  return jwtSecretPromise;
};

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
  if (lowerEmail === '__proto__' || lowerEmail === 'constructor' || lowerEmail === 'prototype') {
    return null;
  }
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      const user = await db.collection('users').findOne({ email: lowerEmail });
      if (user) {
        if (user.email === '__proto__' || user.email === 'constructor' || user.email === 'prototype') {
          return null;
        }
        return user;
      }
    } catch (err) {
      console.error("MongoDB findUserByEmail error, falling back to file:", err);
    }
  }
  const users = loadUsers();
  if (Object.prototype.hasOwnProperty.call(users, lowerEmail)) {
    const user = users[lowerEmail];
    if (user && user !== Object.prototype) {
      return user;
    }
  }
  return null;
};

const getAdminEmails = async () => {
  const adminSet = new Set();
  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const admins = await db.collection('users').find({ role: 'admin' }, { projection: { email: 1 } }).toArray();
      for (const u of admins) {
        if (u.email) adminSet.add(u.email.toLowerCase().trim());
      }
      return adminSet;
    } catch (err) {
      console.error("MongoDB getAdminEmails error, falling back to file:", err);
    }
  }
  try {
    const users = loadUsers();
    for (const email of Object.keys(users)) {
      const user = users[email];
      if (user && user.role === 'admin') {
        adminSet.add(email.toLowerCase().trim());
      }
    }
  } catch (e) {}
  return adminSet;
};

const saveUser = async (email, userData) => {
  if (typeof email !== 'string') return;
  const lowerEmail = email.toLowerCase().trim();
  if (lowerEmail === '__proto__' || lowerEmail === 'constructor' || lowerEmail === 'prototype') {
    return;
  }
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
      // Self-healing migration check: check if the old single-document format exists and migrate it
      const oldDoc = await db.collection('opportunities').findOne({ type: 'metadata' });
      if (oldDoc && Array.isArray(oldDoc.opportunities)) {
        console.log("Found legacy opportunities structure in MongoDB. Migrating to individual documents...");
        
        // 1. Upsert metadata document
        await db.collection('opportunities').updateOne(
          { _id: 'metadata' },
          { $set: { lastUpdated: oldDoc.lastUpdated || new Date().toISOString().replace('T', ' ').substring(0, 19) } },
          { upsert: true }
        );

        // 2. Insert individual opportunity documents
        if (oldDoc.opportunities.length > 0) {
          const docs = oldDoc.opportunities.map(opp => ({
            ...opp,
            _id: opp.id || `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }));
          try {
            await db.collection('opportunities').insertMany(docs, { ordered: false });
          } catch (insertErr) {
            // Ignore duplicate key errors if some documents were partially migrated
          }
        }

        // 3. Remove the legacy single-document entry
        await db.collection('opportunities').deleteOne({ type: 'metadata' });
        console.log("✅ Opportunities migration completed successfully.");
      }

      // Read new normalized structure
      const meta = await db.collection('opportunities').findOne({ _id: 'metadata' });
      const opportunities = await db.collection('opportunities')
        .find({ _id: { $ne: 'metadata' } })
        .toArray();

      return {
        lastUpdated: meta ? meta.lastUpdated : '',
        opportunities: opportunities || []
      };
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

const getPapers = async () => {
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      const papers = await db.collection('papers').find().toArray();
      return papers || [];
    } catch (err) {
      console.error("MongoDB getPapers error, falling back to file:", err);
    }
  }
  if (!fs.existsSync(PAPERS_FILE)) {
    fs.writeFileSync(PAPERS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  try {
    return JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8')) || [];
  } catch (e) {
    return [];
  }
};

const savePaper = async (id, paperObj) => {
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      await db.collection('papers').replaceOne({ _id: id }, { _id: id, ...paperObj }, { upsert: true });
      return;
    } catch (err) {
      console.error("MongoDB savePaper error, falling back to file:", err);
    }
  }
  let list = [];
  if (fs.existsSync(PAPERS_FILE)) {
    try {
      list = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8')) || [];
    } catch (e) {}
  }
  const index = list.findIndex(p => p._id === id);
  if (index !== -1) {
    list[index] = { _id: id, ...paperObj };
  } else {
    list.push({ _id: id, ...paperObj });
  }
  fs.writeFileSync(PAPERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
};

const deletePaper = async (id) => {
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      await db.collection('papers').deleteOne({ _id: id });
      return;
    } catch (err) {
      console.error("MongoDB deletePaper error, falling back to file:", err);
    }
  }
  if (fs.existsSync(PAPERS_FILE)) {
    try {
      let list = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8')) || [];
      list = list.filter(p => p._id !== id);
      fs.writeFileSync(PAPERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (e) {}
  }
};

const syncPassVitianPapers = async () => {
  lastPassVitianSyncTime = Date.now();
  try {
    console.log('[Sync] Starting papers sync...');
    
    // Clean up any old PassVitian references from database to ensure no info leaks
    if (db) {
      try {
        await db.collection('papers').deleteMany({
          $or: [
            { _id: /^pv_/ },
            { uploadedBy: 'PassVitian' }
          ]
        });
      } catch (err) {
        console.error('[Sync] Error cleaning old papers from DB:', err.message);
      }
    }
    
    // Clean up local papers.json as well
    if (fs.existsSync(PAPERS_FILE)) {
      try {
        let list = JSON.parse(fs.readFileSync(PAPERS_FILE, 'utf-8')) || [];
        const cleanList = list.filter(p => !p._id.startsWith('pv_') && p.uploadedBy !== 'PassVitian');
        if (cleanList.length !== list.length) {
          fs.writeFileSync(PAPERS_FILE, JSON.stringify(cleanList, null, 2), 'utf-8');
        }
      } catch (e) {}
    }

    const response = await fetch('https://passvitian.in/api/list-papers');
    if (!response.ok) {
      throw new Error(`Failed to fetch papers: ${response.statusText}`);
    }
    const data = await response.json();
    const fetchedPapers = data.papers || [];
    console.log(`[Sync] Fetched ${fetchedPapers.length} papers.`);

    const existingPapers = await getPapers();
    const existingUrls = new Set(
      existingPapers.map(p => (p.url || '').trim().toLowerCase()).filter(Boolean)
    );

    let savedCount = 0;
    for (const paper of fetchedPapers) {
      const paperUrl = (paper.secure_url || paper.url || '').trim();
      if (!paperUrl) {
        continue;
      }

      // Check if paper already exists by URL/secure_url to prevent duplicates
      if (existingUrls.has(paperUrl.toLowerCase())) {
        continue;
      }

      // Map subjectCode to courseCode
      const courseCode = (paper.subjectCode || '').trim().toUpperCase();
      if (!courseCode) continue;

      // Map subjectName to courseTitle
      const courseTitle = (paper.subjectName || '').trim() || courseCode;

      // Infer department from the prefix of subjectCode
      let department = 'CSE';
      if (courseCode.startsWith('MAT3002') || courseCode.startsWith('MAT2003')) {
        department = 'DSA';
      } else if (courseCode.startsWith('CSE') || courseCode.startsWith('CSD')) {
        department = 'CSE';
      } else if (courseCode.startsWith('ECE')) {
        department = 'ECE';
      } else if (courseCode.startsWith('EEE')) {
        department = 'EEE';
      } else if (courseCode.startsWith('MEE')) {
        department = 'MEE';
      } else if (courseCode.startsWith('CIV')) {
        department = 'CIV';
      } else if (courseCode.startsWith('ASE')) {
        department = 'ASE';
      } else if (courseCode.startsWith('MAT') || courseCode.startsWith('CCA')) {
        department = 'AIM';
      } else {
        const match = courseCode.match(/^[A-Z]+/);
        department = match ? match[0] : 'CSE';
      }

      // Infer semester based on the first digit of the course code
      const digitMatch = courseCode.match(/\d/);
      const firstDigit = digitMatch ? parseInt(digitMatch[0], 10) : 1;
      let semester = 1;
      if (firstDigit === 1) semester = 1;
      else if (firstDigit === 2) semester = 3;
      else if (firstDigit === 3) semester = 5;
      else if (firstDigit === 4) semester = 7;

      // Infer year from paperName
      let year = '2024-25'; // Fallback
      if (paper.paperName) {
        const match = paper.paperName.match(/\d{4}/);
        if (match) {
          const fullYear = parseInt(match[0], 10);
          const prevYear = fullYear - 1;
          const shortYearStr = String(fullYear).slice(-2);
          year = `${prevYear}-${shortYearStr}`;
        }
      }

      // Map paperType to examType (MTE, TEE)
      const examType = (paper.paperType || '').trim().toUpperCase() === 'TEE' ? 'TEE' : 'MTE';

      // Generate a unique ID (p_ prefix instead of pv_)
      const uniqueId = `p_${paper.id || crypto.randomBytes(8).toString('hex')}`;

      const mappedPaper = {
        courseCode,
        courseTitle,
        department,
        examType,
        year,
        semester,
        url: paperUrl,
        uploadedBy: 'Community',
        status: 'approved',
        createdAt: new Date().toISOString()
      };

      await savePaper(uniqueId, mappedPaper);
      existingUrls.add(paperUrl.toLowerCase()); // Avoid duplicates in the same run
      savedCount++;
    }

    console.log(`[Sync] Papers sync completed. Saved ${savedCount} new papers.`);
  } catch (error) {
    console.error('[Sync] Error syncing papers:', error);
  }
};

const saveOpportunities = async (opportunitiesData) => {
  if (dbConnectingPromise) {
    await dbConnectingPromise;
  }
  if (db) {
    try {
      // 1. Update/Upsert the metadata document
      await db.collection('opportunities').updateOne(
        { _id: 'metadata' },
        { $set: { lastUpdated: opportunitiesData.lastUpdated } },
        { upsert: true }
      );
      
      // 2. Remove all existing individual opportunity documents
      await db.collection('opportunities').deleteMany({ _id: { $ne: 'metadata' } });
      
      // 3. Bulk insert fresh opportunities
      if (opportunitiesData.opportunities && opportunitiesData.opportunities.length > 0) {
        const docs = opportunitiesData.opportunities.map(opp => ({
          ...opp,
          _id: opp.id || `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        await db.collection('opportunities').insertMany(docs);
      }
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


// Auto-unpin helper for ended events
const autoUnpinEndedEvents = async (eventsList) => {
  if (!Array.isArray(eventsList)) return;
  const now = Date.now();
  const endedPinnedEventIds = [];

  for (const event of eventsList) {
    if (event.pinned) {
      let eventEndTime = null;
      if (event.eventEndDateTime) {
        eventEndTime = new Date(event.eventEndDateTime).getTime();
      } else if (event.eventStartDateTime) {
        eventEndTime = new Date(event.eventStartDateTime).getTime();
      } else if (event.date) {
        eventEndTime = new Date(event.date).getTime();
      }

      if (eventEndTime && now > eventEndTime) {
        endedPinnedEventIds.push(event.id);
      }
    }
  }

  if (endedPinnedEventIds.length > 0) {
    console.log(`📌 Unpinning ${endedPinnedEventIds.length} ended events:`, endedPinnedEventIds);
    for (const id of endedPinnedEventIds) {
      try {
        await updateEvent(id, { pinned: false });
      } catch (err) {
        console.error(`Failed to automatically unpin event ${id}:`, err.message);
      }
    }
    // Update local representation in current request
    for (const event of eventsList) {
      if (endedPinnedEventIds.includes(event.id)) {
        event.pinned = false;
      }
    }
  }
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

      // Clear associated base64 image data from the 'uploads' collection and local disk
      const cleanPosterUrls = [
        event.posterUrl,
        ...(event.posterUrls || []),
        event.schedulePosterUrl
      ].filter(Boolean);

      for (const pUrl of cleanPosterUrls) {
        let filename = '';
        if (pUrl.startsWith('/uploads/')) {
          filename = pUrl.replace('/uploads/', '');
        } else if (pUrl.includes('/uploads/')) {
          filename = pUrl.split('/uploads/')[1];
        }

        if (filename) {
          filename = filename.split('?')[0].split('#')[0];
          if (db) {
            try {
              await db.collection('uploads').deleteOne({ filename });
            } catch (err) {
              console.error("Failed to delete poster from database:", err.message);
            }
          }
          // Local fallback delete
          const filePath = path.join(UPLOADS_DIR, filename);
          try {
            await fs.promises.access(filePath);
            await fs.promises.unlink(filePath);
            console.log(`Successfully unlinked expired event poster file: ${filename}`);
          } catch (e) {
            // File doesn't exist or is not accessible
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

// PBKDF2 & Scrypt Password Hashing
const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};

const hashPasswordLegacy = (password, salt) => {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
  return hash.toString('hex');
};

const hashPasswordScrypt = (password, salt) => {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${hash.toString('hex')}`;
};

const hashPassword = (password, salt) => {
  return hashPasswordScrypt(password, salt);
};

const verifyPassword = (password, salt, storedHash) => {
  if (typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('scrypt$')) {
    const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
    const computed = `scrypt$${hash.toString('hex')}`;
    return computed === storedHash;
  }
  // Legacy PBKDF2 check
  const legacyComputed = hashPasswordLegacy(password, salt);
  return legacyComputed === storedHash;
};

const isStrongPassword = (password) => {
  if (typeof password !== 'string') return false;
  // Enforce strong password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

// Custom Session Token generation and validation (with password hash segment for session revocation)
const generateToken = async (email, passwordHash) => {
  const secret = await ensureJwtSecret();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  
  // Create a high-entropy, secure hash piece of the password hash to prevent exposing the hash format/value
  const hashPiece = crypto.createHash('sha256').update(passwordHash).digest('hex').substring(0, 16);
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${email}:${expiresAt}:${hashPiece}`);
  const signature = hmac.digest('hex');
  const base64Email = Buffer.from(email).toString('base64');
  
  return `${signature}.${base64Email}.${expiresAt}.${hashPiece}`;
};

const verifyToken = async (token) => {
  // Prevent DoS on massive input strings
  if (typeof token !== 'string' || token.length > 500) return null;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 4) return null;
    
    const [signature, base64Email, expiresAtStr, hashPiece] = parts;
    
    // Strict input formatting validation
    if (!/^[0-9a-fA-F]{64}$/.test(signature)) return null;
    if (!/^[0-9]+$/.test(expiresAtStr)) return null;
    if (!/^[0-9a-fA-F]{16}$/.test(hashPiece)) return null;
    
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return null;
    
    const email = Buffer.from(base64Email, 'base64').toString('utf-8');
    
    // Verify signature FIRST (Fast-path rejection without querying database or files)
    const secret = await ensureJwtSecret();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${email}:${expiresAt}:${hashPiece}`);
    const expectedSignature = hmac.digest('hex');
    
    const sigBuffer = Buffer.from(signature, 'hex');
    const expBuffer = Buffer.from(expectedSignature, 'hex');
    
    // Constant-time check to prevent signature-forgery timing attacks
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      return null;
    }
    
    // Verify active session exists in DB/memory cache
    const isSessionValid = await verifySession(token);
    if (!isSessionValid) {
      return null;
    }
    
    // Token signature is authentic (issued by us). Now fetch the user.
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) return null;
    
    // Verify password hash matches token's hashPiece to enforce session revocation on password change
    const currentHashPiece = crypto.createHash('sha256').update(user.passwordHash).digest('hex').substring(0, 16);
    if (hashPiece !== currentHashPiece) {
      return null; // Password changed, session is invalid
    }
    
    return user;
  } catch (e) {
    return null;
  }
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

const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  const user = await verifyToken(token);
  if (!user) {
    req.user = null;
    return next();
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
app.get('/api/db-status', authenticate, requireAdmin, (req, res) => {
  res.json({
    status: dbConnectionStatus,
    connected: !!db,
    error: dbConnectionError,
    uriConfigured: !!MONGODB_URI,
    uriObfuscated: MONGODB_URI ? MONGODB_URI.replace(/:([^@]+)@/, ':****@') : null
  });
});

// ================= AUTH ROUTES =================

app.get('/api/auth/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || '' });
});

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required.' });
    }

    // Verify token with Google API directly via HTTPS
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({ error: 'Google Sign-In is not configured on the server.' });
    }

    const tokenVerificationUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const googleResponse = await fetch(tokenVerificationUrl);
    if (!googleResponse.ok) {
      return res.status(400).json({ error: 'Invalid Google ID token.' });
    }

    const payload = await googleResponse.json();
    
    // Aud check (verify the client ID matches ours exactly)
    const aud = payload.aud;
    if (aud !== googleClientId) {
      return res.status(400).json({ error: 'Google ID token audience mismatch.' });
    }

    // Iss check
    const iss = payload.iss;
    if (iss !== 'accounts.google.com' && iss !== 'https://accounts.google.com') {
      return res.status(400).json({ error: 'Google ID token issuer mismatch.' });
    }

    const { email, name, email_verified, picture } = payload;
    if (!email) {
      return res.status(400).json({ error: 'Email not provided by Google account.' });
    }

    // Confirm that Google has verified this email
    if (email_verified !== 'true' && email_verified !== true) {
      return res.status(400).json({ error: 'This Google account email is not verified.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    let user = await findUserByEmail(lowerEmail);

    if (!user) {
      // Auto-registration Path
      let registrationNumber = '';
      let program = 'Global Member';
      let isVitBhopal = false;

      // Detect and parse student registration profile
      const vitRegex = /^[a-zA-Z.-]+\.[a-zA-Z0-9]+@vitbhopal\.ac\.in$/;
      if (vitRegex.test(lowerEmail)) {
        isVitBhopal = true;
        const parsed = parseVitBhopalEmail(lowerEmail);
        if (parsed) {
          registrationNumber = parsed.registrationNumber;
          program = parsed.program;
        }
      }

      // Generate a secure unique placeholder passwordHash so that token signature verifyToken functions properly
      const salt = generateSalt();
      const oauthPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = hashPassword(oauthPassword, salt);

      user = {
        name: name ? name.trim() : 'Google User',
        email: lowerEmail,
        isVitBhopal,
        registrationNumber,
        program,
        semester: 1,
        courses: [],
        passwordHash, // Cryptographic mock hash to satisfy verifyToken structure contract
        salt,
        xpPoints: 0,
        skillsProgress: {},
        role: isAdminEmail(lowerEmail) ? 'admin' : 'student',
        verified: true, // Auto-verified by Google
        picture: picture || '',
        createdAt: new Date().toISOString()
      };

      await saveUser(lowerEmail, user);
      await logActivity(lowerEmail, 'google_register', req);
    } else {
      // Existing User Path
      let updated = false;

      // Self-heal unverified accounts
      if (user.verified === false) {
        user.verified = true;
        delete user.verificationCode;
        delete user.verificationExpires;
        delete user.lastCodeSentAt;
        updated = true;
      }

      // Check/Upgrade Admin Role strictly (never downgrade)
      if (isAdminEmail(lowerEmail) && user.role !== 'admin') {
        user.role = 'admin';
        updated = true;
      }

      // Keep picture sync updated
      if (picture && user.picture !== picture) {
        user.picture = picture;
        updated = true;
      }

      if (updated) {
        await saveUser(lowerEmail, user);
      }

      await logActivity(lowerEmail, 'google_login', req);
    }

    // Generate Custom Session Token & Write Session Doc
    const token = await generateToken(lowerEmail, user.passwordHash);
    await createSession(lowerEmail, token, req);

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Google Auth Route Error:', error);
    res.status(500).json({ error: 'Failed to authenticate via Google.' });
  }
});

// 1. Register User (with email verification support & unverified recycling)
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || (!process.env.NODE_ENV && !process.env.VERCEL);
    if (!smtpHealthy && !isDev) {
      return res.status(503).json({ error: '🔧 Registration is temporarily unavailable due to maintenance. Please try again later.' });
    }
    const { name, email, password, isVitBhopal, courses, semester } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
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
      const generalRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
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
      const htmlContent = getHtmlEmailTemplate(
        name.trim(),
        'Verify your VIT Life account',
        `Welcome to VIT Life, ${name.trim()}!`,
        'Thank you for registering. Please use the verification code below to complete your account setup and sign in.',
        rawCode,
        'This code is valid for 15 minutes.'
      );
      await sendMailHelper(
        lowerEmail,
        'VIT Life - Email Verification Code',
        `Hello ${name.trim()},\n\nThank you for registering. Your verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`,
        htmlContent
      );
      console.log(`Verification email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      if (isDev) {
        console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
        console.log(`TO: ${lowerEmail}`);
        console.log(`SUBJECT: VIT Life - Email Verification Code`);
        console.log(`Your verification code is: ${rawCode}`);
        console.log(`================================================================`);
      }
    }

    res.json({ 
      success: true, 
      message: 'Verification code sent.', 
      email: lowerEmail,
      ...((!transporter || !smtpHealthy || isDev) && { devCode: rawCode })
    });
  } catch (error) {
    console.error('Server registration error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred during registration.' });
  }
});

// Verification Endpoint
app.post('/api/auth/verify', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
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

    const token = await generateToken(lowerEmail, user.passwordHash);
    await createSession(lowerEmail, token, req);

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Verification failed:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// Resend Verification Code Endpoint
app.post('/api/auth/resend-code', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || (!process.env.NODE_ENV && !process.env.VERCEL);
    if (!smtpHealthy && !isDev) {
      return res.status(503).json({ error: '🔧 Email service is temporarily unavailable. Please try again later.' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
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
      const htmlContent = getHtmlEmailTemplate(
        user.name,
        'Verify your VIT Life account',
        'Email Verification Code',
        'Please use the new verification code below to complete your account setup and sign in.',
        rawCode,
        'This code is valid for 15 minutes.'
      );
      await sendMailHelper(
        lowerEmail,
        'VIT Life - Email Verification Code',
        `Hello ${user.name},\n\nYour new verification code is: ${rawCode}\n\nThis code is valid for 15 minutes.`,
        htmlContent
      );
      console.log(`Resend verification email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background resend email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      if (isDev) {
        console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
        console.log(`TO: ${lowerEmail}`);
        console.log(`SUBJECT: VIT Life - Resend Verification Code`);
        console.log(`Your verification code is: ${rawCode}`);
        console.log(`================================================================`);
      }
    }

    res.json({ 
      success: true, 
      message: 'New verification code sent.',
      ...((!transporter || !smtpHealthy || isDev) && { devCode: rawCode })
    });
  } catch (error) {
    console.error('Failed to resend code:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while sending verification code.' });
  }
});

// 2. Login User (with verified checking)
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Progressive self-healing migration to Scrypt
    if (!user.passwordHash.startsWith('scrypt$')) {
      user.passwordHash = hashPasswordScrypt(password, user.salt);
      console.log(`🔒 Auto-migrated user ${lowerEmail} password hash from PBKDF2 to Scrypt.`);
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

    const token = await generateToken(lowerEmail, user.passwordHash);
    await createSession(lowerEmail, token, req);

    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('Server authentication error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// Real-time session event stream (Server-Sent Events)
app.get('/api/user/sessions/events', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const token = req.query.token;
  if (!token) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Missing token' })}\n\n`);
    res.end();
    return;
  }

  let decoded;
  try {
    decoded = await verifyToken(token);
    if (!decoded) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid token' })}\n\n`);
      res.end();
      return;
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid token signature' })}\n\n`);
    res.end();
    return;
  }

  const email = decoded.email.toLowerCase().trim();
  const signature = token.split('.')[0];
  const tokenHash = crypto.createHash('sha256').update(signature).digest('hex');

  // Keep connection alive with heartbeat ping
  const pingInterval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
  }, 30000);

  const clientInfo = {
    email,
    tokenHash,
    res,
    pingInterval
  };

  sseClients.push(clientInfo);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(c => c !== clientInfo);
  });
});

// Get all active sessions for the logged-in user
app.get('/api/user/sessions', authenticate, async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();
    const sessions = await getUserSessions(email);
    
    // Hash the signature part of current token from request to identify the current session
    const authHeader = req.headers.authorization;
    let currentSessionId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const currentToken = authHeader.substring(7);
      const signature = currentToken.split('.')[0];
      const currentTokenHash = crypto.createHash('sha256').update(signature).digest('hex');
      const currentSession = sessions.find(s => s.tokenHash === currentTokenHash);
      if (currentSession) {
        currentSessionId = currentSession._id || currentSession.id;
      }
    }
    
    // Map sessions to exclude sensitive tokenHash and convert MongoDB object IDs to strings
    const safeSessions = sessions.map(s => {
      const sId = s._id ? s._id.toString() : s.id;
      return {
        id: sId,
        userAgent: s.userAgent || 'Unknown Device',
        ipAddress: s.ip || 'Unknown IP',
        location: s.location || 'Unknown Location',
        createdAt: s.createdAt,
        lastActiveAt: s.lastActive || s.lastActiveAt,
        isCurrent: sId === (currentSessionId ? currentSessionId.toString() : null)
      };
    });
    
    res.json({ sessions: safeSessions });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching sessions.' });
  }
});

// Revoke a specific session
app.delete('/api/user/sessions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const email = req.user.email.toLowerCase();
    
    // Fetch target session details before deleting it, so we get its tokenHash
    let targetSession = null;
    if (db) {
      let query = { email };
      try {
        query._id = new ObjectId(id);
      } catch {
        query._id = id;
      }
      targetSession = await db.collection('sessions').findOne(query);
    } else {
      targetSession = inMemorySessions.get(id);
    }

    const revoked = await revokeSession(id, email);
    if (!revoked) {
      return res.status(404).json({ error: 'Session not found or unauthorized.' });
    }

    if (targetSession && targetSession.tokenHash) {
      notifySessionRevoked(targetSession.tokenHash);
    }
    
    res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error) {
    console.error('Failed to revoke session:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while revoking session.' });
  }
});

// Revoke all sessions except current
app.post('/api/user/sessions/revoke-others', authenticate, async (req, res) => {
  try {
    const email = req.user.email.toLowerCase();
    const authHeader = req.headers.authorization;
    let currentToken = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      currentToken = authHeader.substring(7);
    }
    
    if (!currentToken) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    
    const signature = currentToken.split('.')[0];
    const currentTokenHash = crypto.createHash('sha256').update(signature).digest('hex');

    await revokeAllSessionsExcept(email, currentToken);

    notifyAllOtherSessionsRevoked(email, currentTokenHash);

    res.json({ success: true, message: 'All other sessions revoked successfully.' });
  } catch (error) {
    console.error('Failed to revoke other sessions:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while revoking other sessions.' });
  }
});

// Backend Logout Endpoint to revoke the current session
app.post('/api/auth/logout', authenticate, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await deleteSession(token);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Failed to logout:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while logging out.' });
  }
});

// Forgot Password Request Endpoint
app.post('/api/auth/forgot-password', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const isDev = process.env.NODE_ENV === 'development' || (!process.env.NODE_ENV && !process.env.VERCEL);
    if (!smtpHealthy && !isDev) {
      return res.status(503).json({ error: '🔧 Password reset is temporarily unavailable due to maintenance. Please try again later.' });
    }
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
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
      const htmlContent = getHtmlEmailTemplate(
        user.name,
        'Reset your VIT Life password',
        'Password Reset Code',
        'We received a request to reset the password for your VIT Life account. Please use the password reset code below to choose a new password.',
        rawCode,
        'This code is valid for 15 minutes. If you did not request this, please ignore this email.'
      );
      await sendMailHelper(
        lowerEmail,
        'VIT Life - Password Reset Code',
        `Hello ${user.name},\n\nWe received a request to reset your password. Your password reset code is: ${rawCode}\n\nThis code is valid for 15 minutes. If you did not request this, please ignore this email.`,
        htmlContent
      );
      console.log(`Password reset email sent successfully to ${lowerEmail}`);
    } catch (err) {
      console.error("Background reset email sending failed to %s:", lowerEmail, err.message);
      // Fallback logging for developers
      if (isDev) {
        console.log(`================= DEVELOPER MODE MAIL FALLBACK =================`);
        console.log(`TO: ${lowerEmail}`);
        console.log(`SUBJECT: VIT Life - Password Reset Code`);
        console.log(`Your verification code is: ${rawCode}`);
        console.log(`================================================================`);
      }
    }

    res.json({
      ...genericSuccessResponse,
      ...((!transporter || !smtpHealthy || isDev) && { devCode: rawCode })
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// Reset Password Execution Endpoint
app.post('/api/auth/reset-password', authLimiter, authRateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    const lowerEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(lowerEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
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
    console.error('Failed to reset password:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while resetting password.' });
  }
});

// ================= SETTINGS ROUTE =================

// Get guide visibility setting
app.get('/api/settings/guide-visible', async (req, res) => {
  try {
    let visible = false; // Default is hidden
    if (db) {
      const doc = await db.collection('settings').findOne({ key: 'guide_visible' });
      if (doc) {
        visible = !!doc.value;
      }
    } else {
      visible = global.guideVisible || false;
    }
    res.json({ visible });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// Update guide visibility setting (Admin only)
app.post('/api/settings/guide-visible', authenticate, requireAdmin, async (req, res) => {
  try {
    const { visible } = req.body;
    if (typeof visible !== 'boolean') {
      return res.status(400).json({ error: 'visible (boolean) is required.' });
    }
    
    if (db) {
      await db.collection('settings').updateOne(
        { key: 'guide_visible' },
        { $set: { value: visible } },
        { upsert: true }
      );
    } else {
      global.guideVisible = visible;
    }
    
    res.json({ success: true, visible });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// Get events lock setting
app.get('/api/settings/events-locked', async (req, res) => {
  try {
    let locked = true; // Default is locked
    if (db) {
      const doc = await db.collection('settings').findOne({ key: 'events_locked' });
      if (doc) {
        locked = !!doc.value;
      }
    } else {
      locked = global.eventsLocked !== false; // Default is true
    }
    res.json({ locked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings.' });
  }
});

// Update events lock setting (Admin only)
app.post('/api/settings/events-locked', authenticate, requireAdmin, async (req, res) => {
  try {
    const { locked } = req.body;
    if (typeof locked !== 'boolean') {
      return res.status(400).json({ error: 'locked (boolean) is required.' });
    }
    
    if (db) {
      await db.collection('settings').updateOne(
        { key: 'events_locked' },
        { $set: { value: locked } },
        { upsert: true }
      );
    } else {
      global.eventsLocked = locked;
    }
    
    res.json({ success: true, locked });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings.' });
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
  res.json(sanitizeUser(userProfile));
});

// 4. Update User Profile Progress / Stats
app.post('/api/user/profile', authenticate, async (req, res) => {
  try {
    const { name, xpPoints, skillsProgress, courses, semester, timetable } = req.body;
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
    if (timetable !== undefined) {
      user.timetable = Array.isArray(timetable) ? timetable : [];
    }

    await saveUser(req.user.email, user);
    await logActivity(req.user.email, 'update_profile', req);

    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Server profile update error:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// ================= MESS MENU PROXY (messmenu.me) =================

// In-memory cache for mess menu data  { messId: { data, fetchedAt } }
const messMenuCache = {};
const MESS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const VALID_MESS_IDS = [
  'mayuri-boys', 'jmb-boys', 'crcl-boys', 'safal-boys', 'ab-girls', 'mayuri-girls'
];

const MESS_NAMES = {
  'mayuri-boys': 'Mayuri Boys Mess',
  'jmb-boys': 'JMB Boys Mess',
  'crcl-boys': 'CRCL Mess',
  'safal-boys': 'Safal Mess',
  'ab-girls': 'AB Girls Mess',
  'mayuri-girls': 'Mayuri Girls Mess'
};

const MAYURI_BOYS_NEW_MENU = {
  // 0: Sunday
  0: {
    breakfast: 'Masala Dosa / Mix Veg Dosa, Sambhar, Chutney, Sprouts, Banana, Boiled Egg, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Plain Roti, Veg Biryani, Butter Paneer Masala, Chicken Biryani (Limited Spices), Onion Raita, Dal Kolhapuri, Pickle',
    snacks: 'Pasta (White/Red Sauce), Sauce/Chutney, Tea, Coffee, Milk',
    dinner: 'Roti, Aloo White Peas Masala, Dal Makhani, Plain Rice - South, Carrot/Cabbage Poriyal, Paruppu Rasam (Pulses), Veg Shorba Soup, Gulab Jamun'
  },
  // 1: Monday
  1: {
    breakfast: 'Idli, Vada, Sambhar, Chutney, Banana, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Tawa Roti, Jeera Aloo / Sev Tamatar, Daal Fry, Butter Milk, Mix Salad, Plain Rice - North & South, More Kuzhambu, Raw Banana Poriyal, Pepper Rasam, Pickle',
    snacks: 'Kachori, Tamarind Chutney, Tea, Milk, Coffee',
    dinner: 'Butter Roti / Plain Roti, Kadhai Mix Veg, Egg Gravy, Veg Poriyal, Plain Rice - North & South, Tomato Rasam, Yellow Daal, Rice Kheer'
  },
  // 2: Tuesday
  2: {
    breakfast: 'Poha, Jalebi, Pongal, Chutney, Jeera Man, Mix Cut Fruit, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Puri, White Channa [Md-Spicy], Mix Daal, Mix Salad, Plain Rice - North & South, Bottle Gourd Kuzhambu, Tomato Rasam, Butter Milk / Juice, Pickle',
    snacks: 'Variety of Samosa (Aloo Gobhi/Matar), Red Sauce, Green Chutney, Tea, Coffee, Milk',
    dinner: 'Butter Roti / Plain Roti, Fruit Custard, Veg Jalfrezi / Soya Badi Masala, Dal Tadka, Plain Rice - North & South, Pepper Rasam, Pickle'
  },
  // 3: Wednesday
  3: {
    breakfast: 'Pav Bhaji, Upma, Chutney, Sprouts, Banana, Boiled Egg, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Roti, Veg Kofta, Dal Tadka, Matar Pulao, Fryums, Sweet Boondi, Plain Rice - South, Vegetable Sambar, Paruppu Rasam, Pickle',
    snacks: 'Cutlet (2 Nos.), Red Chilli Sauce, Tea, Coffee, Milk',
    dinner: 'Butter Roti, Paneer Masala (Less Oil & Spices), Kadai Chicken Masala (Less Oil & Spices), Plain Dal, Plain Rice - North & South, Ingi Rasam, Pickle, Butter Roti'
  },
  // 4: Thursday
  4: {
    breakfast: 'Aloo Paratha, Dahi, Banana, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Roti - Plain, Rajma, Jeera Rice, Seasonal-Veg, Mixed Veg Salad, Rice - Plain, Veg-Sambar, Beetroot Priyal, Rasam, Pickle',
    snacks: 'Noodles / Fried Idli, Sauce / Coconut Chutney, Tea, Coffee, Milk',
    dinner: 'Butter Roti (Plain), Egg Gravy, Green Peas Masala, Dal Fry, Jeera Rice, Sooji Halwa, Pepper Rasam, Pickle'
  },
  // 5: Friday
  5: {
    breakfast: 'Onion Uthappam, Onion Tomato Chutney, Sprouts, Fruit Salad, Boiled Egg, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Roti - Plain, Kadi Pakoda, Dal Fry, Plain Rice, Mix Salad, Plain Rice - South, Brinjal Kuzhambu, Veg Aviyal, Beetroot Priyal, Pickle',
    snacks: 'Vada Pav, Green Chutney, Tea, Coffee, Milk',
    dinner: 'Plain Roti, Tandoori Butter Chicken Gravy, Kadai Paneer, Dal Tadka - Medium Spicy, Plain Rice - North & South, Puli Rasam (Tamarind), Pickle'
  },
  // 6: Saturday
  6: {
    breakfast: 'Chole with Lemon Slice, Bhature, Mix Cut Fruit, Bread, Butter, Jam, Tea, Milk, Coffee',
    lunch: 'Roti - Plain, Aloo Hara Matar / Gilki Masala, Ghee Rice, Dal Makhni, Plain Rice - South, Potato Kara Poriyal, Butter Milk, Mix Veg Sambar, Rasam, Pickle',
    snacks: 'Bread Pakoda, Red Tomato Chutney, Tea, Coffee, Milk',
    dinner: 'Plain Roti, Veg Pulao, Lobia Gravy (Chawli), Toor Dal Fry, Plain Rice - South, Paruppu Rasam, Pickle'
  }
};

const MEAL_KEYS = ['breakfast', 'lunch', 'snacks', 'dinner'];

/**
 * Fetch live mess menu from messmenu.me using their Next.js Server Action protocol.
 * The action ID for getAggregatedHomeData was extracted from their client-side JS bundle.
 */
async function fetchMessMenuFromSource(messId) {
  const actionId = '70c08e42ee3ced6e6ce7b926e908014a4c37561304';
  const collegeId = 'vit-bhopal';

  const response = await fetch('https://messmenu.me/vit-bhopal', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/x-component',
      'Next-Action': actionId,
      'Accept': 'text/x-component',
      'Next-Router-State-Tree': JSON.stringify([
        '',
        { children: [['collegeSlug', 'vit-bhopal', 'd'], { children: ['__PAGE__', {}] }] },
        null, null, true
      ])
    },
    body: JSON.stringify([false, collegeId, messId])
  });

  if (!response.ok) {
    throw new Error(`messmenu.me responded with status ${response.status}`);
  }

  const text = await response.text();

  // Parse the RSC (React Server Component) response – data is on lines starting with "1:"
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.startsWith('1:')) {
      const payload = JSON.parse(line.substring(2));
      if (payload.menu && payload.menu.success && payload.menu.data) {
        // payload.menu.data is an array of 7 days (Sun=0 … Sat=6)
        // Each day is an array of 4 strings: [breakfast, lunch, snacks, dinner]
        const rawDays = payload.menu.data;
        const menu = {};
        for (let dayIndex = 0; dayIndex < rawDays.length; dayIndex++) {
          const dayArr = rawDays[dayIndex];
          if (!dayArr) continue;
          menu[dayIndex] = {};
          for (let mealIdx = 0; mealIdx < MEAL_KEYS.length; mealIdx++) {
            const rawItems = dayArr[mealIdx] || 'Menu not available';
            // Clean up: remove leading * markers used by messmenu.me for highlighting
            const cleaned = rawItems.replace(/\*/g, '').trim();
            menu[dayIndex][MEAL_KEYS[mealIdx]] = cleaned;
          }
        }
        return menu;
      }
    }
  }

  throw new Error('Could not parse menu data from messmenu.me response');
}

// GET /api/mess-menu/:messId  –  Public endpoint, no auth required
app.get('/api/mess-menu/:messId', async (req, res) => {
  const { messId } = req.params;

  if (!VALID_MESS_IDS.includes(messId)) {
    return res.status(400).json({
      success: false,
      error: `Invalid mess ID. Valid IDs: ${VALID_MESS_IDS.join(', ')}`
    });
  }

  // Serve the updated static June 2026 menu for Mayuri Mess
  if (messId === 'mayuri-boys' || messId === 'mayuri-girls') {
    return res.json({
      success: true,
      cached: false,
      data: { name: MESS_NAMES[messId], menu: MAYURI_BOYS_NEW_MENU }
    });
  }

  // Check cache
  const cached = messMenuCache[messId];
  if (cached && (Date.now() - cached.fetchedAt) < MESS_CACHE_TTL) {
    return res.json({
      success: true,
      cached: true,
      data: { name: MESS_NAMES[messId], menu: cached.data }
    });
  }

  try {
    const menu = await fetchMessMenuFromSource(messId);
    // Store in cache
    messMenuCache[messId] = { data: menu, fetchedAt: Date.now() };

    res.json({
      success: true,
      cached: false,
      data: { name: MESS_NAMES[messId], menu }
    });
  } catch (error) {
    console.error(`[Mess Menu] Failed to fetch menu for ${messId}:`, error.message);

    // If we have stale cache, serve it with a warning
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        stale: true,
        data: { name: MESS_NAMES[messId], menu: cached.data }
      });
    }

    res.status(502).json({
      success: false,
      error: 'Unable to fetch mess menu data. Please try again later.'
    });
  }
});

// GET /api/mess-menu  –  List all available messes
app.get('/api/mess-menu', (req, res) => {
  res.json({
    success: true,
    messes: VALID_MESS_IDS.map(id => ({ id, name: MESS_NAMES[id] }))
  });
});

// ================= STUDENT PAPERS (PYQ) ROUTES =================

// 1. GET /api/papers - Get approved papers with optional search and department filters
app.get('/api/papers', async (req, res) => {
  try {
    const { department, search } = req.query;

    // Cooldown check for on-demand sync: 10 minutes (600,000 ms)
    const now = Date.now();
    if (now - lastPassVitianSyncTime > 10 * 60 * 1000) {
      // Trigger sync asynchronously without blocking the response
      syncPassVitianPapers().catch(err => console.error('[Sync] On-demand PassVitian sync failed:', err));
    }

    let list = await getPapers();
    
    // Filter only approved papers for public view
    list = list.filter(p => p.status === 'approved');

    if (department) {
      list = list.filter(p => p.department === department);
    }

    if (search) {
      const cleanSearch = search.trim().toLowerCase();
      list = list.filter(p => 
        p.courseCode.toLowerCase().includes(cleanSearch) || 
        p.courseTitle.toLowerCase().includes(cleanSearch)
      );
    }

    res.json({ success: true, papers: list });
  } catch (error) {
    console.error('GET /api/papers error:', error);
    res.status(500).json({ error: 'Failed to retrieve papers.' });
  }
});

// 2. GET /api/papers/moderation - Get pending papers (Admin Only)
app.get('/api/papers/moderation', authenticate, requireAdmin, async (req, res) => {
  try {
    let list = await getPapers();
    const pending = list.filter(p => p.status === 'pending');
    res.json({ success: true, papers: pending });
  } catch (error) {
    console.error('GET /api/papers/moderation error:', error);
    res.status(500).json({ error: 'Failed to retrieve pending papers.' });
  }
});

// 3. POST /api/papers - Upload a new paper (Authenticated & Guests)
app.post('/api/papers', optionalAuthenticate, async (req, res) => {
  try {
    const { courseCode, courseTitle, department, examType, year, semester, url, fileData, fileName, examDate } = req.body;

    if (!courseCode || !courseTitle || !examType || !year || !semester) {
      return res.status(400).json({ error: 'All fields (courseCode, courseTitle, examType, year, semester) are required.' });
    }

    let fileUrl = url || '';

    // Handle base64 file upload if present
    if (fileData && fileName) {
      const fileExtension = (path.extname(fileName) || '').toLowerCase();
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif'];
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(400).json({ error: 'Only PDF and image files (PDF, JPG, JPEG, PNG, WEBP, GIF) are allowed.' });
      }

      const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], 'base64');
        if (isCloudinaryConfigured) {
          try {
            // Revert back to 'auto' (image) to allow inline viewing, but requires Cloudinary settings change
            const resType = 'auto';
            fileUrl = await uploadToCloudinary(buffer, 'vitlife_papers', resType);
          } catch (cloudinaryErr) {
            console.error('Cloudinary upload failed, falling back to local:', cloudinaryErr);
            const fileExtension = path.extname(fileName) || '.pdf';
            const uniqueName = `paper_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
            const filePath = path.join(uploadsDir, uniqueName);
            fs.writeFileSync(filePath, buffer);
            fileUrl = `/uploads/${uniqueName}`;
          }
        } else {
          const fileExtension = path.extname(fileName) || '.pdf';
          const uniqueName = `paper_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExtension}`;
          const filePath = path.join(uploadsDir, uniqueName);
          fs.writeFileSync(filePath, buffer);
          fileUrl = `/uploads/${uniqueName}`;
        }
      } else {
        return res.status(400).json({ error: 'Invalid file data format.' });
      }
    }

    if (!fileUrl) {
      return res.status(400).json({ error: 'Please enter a URL or upload a file.' });
    }

    // Basic URL validation only if it is not an uploaded local file
    if (!fileUrl.startsWith('/uploads/') && !fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Please enter a valid URL (starting with http:// or https://) or upload a file.' });
    }

    // Infer department if not provided
    let inferredDept = department;
    if (!inferredDept) {
      const code = courseCode.trim().toUpperCase();
      if (code.startsWith('MAT3002') || code.startsWith('MAT2003')) {
        inferredDept = 'DSA';
      } else if (code.startsWith('CSE') || code.startsWith('CSD')) {
        inferredDept = 'CSE';
      } else if (code.startsWith('ECE')) {
        inferredDept = 'ECE';
      } else if (code.startsWith('EEE')) {
        inferredDept = 'EEE';
      } else if (code.startsWith('MEE')) {
        inferredDept = 'MEE';
      } else if (code.startsWith('CIV')) {
        inferredDept = 'CIV';
      } else if (code.startsWith('ASE')) {
        inferredDept = 'ASE';
      } else if (code.startsWith('MAT') || code.startsWith('CCA')) {
        inferredDept = 'AIM';
      } else {
        const match = code.match(/^[A-Z]+/);
        inferredDept = match ? match[0] : 'CSE';
      }
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const paperId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newPaper = {
      courseCode: courseCode.trim().toUpperCase(),
      courseTitle: courseTitle.trim(),
      department: inferredDept.trim().toUpperCase(),
      examType: examType.trim(),
      year: year.trim(),
      semester: parseInt(semester, 10) || 1,
      url: fileUrl.trim(),
      examDate: examDate ? examDate.trim() : null,
      uploadedBy: req.user ? req.user.email : 'Community',
      status: isAdmin ? 'approved' : 'pending',
      createdAt: new Date().toISOString()
    };

    await savePaper(paperId, newPaper);

    res.status(201).json({
      success: true,
      message: isAdmin ? 'Paper uploaded and approved successfully!' : 'Paper submitted successfully! It will appear once approved by an administrator.',
      paper: { _id: paperId, ...newPaper }
    });
  } catch (error) {
    console.error('POST /api/papers error:', error);
    res.status(500).json({ error: 'Failed to submit paper.' });
  }
});

// 4. PUT /api/papers/:id/approve - Approve a pending paper (Admin Only)
app.put('/api/papers/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const list = await getPapers();
    const paper = list.find(p => p._id === id);

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found.' });
    }

    paper.status = 'approved';
    await savePaper(id, paper);

    res.json({ success: true, message: 'Paper approved successfully.' });
  } catch (error) {
    console.error('PUT /api/papers/:id/approve error:', error);
    res.status(500).json({ error: 'Failed to approve paper.' });
  }
});

// 5. DELETE /api/papers/:id - Reject or delete a paper (Admin Only)
app.delete('/api/papers/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const list = await getPapers();
    const paper = list.find(p => p._id === id);

    if (!paper) {
      return res.status(404).json({ error: 'Paper not found.' });
    }

    await deletePaper(id);
    res.json({ success: true, message: 'Paper deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/papers/:id error:', error);
    res.status(500).json({ error: 'Failed to delete paper.' });
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
    console.error('Failed to read database:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// 2. POST Route: Trigger research and stream logs in real time
app.post('/api/research', authenticate, requireAdmin, (req, res) => {
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
    console.error('Failed to fetch clubs:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching clubs.' });
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
    console.error('Failed to fetch club:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching club.' });
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
    console.error('Failed to update club:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while updating club.' });
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
    console.error('Failed to create club:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while creating club.' });
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
    console.error('Failed to delete club:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while deleting club.' });
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
        const dbUsers = await db.collection('users').find(
          { role: 'club_manager', clubId: id, verified: true }  // exclude unverified
        ).toArray();
        managers = dbUsers.map(u => ({ name: u.name, email: u.email, role: u.role, clubId: u.clubId }));
      } catch (err) {
        console.error("MongoDB get club managers error:", err);
      }
    }
    if (managers.length === 0) {
      const localUsers = loadUsers();
      managers = Object.values(localUsers)
        .filter(u => u.role === 'club_manager' && u.clubId === id && u.verified === true)  // exclude unverified
        .map(u => ({ name: u.name, email: u.email, role: u.role, clubId: u.clubId }));
    }
    res.json({ managers });
  } catch (error) {
    console.error('Failed to fetch club managers:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching club managers.' });
  }
});


// --- EVENTS ---
app.get('/api/events', async (req, res) => {
  try {
    const category = req.query.category || null;
    const events = await getEvents(category);
    
    // Automatically unpin ended events
    await autoUnpinEndedEvents(events);
    
    // Mask admin emails in createdBy
    const adminEmails = await getAdminEmails();
    const processedEvents = events.map(event => {
      const creatorEmail = (event.createdBy || '').toLowerCase().trim();
      if (adminEmails.has(creatorEmail) || creatorEmail === 'admin') {
        return { ...event, createdBy: 'Admin' };
      }
      return event;
    });
    
    res.json({ events: processedEvents });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching events.' });
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
    
    const processedEvent = {
      ...eventData,
      createdBy: req.user.role === 'admin' ? 'Admin' : eventData.createdBy
    };
    res.json({ success: true, event: processedEvent });
  } catch (error) {
    console.error('Failed to create event:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while creating event.' });
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
    console.error('Failed to delete event:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while deleting event.' });
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

    const adminEmails = await getAdminEmails();
    const eventToSend = { ...event, ...updatedData };
    const creatorEmail = (eventToSend.createdBy || '').toLowerCase().trim();
    if (adminEmails.has(creatorEmail) || creatorEmail === 'admin') {
      eventToSend.createdBy = 'Admin';
    }

    res.json({ success: true, event: eventToSend });
  } catch (error) {
    console.error('Failed to update event:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while updating event.' });
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
    console.error('Failed to pin event:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while pinning event.' });
  }
});

// Track event impressions/views (trending calculation)
const impressionLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many requests.' } });
app.post('/api/events/:id/impression', impressionLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update in MongoDB
    if (dbConnectingPromise) await dbConnectingPromise;
    if (db) {
      await db.collection('events').updateOne({ id: id }, { $inc: { impressions: 1 } });
      return res.json({ success: true });
    }
    
    // Fallback to local file only if MongoDB is not available
    if (fs.existsSync(EVENTS_FILE)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
        const idx = (fileData.events || []).findIndex(e => e.id === id);
        if (idx !== -1) {
          fileData.events[idx].impressions = (fileData.events[idx].impressions || 0) + 1;
          fs.writeFileSync(EVENTS_FILE, JSON.stringify(fileData, null, 2), 'utf-8');
        }
      } catch (e) {}
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to record event impression:', error);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// --- RECRUITMENTS ---
app.get('/api/recruitments', async (req, res) => {
  try {
    const recruitments = await getRecruitments();
    res.json({ recruitments });
  } catch (error) {
    console.error('Failed to fetch recruitments:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching recruitments.' });
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
    console.error('Failed to create recruitment:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while creating recruitment.' });
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
    console.error('Failed to delete recruitment:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while deleting recruitment.' });
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

  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (user && isAdminEmail(user.email)) {
      isAdmin = true;
    }
  }

  res.json({
    smtpHealthy,
    smtpError: isAdmin ? smtpError : undefined,
    smtpHost: isAdmin ? (process.env.SMTP_HOST || null) : undefined,
    smtpPort: isAdmin ? (process.env.SMTP_PORT || null) : undefined,
    smtpUser: isAdmin ? (process.env.SMTP_USER || null) : undefined,
    hasPass: isAdmin ? !!process.env.SMTP_PASS : undefined
  });
});

// Database Health Check Endpoint
app.get('/api/health/db', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  
  if (!db && MONGODB_URI) {
    try {
      console.log('🔄 Attempting to dynamically reconnect to MongoDB Atlas...');
      if (!client) {
        client = new MongoClient(MONGODB_URI, {
          connectTimeoutMS: 5000,
          serverSelectionTimeoutMS: 5000
        });
      }
      dbConnectingPromise = client.connect()
        .then(async c => {
          db = c.db();
          dbConnectionStatus = "Connected";
          dbConnectionError = null;
          console.log('✅ Dynamic MongoDB reconnection successful.');
          await ensureIndexes(db);
        })
        .catch(err => {
          dbConnectionStatus = "Failed";
          dbConnectionError = err.message || String(err);
          console.error('❌ Dynamic MongoDB reconnection failed:', err.message);
        });
      await dbConnectingPromise;
    } catch (err) {
      dbConnectionStatus = "Failed";
      dbConnectionError = err.message || String(err);
    }
  }

  const authHeader = req.headers.authorization;
  let isAdmin = false;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = await verifyToken(token);
    if (user && isAdminEmail(user.email)) {
      isAdmin = true;
    }
  }

  res.json({
    connected: !!db,
    status: dbConnectionStatus,
    error: isAdmin ? dbConnectionError : undefined,
    uriConfigured: isAdmin ? !!MONGODB_URI : undefined,
    uriObfuscated: (isAdmin && MONGODB_URI) ? MONGODB_URI.replace(/:([^@]+)@/, ':****@') : undefined
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

    // Try Cloudinary upload if configured
    if (isCloudinaryConfigured) {
      try {
        const cloudinaryUrl = await uploadToCloudinary(req.file.buffer);
        console.log("☁️ Successfully uploaded file to Cloudinary:", cloudinaryUrl);
        return res.json({ success: true, url: cloudinaryUrl });
      } catch (cloudErr) {
        console.error("☁️ Cloudinary upload failed, falling back to local/database storage:", cloudErr);
      }
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
      users = await db.collection('users').find(
          { verified: true },  // exclude unverified — they only appear in activity logs
          { projection: { name: 1, email: 1, role: 1, clubId: 1, registrationNumber: 1, program: 1, verified: 1, _id: 0 } }
        ).toArray();
      } catch (err) {
        console.error("MongoDB admin/users error:", err);
      }
    }
    if (users.length === 0) {
      const localUsers = loadUsers();
      users = Object.values(localUsers)
        .filter(u => u.verified === true)  // exclude unverified users
        .map(u => ({
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
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while fetching users.' });
  }
});

app.post('/api/admin/promote', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email, role, clubId } = req.body;
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
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
    
    // Block promoting unverified users — they must verify email first
    if (targetUser.verified !== true) {
      return res.status(400).json({ error: 'Cannot promote an unverified user. The user must verify their email first.' });
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
    console.error('Failed to promote user:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while promoting user.' });
  }
});

app.post('/api/admin/demote', authenticate, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isSafeEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
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
    console.error('Failed to demote user:', error);
    res.status(500).json({ error: 'An unexpected server error occurred while demoting user.' });
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
app.get('/uploads/:filename', uploadsLimiter, async (req, res) => {
  const { filename } = req.params;
  // Sanitize the filename to prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.resolve(UPLOADS_DIR, safeFilename);

  // Secure path validation
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // Local disk cache hit check
  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    return res.sendFile(filePath);
  }

  if (dbConnectingPromise) await dbConnectingPromise;
  if (db) {
    try {
      const fileDoc = await db.collection('uploads').findOne({ filename: safeFilename });
      if (fileDoc) {
        const imgBuffer = Buffer.from(fileDoc.data, 'base64');

        // Write to local disk cache to optimize future requests
        try {
          fs.writeFileSync(filePath, imgBuffer);
        } catch (writeErr) {
          console.error("Failed to write to local uploads cache:", writeErr);
        }

        res.setHeader('Content-Type', fileDoc.contentType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        return res.send(imgBuffer);
      }
    } catch (dbErr) {
      console.error("MongoDB Atlas retrieve upload error:", dbErr);
    }
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

// --- CRON CLEANUP ENDPOINT ---
app.get('/api/cron/cleanup', authenticate, requireAdmin, async (req, res) => {
  try {
    await cleanupExpiredEvents();
    res.json({ success: true, message: 'Expired events and assets cleanup completed.' });
  } catch (err) {
    console.error('Cron cleanup handler failed:', err);
    res.status(500).json({ error: 'Cleanup failed. Check server logs for details.' });
  }
});

app.get('/api/test-cloudinary', async (req, res) => {
  try {
    const status = {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured (' + process.env.CLOUDINARY_CLOUD_NAME + ')' : 'Missing',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Configured (len: ' + process.env.CLOUDINARY_API_KEY.length + ')' : 'Missing',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Configured (len: ' + process.env.CLOUDINARY_API_SECRET.length + ')' : 'Missing',
      isCloudinaryConfigured: !!isCloudinaryConfigured
    };

    if (!isCloudinaryConfigured) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured. Missing environment variables.',
        status
      });
    }

    // 1x1 transparent pixel PNG buffer
    const testBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const testUrl = await uploadToCloudinary(testBuffer, 'vitlife_test');
    res.json({
      success: true,
      message: 'Cloudinary test upload succeeded!',
      url: testUrl,
      status
    });
  } catch (error) {
    console.error('Cloudinary self-test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary test upload failed: ' + error.message,
      error: error,
      status: {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Configured (' + process.env.CLOUDINARY_CLOUD_NAME + ')' : 'Missing',
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Configured' : 'Missing',
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Configured' : 'Missing',
        isCloudinaryConfigured: !!isCloudinaryConfigured
      }
    });
  }
});

if (!process.env.VERCEL) {
  scheduleDailyScraper();

  // Run expired events cleanup locally on boot and then every 24 hours
  setTimeout(() => {
    cleanupExpiredEvents().catch(err => console.error("Local startup cleanup failed:", err));
  }, 10000); // 10s delay to allow DB connection to settle

  // Run PassVitian papers sync on startup
  setTimeout(() => {
    syncPassVitianPapers().catch(err => console.error("Startup PassVitian sync failed:", err));
  }, 5000); // 5s delay to allow DB connection to settle

  setInterval(() => {
    cleanupExpiredEvents().catch(err => console.error("Local interval cleanup failed:", err));
  }, 24 * 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`Express Backend running on port ${PORT}`);
    console.log(`=========================================`);
  });
}

export default app;
