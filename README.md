<p align="center">
  <strong>VIT LIFE</strong><br/>
  College Lifestyle & Management Portal
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-blue?logo=react" />
  <img src="https://img.shields.io/badge/Vite-8-purple?logo=vite" />
  <img src="https://img.shields.io/badge/Express-5-green?logo=express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-brightgreen?logo=mongodb" />
  <img src="https://img.shields.io/badge/PWA-Installable-orange?logo=pwa" />
</p>

---

## About

**VIT Life** is a centralized college lifestyle and management portal built for VIT Bhopal students. It brings together event management, club directories, academic roadmaps, class schedules, opportunity tracking, and student resources — all in one installable, offline-capable progressive web app.

The platform supports both **authenticated users** (VIT students and global users) and **guest sessions** (UUID-based, no account required) so anyone can explore the platform without signing up.

---

## Features

### 🏠 Dashboard
- Personalized welcome with live greeting
- XP progress tracking across skill categories
- Next class tracker (live countdown from timetable data)
- **Live Mess Menu Tracker**: Dynamically proxies and caches (6-hour TTL) live menu data from `messmenu.me` for all 6 VIT Bhopal hostel messes, displaying main dishes.
- Quick stats and action cards

### 📅 Timetable & Schedule
- **Paste-to-parse**: Copy your full VTOP page text → paste → auto-extracts class slots
- Mobile-optimized day-tab view with swipe navigation
- Manual slot add/edit/delete
- **Offline-first**: All saves go to `localStorage` immediately, then sync to cloud when online
- Sync status indicator (synced / syncing / pending / offline)
- First-time guide with step-by-step VTOP instructions (auto-hides after first upload)

### 🎯 Opportunities Hub
- Auto-scraped internships, competitions, and opportunities
- Category filtering and search
- Daily scheduled scraper refreshes data automatically

### 🗺️ Skill Roadmap
- Interactive skill tree for CS/DS/AI tracks
- Status tracking: not started → in progress → completed
- XP points system with progress bars

### 🎪 College Life
- Club directory with manager info
- Event calendar with categories, poster galleries, and RSVP links
- **Event Impression & Trending System**: Tracks user impressions in MongoDB/JSON database; dynamically prioritizes admin-pinned events followed by most trending events (sorted by impressions) on the dashboard (capped at 3 responsive cards).
- Option for pinning events is restricted strictly to administrators on both frontend and backend.
- Club recruitment board

### 🏫 VIT Bhopal Guide
- Academic guidelines and resources
- Campus-specific information for VIT Bhopal students

### 📚 Community (PYQs & Resources)
- Upload and share Previous Year Questions (PYQs) and study materials
- **Guest Uploads Supported**: Guests can upload resources (marked as 'pending' for admin approval)
- Cloudinary-backed direct PDF previews built-in
- Auto-fill course titles based on course codes

### 🔐 Authentication
- Email + password registration with 6-digit email verification
- Forgot password flow with email-based reset codes
- Rate-limited and brute-force protected endpoints
- **Active Login Sessions**: Users can view all active login sessions (OS, Browser, Device, IP, Last Active) from their profile and revoke individual or all other sessions in real-time.
- Guest mode: Browse without an account — persistent UUID per browser, local-only data

### 📱 Progressive Web App (PWA)
- Installable on mobile and desktop (Chrome, Edge, Samsung Browser)
- Service worker with stale-while-revalidate caching strategy
- API response caching for offline access to previously loaded data
- In-app install button (sidebar + mobile topbar) — auto-hides after installation

### 🌗 Theming
- Dark theme (default) — deep blue-black with purple accent gradients
- Light theme — clean white with preserved brand colors
- Persistent theme preference in `localStorage`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Vanilla CSS |
| Backend | Express 5, Node.js |
| Database | MongoDB Atlas (with local JSON fallback) |
| Cloud Storage | Cloudinary (Image & PDF uploads) |
| Email | Nodemailer (SMTP / Gmail App Passwords) |
| Animations | GSAP, Motion (Framer Motion), Three.js |
| Deployment | Vercel (serverless functions + static build) |
| PWA | Custom service worker, Web App Manifest |

---

## Project Structure

```
excited-newton/
├── public/
│   ├── favicon.svg
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker
│   └── vtop-timetable-guide.png   # Timetable guide image
├── server/
│   ├── server.js                  # Express backend (auth, API, scraper, admin)
│   └── data/                      # Local JSON fallback storage
├── src/
│   ├── App.jsx                    # Main app orchestrator
│   ├── main.jsx                   # Entry point + SW registration
│   ├── index.css                  # Global design system + all CSS tokens
│   ├── components/
│   │   ├── Auth.jsx               # Login, signup, verification, guest flow
│   │   ├── Dashboard.jsx          # Home dashboard with stats & next-class tracker
│   │   ├── TimetablePage.jsx      # Timetable paste-parser, grid view, manual editor
│   │   ├── CampusLife.jsx         # Clubs, events, recruitments
│   │   ├── Opportunities.jsx      # Scraped opportunities listing
│   │   ├── Roadmap.jsx            # Skill tree and progress tracker
│   │   ├── VITBhopalGuide.jsx     # Academic guidelines
│   │   ├── TypewriterText.jsx     # Animated brand logo text
│   │   ├── Hyperspeed.jsx         # Three.js background effect
│   │   └── ...                    # UI primitives (Dock, Masonry, BounceCards, etc.)
│   └── hooks/
│       └── useTimetableSync.js    # Offline-first timetable sync hook
├── .env.example                   # Environment variables template
├── vercel.json                    # Vercel deployment configuration
├── vite.config.js                 # Vite dev server + build config
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MongoDB Atlas** cluster (free tier works) — or the app falls back to local JSON files
- **Gmail account** with App Password for email verification (optional for dev)

### 1. Clone & Install

```bash
git clone https://github.com/aditya-dev06/opportunity_hub.git
cd opportunity_hub
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # Gmail App Password (16 chars)

# Admin
ADMIN_EMAIL=your-admin@email.com

# MongoDB (optional — falls back to local JSON files)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/vitlife
```

### 3. Run Development Server

```bash
npm run dev
```

This starts both servers concurrently:
- **Frontend** (Vite): `http://localhost:5175`
- **Backend** (Express): `http://localhost:5000`

The Vite dev server proxies `/api/*` and `/uploads/*` to the Express backend automatically.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SMTP_HOST` | No | SMTP server hostname (default: `smtp.gmail.com`) |
| `SMTP_PORT` | No | SMTP port (default: `465`) |
| `SMTP_USER` | No | Email address for sending verification emails |
| `SMTP_PASS` | No | App Password for SMTP authentication |
| `ADMIN_EMAIL` | No | Primary admin email (gets admin role automatically) |
| `MONGODB_URI` | No | MongoDB Atlas connection string |
| `JWT_SECRET` | No | JWT signing secret (auto-generated if not set) |
| `RESEND_API_KEY` | No | Alternative to SMTP — Resend.com API key |
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name for uploads |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET`| No | Cloudinary API secret |

> **Note**: The app works without any environment variables in dev mode. Email verification codes are printed to the console, and data is stored in local JSON files.

---

## Deployment (Vercel)

The project is pre-configured for Vercel with `vercel.json`:

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Add environment variables in Vercel dashboard
3. Deploy — Vercel handles the static build + serverless API routes automatically

---

## Guest vs Authenticated Users

| Feature | Guest | Authenticated |
|---|---|---|
| Dashboard, Opportunities, Events, Guide | ✅ | ✅ |
| Timetable (local storage) | ✅ | ✅ + cloud sync |
| College Life tab | ❌ | ✅ |
| Edit profile | ❌ | ✅ |
| Skill progress sync | ❌ | ✅ |
| Cloud data persistence | ❌ | ✅ |
| PWA install | ✅ | ✅ |

Guest sessions are identified by a persistent UUID stored in `localStorage`. Each browser/device gets a unique identity.

---

## Security

- Passwords hashed using standard Scrypt password-hashing algorithm for robust brute-force resistance
- **Cryptographic Sessions**: Bulletproof session token format: `[signature].[base64Email].[expiresAt].[hashPiece]` where the HMAC signature is verified first in constant-time, preventing timing/DoS attacks before database lookups.
- **Session Revocation**: Real-time session invalidation via Server-Sent Events (SSE) and immediate database checks.
- Concurrent session limits (max 10, FIFO) to prevent session bloat.
- Email verification required before account activation
- Rate limiting on all auth endpoints (registration, login, verification, password reset)
- Brute-force protection with progressive lockouts
- Unverified users isolated — only visible in activity logs, never in user lists or admin panels
- Input validation and sanitization on all API endpoints

---

## Author

**Aditya Prakash**
- GitHub: [@aditya-dev06](https://github.com/aditya-dev06)

---

## License

This project is proprietary. All rights reserved.
