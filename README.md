# Spike — Spikeball Tournament Manager

Web app for running spikeball tournaments — bracket generation, live scoring, real-time updates via WebSocket.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS (Vite)
- **Backend:** FastAPI + SQLAlchemy + asyncpg
- **Database:** PostgreSQL 16
- **Reverse Proxy:** Nginx (serves frontend, proxies API/WS)
- **Containers:** Docker Compose

## Quick Start (Production)

Pre-built images are available from GitHub Container Registry — no build needed on the server.

```bash
git clone https://github.com/trhonpavel/spike.git && cd spike
cp .env.example .env
# Edit .env — set a strong POSTGRES_PASSWORD and update DATABASE_URL to match

docker compose up -d
```

The app runs on **port 80**.

### With local build (no registry)

```bash
docker compose up -d --build
```

## Development

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

- Frontend: http://localhost:5173 (Vite HMR)
- API: http://localhost:8000 (auto-reload)
- Hot reload on both frontend and backend

## Environment Variables

See [`.env.example`](.env.example):

| Variable | Description | Default |
|---|---|---|
| `POSTGRES_DB` | Database name | `spike` |
| `POSTGRES_USER` | Database user | `spike` |
| `POSTGRES_PASSWORD` | Database password | — |
| `DATABASE_URL` | Full connection string | — |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `*` |

## API

- `GET /api/health` — health check
- `GET /api/tournaments` — list tournaments
- `POST /api/tournaments` — create tournament
- `GET /api/tournaments/{slug}` — tournament detail
- `WS /ws/{slug}` — real-time tournament updates

## Architecture

```
┌─────────┐      ┌─────────┐      ┌──────┐
│  Nginx  │─────▶│ FastAPI │─────▶│  PG  │
│  :80    │      │  :8000  │      │:5432 │
│ (front) │      │  (api)  │      │      │
└─────────┘      └─────────┘      └──────┘
     │
     └── serves React SPA
         proxies /api/* and /ws/*
```
