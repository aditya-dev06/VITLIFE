# Campus Life & Dashboard Enhancements — Task Tracker

## Phase 1: Backend Setup & API Routes (`server/server.js`)
- [x] Implement `updateEvent` helper in `server/server.js`
- [x] Add `GET /api/clubs/:id/managers` route to fetch club leaders and designations
- [x] Add `PUT /api/events/:id/pin` route for administrators to pin/unpin events

## Phase 2: Frontend Shared State (`src/App.jsx`)
- [x] Declare `clubs` and `events` states in `App.jsx`
- [x] Implement `fetchClubs` and `fetchEvents` callbacks in `App.jsx`
- [x] Update tab renderer in `App.jsx` to pass shared states and fetch triggers to both `Dashboard` and `CampusLife`

## Phase 3: Dashboard Recommendations (`src/components/Dashboard.jsx`)
- [x] Add "Upcoming Events" UI section to `Dashboard.jsx`
- [x] Implement interest-based scoring algorithm (CSE/AI/Data Science programs & courses)
- [x] Sort recommendations: pinned/sponsored first, interest matches second, then date
- [x] Add admin `📌 Pin` / `📍 Unpin` button toggles on the dashboard cards

## Phase 4: Simplified Cards & Detail Modals (`src/components/CampusLife.jsx`)
- [x] Update `CampusLife.jsx` to consume shared `clubs` and `events` props instead of local state
- [x] Simplify event cards layout: render only Title, Date, Venue, Host Club Logo/Name, and Poster
- [x] Implement `EventDetailsModal` to show full description, tags, time, registration link, and creator email
- [x] Implement `ClubDetailsModal` to fetch and show leaders (from `/api/clubs/:id/managers`), description, member counts, and social links
- [x] Sort Campus Life events with pinned/sponsored events at the top
- [x] Add admin `📌 Pin` / `📍 Unpin` button toggles on the cards

## Phase 5: Verification & Verification Checks
- [x] Run `npm run lint` to verify clean frontend linter status
- [x] Run `npm run build` to verify clean production compile
- [x] Verify club leader lookup, card expansion, and admin pinning behaviors

## Phase 6: Privacy Policy and Terms & Conditions Redirection
- [x] Update frontend hyperlinks in Auth.jsx to point back to /terms and /privacy
- [x] Create TermsAndConditions.jsx with IT Act / DPDP Act / GDPR compliance details
- [x] Create PrivacyPolicy.jsx with DPDP Act / GDPR / CCPA compliance details
- [x] Add client-side pathname checks in App.jsx to render the documents on /terms and /privacy routes
- [x] Remove Express backend 302 redirects in server.js to allow page loading
- [x] Verify clean eslint validation and production build compilation

## Phase 7: Zero-Delay Deployment & SMTP Resiliency
- [x] Implement database-backed persistent JWT_SECRET lookup for serverless environments
- [x] Make SMTP verification warning-only on boot to avoid pre-emptive registration lockouts
- [x] Add dynamic transporter re-verification on the health check endpoint
- [x] Restart and verify local dev environment functionality

## Phase 8: Upcoming Events Filtering & Sub-Tab Renaming
- [x] Exclude ongoing events from the main events tab in `CampusLife.jsx`
- [x] Rename the "Events" tab navigation label to "Upcoming Events"
- [x] Update empty state helper text referencing the events tab
- [x] Run production build and ESLint validation to verify changes

## Phase 9: Cryptographic Token & Session Security Refactor
- [x] Refactor token structure to `[signature].[base64Email].[expiresAt].[hashPiece]`
- [x] Implement constant-time signature verification before any DB queries to prevent timing & DoS attacks
- [x] Implement user password hash check (`hashPiece`) to force session revocation on password change
- [x] Support FIFO session limits (max 10 sessions per user)
- [x] Support MongoDB session index checks (TTL index on `expiresAt` and unique index on `tokenHash`)
- [x] Fix guest profile updates storage key (`ds_guest_user` vs `ds_ai_user`) to prevent state desynchronization on reload
- [x] Implement in-memory fallback for Vercel/serverless ephemeral disk
- [x] Verify complete token migration, login/logout flow, and session revocation using test scripts
