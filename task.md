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
