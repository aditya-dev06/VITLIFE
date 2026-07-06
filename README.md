<p align="center">
  <img src="https://img.shields.io/badge/VIT_LIFE-College_Portal-blueviolet?style=for-the-badge&logoColor=white" alt="VIT Life" />
</p>

<h1 align="center">🎓 VIT Life</h1>

<p align="center">
  <strong>The all-in-one college lifestyle & management portal for VIT Bhopal University</strong><br/>
  <em>Events · Timetable · PYQs · Clubs · Opportunities · Roadmaps — all in one place.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Cloudinary-Uploads-3448C5?style=flat-square&logo=cloudinary&logoColor=white" />
  <img src="https://img.shields.io/badge/PWA-Installable-FF6F00?style=flat-square&logo=pwa&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white" />
</p>

<p align="center">
  <a href="https://vitlife.vercel.app"><strong>🌐 Live Demo</strong></a> ·
  <a href="#-features"><strong>Features</strong></a> ·
  <a href="#-getting-started"><strong>Setup</strong></a> ·
  <a href="#-architecture"><strong>Architecture</strong></a> ·
  <a href="#-security"><strong>Security</strong></a>
</p>

---

## 🚀 About

**VIT Life** is a feature-rich, production-grade college portal designed specifically for **VIT Bhopal University** students. It replaces scattered WhatsApp groups, Google Sheets, and disconnected apps with a single, beautiful, installable Progressive Web App.

Built with a modern stack (React 19 + Express 5 + MongoDB Atlas), it supports both **authenticated users** and **guest sessions** — so anyone can explore without signing up.

---

## ✨ Features

### 🏠 Dashboard
| Feature | Description |
|---|---|
| Personalized Greeting | Dynamic welcome message with time-of-day awareness |
| XP Progress System | Track skill progression across categories with visual bars |
| Next Class Tracker | Live countdown to your next class from timetable data |
| Live Mess Menu | Real-time menu from `messmenu.me` for all 6 VIT Bhopal hostel messes (6-hour cache) |
| Quick Actions | One-tap access to key features |

### 📅 Timetable & Schedule
| Feature | Description |
|---|---|
| **Paste-to-Parse** | Copy VTOP page text → paste → auto-extracts all class slots, rooms & types |
| Smart OCR Normalization | Handles messy text: `MAT2OO2` → `MAT2002`, `All` → `A11` |
| Room Detection | Detects classroom numbers across all VIT building codes (AB, LH, SJT, CR, etc.) |
| Mobile Day Tabs | Swipe between days with optimized mobile layout |
| Manual Editor | Add, edit, or delete individual slots |
| **Offline-First Sync** | Saves to `localStorage` instantly, syncs to cloud when online |
| Sync Indicator | Visual status: synced ✅ · syncing 🔄 · pending ⏳ · offline 📴 |
| First-Time Guide | Step-by-step VTOP instructions (auto-hides after first upload) |

### 🎪 College Life
| Feature | Description |
|---|---|
| Club Directory | Browse all clubs with descriptions, logos, and manager info |
| Event Calendar | Categories, poster galleries, RSVP links, and schedule posters |
| **Trending System** | Tracks impressions per event; shows top trending on dashboard |
| Pinned Events | Admin-only pinning for priority events |
| Recruitment Board | Active club recruitment listings with deadlines |

### 📚 Community (PYQs & Resources)
| Feature | Description |
|---|---|
| Upload & Share | Upload Previous Year Questions and study materials |
| **Guest Uploads** | Anyone can contribute — submissions go to admin moderation queue |
| Auto-Fill Course Names | Type a course code → auto-fills the title from existing papers |
| **Admin Moderation** | Review, approve ✅ or reject ❌ pending submissions with IP tracking |
| PDF Preview | Cloudinary-backed inline document previews |

### 🎯 Opportunities Hub
| Feature | Description |
|---|---|
| Auto-Scraped Listings | Internships, hackathons, competitions updated daily |
| Smart Filters | Filter by category, search by keyword |
| Scheduled Refresh | Background scraper keeps data fresh |

### 🗺️ Skill Roadmap
| Feature | Description |
|---|---|
| Interactive Skill Tree | Visual progression paths for CS/DS/AI tracks |
| Status Tracking | Not started → In progress → Completed |
| XP Points | Earn and track XP with progress bars |

### 🏫 VIT Bhopal Guide
| Feature | Description |
|---|---|
| Academic Resources | Guidelines, grading info, and campus-specific content |
| Privacy Policy & Terms | Full legal documentation built-in |

### 🔐 Authentication & Sessions
| Feature | Description |
|---|---|
| Email Verification | 6-digit code sent via SMTP before account activation |
| Google OAuth | One-click Google sign-in support |
| Password Reset | Forgot password flow with email-based reset codes |
| **Session Management** | View all active sessions (OS, browser, device, IP) and revoke individually |
| Guest Mode | Browse without an account — persistent UUID per browser |

### 📱 Progressive Web App
| Feature | Description |
|---|---|
| Installable | Works on mobile & desktop (Chrome, Edge, Samsung Browser) |
| Offline Access | Service worker caches API responses for offline use |
| Smart Install | In-app install button — auto-hides after installation |

### 🌗 Theming
| Feature | Description |
|---|---|
| Dark Mode (Default) | Deep blue-black with purple accent gradients |
| Light Mode | Clean white with preserved brand colors |
| Persistent | Theme preference saved in `localStorage` |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                   │
│  ┌──────────┬──────────┬──────────┬──────────┬────────┐ │
│  │Dashboard │Timetable │CampusLife│Community │  Auth  │ │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴───┬────┘ │
│       │          │          │          │         │       │
│  ┌────┴──────────┴──────────┴──────────┴─────────┴────┐ │
│  │              App.jsx (State Orchestrator)           │ │
│  │    Token · User · Theme · Timetable · Events       │ │
│  └────────────────────┬───────────────────────────────┘ │
│                       │ fetch('/api/*')                  │
└───────────────────────┼─────────────────────────────────┘
                        │
┌───────────────────────┼─────────────────────────────────┐
│              BACKEND (Express 5 + Node.js)              │
│  ┌────────────────────┴───────────────────────────────┐ │
│  │                   server.js                        │ │
│  │  Auth · Sessions · Events · Clubs · Papers · Admin │ │
│  └─────┬──────────┬──────────┬────────────────────────┘ │
│        │          │          │                           │
│   ┌────┴───┐ ┌────┴───┐ ┌───┴────┐                     │
│   │MongoDB │ │Cloudnry│ │  SMTP  │                     │
│   │ Atlas  │ │ Media  │ │ Email  │                     │
│   └────────┘ └────────┘ └────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19, Vite 8 | UI framework & build tooling |
| **Styling** | Vanilla CSS + CSS Variables | Design system with dark/light tokens |
| **Backend** | Express 5, Node.js | REST API, auth, business logic |
| **Database** | MongoDB Atlas | Primary data store (JSON file fallback) |
| **Cloud Storage** | Cloudinary | Image & PDF uploads for events/papers |
| **Email** | Nodemailer (SMTP) | Verification codes & password resets |
| **Animations** | GSAP, Motion, Three.js | Micro-animations & 3D effects |
| **Deployment** | Vercel | Serverless functions + CDN |
| **PWA** | Custom Service Worker | Offline caching & installability |

---

## 📁 Project Structure

```
vitlife/
├── public/
│   ├── favicon.svg                  # App icon
│   ├── manifest.json                # PWA manifest
│   ├── sw.js                        # Service worker (caching strategies)
│   └── vtop-timetable-guide.png     # Timetable guide image
│
├── server/
│   ├── server.js                    # Express backend (4800+ lines)
│   │   ├── Auth routes              # Register, login, verify, reset, OAuth
│   │   ├── Session management       # Create, verify, revoke, SSE
│   │   ├── Events/Clubs/Papers      # CRUD with admin moderation
│   │   ├── Timetable sync           # Cloud persistence for schedules
│   │   ├── Mess menu proxy          # Cached proxy to messmenu.me
│   │   └── Admin panel              # User management, promotions
│   └── data/                        # Local JSON fallback storage
│
├── src/
│   ├── App.jsx                      # Main orchestrator (state, routing, auth)
│   ├── main.jsx                     # Entry point + SW registration
│   ├── index.css                    # Global design system (CSS tokens)
│   ├── components/
│   │   ├── Auth.jsx                 # Login, signup, verification, guest
│   │   ├── Dashboard.jsx            # Home dashboard, stats, mess menu
│   │   ├── TimetablePage.jsx        # Paste-parser, grid view, manual editor
│   │   ├── CampusLife.jsx           # Clubs, events, recruitments
│   │   ├── CommunityPage.jsx        # PYQ sharing with admin moderation
│   │   ├── Opportunities.jsx        # Auto-scraped opportunities
│   │   ├── Roadmap.jsx              # Skill tree & XP tracking
│   │   ├── VITBhopalGuide.jsx       # Academic guidelines
│   │   ├── Hyperspeed.jsx           # Three.js background effects
│   │   ├── Dock.jsx                 # macOS-style animated dock
│   │   ├── BounceCards.jsx          # Physics-based card animations
│   │   ├── Masonry.jsx              # Pinterest-style poster gallery
│   │   ├── RotatingText.jsx         # Animated rotating text
│   │   ├── ElectricBorder.jsx       # Glowing border effects
│   │   ├── TypewriterText.jsx       # Typewriter animation
│   │   ├── PrivacyPolicy.jsx        # Legal: Privacy Policy
│   │   └── TermsAndConditions.jsx   # Legal: Terms & Conditions
│   └── hooks/
│       └── useTimetableSync.js      # Offline-first timetable sync hook
│
├── scripts/
│   ├── fetch_opportunities.py       # Python scraper for opportunities
│   └── postinstall.js               # Post-install setup script
│
├── .env.example                     # Environment template
├── vercel.json                      # Vercel deployment config
├── vite.config.js                   # Vite config with API proxy
└── package.json                     # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MongoDB Atlas** cluster (free tier works) — or the app falls back to local JSON files
- **Gmail account** with App Password for email verification (optional for dev)

### 1. Clone & Install

```bash
git clone https://github.com/aditya-dev06/VITLIFE.git
cd VITLIFE
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vitlife

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx

# Admin
ADMIN_EMAIL=your-admin@email.com

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
```

### 3. Run Development Server

```bash
npm run dev
```

This starts both servers concurrently:
- **Frontend** (Vite): `http://localhost:5175`
- **Backend** (Express): `http://localhost:5000`

> The Vite dev server proxies `/api/*` and `/uploads/*` to the Express backend automatically.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🌐 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | No | MongoDB Atlas connection string |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default: `465`) |
| `SMTP_USER` | No | Email for sending verification emails |
| `SMTP_PASS` | No | App Password for SMTP |
| `ADMIN_EMAIL` | No | Primary admin email (auto-promoted) |
| `JWT_SECRET` | No | Token signing secret (auto-generated if not set) |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |

> **💡 Tip**: The app works without any environment variables in dev mode. Verification codes print to console, and data stores in local JSON files.

---

## ☁️ Deployment (Vercel)

The project is pre-configured for Vercel with `vercel.json`:

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Add environment variables in the Vercel dashboard
3. Deploy — Vercel handles static build + serverless API routes automatically

---

## 👤 Guest vs Authenticated

| Feature | Guest | Authenticated |
|---|---|---|
| Dashboard, Opportunities, Events, Guide | ✅ | ✅ |
| Timetable (local storage) | ✅ | ✅ + cloud sync |
| Upload PYQs | ✅ (pending approval) | ✅ (auto-approved for admins) |
| College Life tab | ❌ | ✅ |
| Edit profile | ❌ | ✅ |
| Skill progress sync | ❌ | ✅ |
| Cloud data persistence | ❌ | ✅ |
| PWA install | ✅ | ✅ |

> Guest sessions use a persistent UUID stored in `localStorage`. Each browser/device gets a unique identity.

---

## 🔒 Security

### Authentication & Tokens
- **Scrypt password hashing** with unique salts per user
- **HMAC-SHA256 session tokens**: Format `[signature].[base64Email].[expiresAt].[hashPiece]`
- **Constant-time signature verification** (`crypto.timingSafeEqual`) prevents timing attacks
- **Password-bound tokens**: Changing password instantly invalidates all sessions
- Token DoS protection: Rejects inputs > 500 chars before any processing

### Session Management
- Max **10 concurrent sessions** per user (FIFO eviction)
- Real-time session invalidation via **Server-Sent Events (SSE)**
- Individual or bulk session revocation from profile

### Rate Limiting & Brute-Force Protection
- **API**: 150 requests / 15 min (production)
- **Auth**: 15 requests / 15 min (production)
- **Uploads**: 120 requests / 5 min (production)
- Progressive lockouts on repeated failed attempts

### Data Protection
- `sanitizeUser()` strips `passwordHash`, `salt`, and sensitive fields from all API responses
- Admin user queries use **MongoDB projection** to never load sensitive fields
- Authorization headers masked in server logs (`Bearer [MASKED]`)
- Guest upload IP addresses recorded for safety auditing

### Input Validation
- Prototype pollution protection (`__proto__`, `constructor` blocked)
- File upload restricted to safe types with MIME + extension validation
- XSS prevention via `escapeHtml()` on all user-facing outputs
- CORS strictly configured with explicit origin allowlisting

---

## 👨‍💻 Author

**Aditya Prakash**
- GitHub: [@aditya-dev06](https://github.com/aditya-dev06)

---

## 📄 License

This project is proprietary. All rights reserved.
