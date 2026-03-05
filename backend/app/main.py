from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.responses import JSONResponse

from app.config import settings
from app.database import engine, Base
from app.api.tournaments import router as tournaments_router
from app.api.websocket import router as ws_router
from app.api.auth import router as auth_router, validate_token


async def _ensure_backward_compatible_schema():
    """Patch legacy DBs that were created before new player stat columns existed."""
    if engine.dialect.name != "postgresql":
        return

    statements = [
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS elo_rating DOUBLE PRECISION NOT NULL DEFAULT 1500.0",
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS point_differential INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS games_played INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE players ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0",
    ]

    async with engine.begin() as conn:
        for sql in statements:
            await conn.execute(text(sql))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_backward_compatible_schema()
    yield


app = FastAPI(title="Spike - Spikeball Tournament", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if not settings.app_password:
        return await call_next(request)

    path = request.url.path
    if path == "/api/health" or path.startswith("/api/auth/"):
        return await call_next(request)

    if not path.startswith("/api/"):
        return await call_next(request)

    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        if validate_token(token):
            return await call_next(request)

    return JSONResponse(status_code=401, content={"detail": "Unauthorized"})


app.include_router(auth_router)
app.include_router(tournaments_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
