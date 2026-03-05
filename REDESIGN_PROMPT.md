# Spike Tournament App — Full Redesign

Redesign the entire Spike tournament app. This is a **Roundnet (Spikeball) tournament management system** used on mobile phones at live tournaments. It's a React + Tailwind PWA.

## Current Stack
- React 19 + TypeScript + Vite
- Tailwind CSS v4 (custom theme in `frontend/src/index.css`)
- React Router, TanStack Query
- Dark theme with brand yellow `#e4ff1a`

## Pages to Redesign

### 1. `frontend/src/pages/HomePage.tsx`
Home screen — create tournament + open existing by code/link. Has Czech Roundnet logo and Worlds 2026 banner.

### 2. `frontend/src/pages/TournamentPage.tsx`
Main tournament view with sticky header, 3 tabs (Players, Rounds, Standings), share button. This is the most-used screen.

### 3. `frontend/src/pages/StandingsPage.tsx`
Public shareable standings page with live updates.

### 4. `frontend/src/components/PasswordGate.tsx`
Simple password entry screen shown before the app.

## Components to Redesign

### 5. `frontend/src/components/PlayersTab.tsx`
Player list with add/remove. Shows player count, "min 4 required" warning.

### 6. `frontend/src/components/RoundsTab.tsx`
Round management — draw, confirm, finalize buttons. Lists rounds with status badges (Draft/In Progress/Finalized).

### 7. `frontend/src/components/GroupCard.tsx`
Group of 4 players with 3 matches. Header shows group number + player names.

### 8. `frontend/src/components/MatchScoreInput.tsx`
Score entry for a match — two teams, score steppers. Most interactive component, used heavily on mobile.

### 9. `frontend/src/components/ScoreStepper.tsx`
+/- buttons with number input for score. Must have large touch targets (44px+).

### 10. `frontend/src/components/StandingsTable.tsx`
Rankings table with rank, name, wins, balls, rating. Top 10 highlighted green for "qualifies for Worlds". Has rating bar visualization.

### 11. `frontend/src/components/PlayerDetailModal.tsx`
Modal overlay showing player stats when tapped in standings/player list.

## Design Requirements

- **Mobile-first** — 90% of users are on phones at tournaments, standing up, sometimes in sun
- **Dark theme** — keep dark, it's used outdoors
- **Sport/competition energy** — this is a competitive tournament, the design should feel alive and dynamic
- **Large touch targets** — people tap scores with one hand while holding a drink
- **Fast scanning** — admins need to quickly see which scores are missing, which round is active
- **Brand color: `#e4ff1a`** (neon yellow-green) — keep this as primary accent
- **Keep the Czech Roundnet logo** at `/img/czech-roundnet.svg` and Worlds 2026 banner at `/img/worlds-2026.png`

## Style Direction

Think modern sports app — something between NBA app, ESPN, and a gaming tournament platform. Not corporate, not minimal. Bold, energetic, clear hierarchy. Consider:
- Glassmorphism or dimensional layering for cards
- Micro-interactions on score changes
- Status colors that pop (draft=amber, active=blue, done=green)
- Animated transitions between tabs
- Number animations when scores update

## What NOT to Change
- Don't change any API calls, data types, or business logic
- Don't change file names or routing
- Don't add new dependencies (use only what's in package.json)
- Don't change `frontend/src/api/client.ts` or `frontend/src/hooks/`
- Keep all existing functionality exactly as-is

## Process
Redesign all files listed above, one by one. Update `frontend/src/index.css` theme variables if needed. After each file, verify TypeScript compiles with `cd frontend && npx tsc --noEmit`.
