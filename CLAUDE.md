# Spike — Spikeball Tournament Manager

## Project Overview

Web app for managing spikeball tournaments and leagues. Used live at **https://spike.trhon.net**.

**Stack:** React 19 + TypeScript + Tailwind CSS v4 (Vite) | FastAPI + SQLAlchemy async | PostgreSQL 16 | Nginx | Docker Compose

---

## Architecture

### Services (docker-compose.prod.yml)
- **db** — PostgreSQL 16, host networking, volume `pgdata`
- **api** — FastAPI on `127.0.0.1:8000`, internal only
- **web** — Nginx on `0.0.0.0:80`, serves React SPA + proxies `/api/` and `/ws/` to api

External Nginx at `/etc/nginx/sites-available/spike.conf` handles HTTPS (Certbot) and proxies to web container on port 3001 (host mode → `127.0.0.1:3001`).

### CI/CD
- Push to `master` → GitHub Actions builds API and web Docker images → pushes to GHCR (`ghcr.io/trhonpavel/spike`)
- Deploy: `./deploy.sh` on server (pulls latest images, restarts compose)

---

## Auth System (3 separate token scopes)

| Token | Storage key | Lifetime | Purpose |
|-------|-------------|----------|---------|
| Session token | `spike_session` | 30 days | App-level access (app password gate) |
| Admin global token | `spike_admin_global` | **7 days, in-memory** | Admin dashboard (`/admin`) |
| Tournament admin token | `spike_admin_<slug>` | Permanent (UUID stored in DB) | Manage specific tournament |
| League admin token | `spike_league_token_<slug>` | Permanent (UUID stored in DB) | Manage specific league |

**Critical:** Admin global tokens are stored **in-memory** (`_admin_tokens: dict` in `admin.py`). They are wiped on every server restart/deploy. Users must re-login to `/admin` after each deploy.

Global auth middleware (`main.py`) requires Bearer session token for all `/api/v1/` routes. Admin routes (`/api/admin/`) bypass it and use their own auth.

---

## Data Models

### Tournament domain (`backend/app/models/tournament.py`)
```
Tournament → players (1:M) → rounds (1:M) → groups (1:M) → matches (1:M)
                          ↓
                    MatchPlayerStat (per-player-per-match, 4 records per match)
                    PartnerRecord (denormalized synergy, min/max normalized)
                    RoundWaiting (players sitting out a round)
```

Key fields:
- `Tournament.league_id` — nullable FK links tournament to a league session
- `Player.active` — soft delete flag (set false if player leaves mid-tournament with match history)
- `Player.elo_rating` — persisted Elo (default 1500)
- `Player.rating` — composite score: `2*wins + 3*waitings + (balls_won/balls_total * 2)`
- `Round.status` — `drawn | confirmed | finalized`
- `Match.match_index` — 0,1,2 encode fixed pairings within a 4-player group

### League domain (`backend/app/models/league.py`)
```
League → LeaguePlayers (1:M)
       → Tournaments (1:M, via league_id)
```

`LeaguePlayer` accumulates cumulative stats across sessions (elo_rating, total_wins/losses/games, sessions_attended).

---

## Key Business Logic

### Draw algorithm (`backend/app/services/draw.py`)
1. Filter `active=True` players, balance to multiple of 4 (extras → RoundWaiting)
2. Sort by Elo desc → initial groups of 4
3. Optimize up to 5 seconds: swap players to minimize repeat groups + skill imbalance
4. Penalty: +20 if 3 players repeat from prior round, +6 if 2 players repeat

### ELO (`backend/app/core/elo.py`)
- 2v2: team Elo = avg of two players
- K-factor scales with score margin: ≤3 diff = 1.0x, 4-7 = 1.25x, >7 = 1.5x

### Round finalization (`backend/app/services/scoring.py`)
Atomic transaction: validates all scores → updates Player stats → creates MatchPlayerStat records (with elo_before/after snapshots) → upserts PartnerRecords → sets round.status = finalized.

### League session close (`backend/app/api/leagues.py`)
Copies tournament player stats back to LeaguePlayer: elo, wins/losses/games, balls, point_diff, increments sessions_attended.

### Soft delete for players (`backend/app/api/tournaments.py`)
- `games_played > 0` → set `active=False` (preserves history, excludes from future draws)
- `games_played == 0` → hard DELETE

---

## API Summary

### Public (session token required via middleware)
- `GET /api/v1/tournaments` — list all tournaments
- `GET /api/v1/leagues` — list all leagues
- `GET /api/v1/tournaments/{slug}` — tournament detail
- `GET /api/v1/tournaments/{slug}/rounds` — rounds with groups/matches
- `GET /api/v1/tournaments/{slug}/standings` — player rankings
- `GET /api/v1/leagues/{slug}` — league detail with sessions

### Admin (tournament-level X-Admin-Token)
- `POST /rounds/draw`, `POST /rounds/{id}/confirm`, `POST /rounds/{id}/finalize`
- `PUT /matches/{id}/score`
- `POST/PATCH/DELETE /players`
- `POST /leagues/{slug}/sessions`, `POST /sessions/{id}/close`

### Admin dashboard (Bearer global admin token)
- `GET/DELETE /api/admin/tournaments`
- `GET/DELETE /api/admin/leagues`
- `GET /api/admin/status`

### WebSocket
- `WS /ws/{slug}[?token=...]` — broadcasts: `round_drawn`, `round_confirmed`, `round_finalized`, `score_updated`

---

## Frontend Pages & Tabs

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Create tournament/league, open existing by slug |
| `/tournaments` | TournamentsPage | Browse all leagues + tournaments with filter |
| `/t/:slug` | TournamentPage | Main UI: Players / Rounds / Standings tabs |
| `/t/:slug/standings` | StandingsPage | Full standings with sort options |
| `/l/:slug` | LeaguePage | League UI: Standings / Sessions / Roster tabs |
| `/admin` | AdminPage | Admin dashboard (requires global admin token) |

---

## Frontend API Clients

- `frontend/src/api/client.ts` — tournament API, attaches `Authorization: Bearer <session_token>`
- `frontend/src/api/admin-client.ts` — admin API, attaches `Authorization: Bearer <admin_global_token>`
- `frontend/src/api/league-client.ts` — league API, attaches `X-Admin-Token: <league_token>`

---

## Offline / Real-time

- `useLiveUpdates` — WebSocket with exponential backoff (max 10 retries)
- `useOfflineQueue` — queues failed requests in `localStorage`, auto-flushes on reconnect
- React Query staleTime: 5s, retry: 2x

---

## Database Migrations

Alembic auto-runs on API startup. Migrations in `backend/alembic/versions/`:

```
000_initial_schema.py      — base tables
001_add_elo_and_stats.py   — elo, rating, balls, waitings columns
002_add_league_tables.py   — League, LeaguePlayer
002_add_match_player_stats_and_partner_records.py  — MatchPlayerStat, PartnerRecord
003_add_matches_per_group.py  — Tournament.matches_per_group (1-3)
004_add_player_active.py      — Player.active (soft delete)  [revision='005']
```

**Note:** File `003_add_matches_per_group.py` has `revision='004'` internally. The newest migration file is named `004_add_player_active.py` but has `revision='005'` and `down_revision='004'`.

---

## Environment Variables

```env
# Required
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
POSTGRES_DB=spike
POSTGRES_USER=spike
POSTGRES_PASSWORD=...

# Optional (leave blank to disable)
APP_PASSWORD=...        # enables session auth gate
ADMIN_PASSWORD=...      # enables admin dashboard
ALLOWED_ORIGINS=...     # CORS (default: *)
```

---

## Known Issues / Gotchas

1. **Admin token lost on restart** — in-memory store, users must re-login to `/admin` after every deploy. Safari issue: had old invalid `spike_admin_global` in localStorage → 401 on all API calls → fix: delete `spike_admin_global` from localStorage.

2. **Safari caching** — Safari aggressively caches `index.html`. Fixed by `Cache-Control: no-store` in nginx for `index.html` specifically. JS assets use `immutable` cache (content-hashed filenames).

3. **Double safe-area padding** — `LeaguePage` previously had `env(safe-area-inset-top)` on both outer div and sticky header, breaking iPhone layout. Fixed: only on header.

4. **Migration file naming** — two files start with `002_`. Alembic uses `revision` field, not filename, so it works. Don't rename files.

---

## Suggested Features & Improvements

### High priority
- **[ ] Persist admin tokens to DB** — in-memory store loses tokens on restart/deploy. Store hashed tokens in a table with expiry. Per-tournament and per-league tokens already do this; apply same pattern to global admin tokens.
- **[ ] Auto-logout on 401** — if admin API returns 401, clear `spike_admin_global` from localStorage and redirect to admin login instead of staying broken.
- **[ ] Tournament status badge on Browse page** — show "Active"/"Finished" color on league cards (already works) and tournament cards.

### Medium priority
- **[ ] Player history across leagues** — `LeaguePlayer` has full stats but no way to view session-by-session history. Add a player detail view in the League Standings tab showing per-session Elo progression (chart using `MatchPlayerStat` data already available).
- **[ ] Session attendance tracking** — when creating a session, allow marking who "showed up late" vs "was there from start" to partially attribute stats. Currently binary attended/not.
- **[ ] Undo last score** — admin can accidentally submit a wrong score and must finalize before realizing. Add a "re-open round" feature that un-finalizes the last round (reverting stats) if no subsequent rounds exist.
- **[ ] Share link for live scoring** — generate a read-only view link for a tournament so spectators can watch live without needing the session password.

### Low priority / Nice to have
- **[ ] PWA install prompt** — icons and manifest exist, add install prompt logic.
- **[ ] Dark/light mode persistence** — `useTheme` already works, but ensure it persists across devices via user account (not critical without accounts).
- **[ ] Export league standings** — `/export/standings.*` exists for tournaments but not for leagues. Add league-level export.
- **[ ] Admin: bulk finish tournaments** — ability to mark multiple tournaments as finished at once from admin panel.
- **[ ] Migration for double-002 rename** — not a bug but could cause confusion; add a comment in the files noting the naming discrepancy.
- **[ ] WebSocket: reconnect on page visibility change** — currently reconnects on disconnect only; add `document.addEventListener('visibilitychange')` to reconnect when tab becomes visible after being hidden.
