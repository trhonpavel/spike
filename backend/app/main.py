import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.responses import JSONResponse

from app.config import settings
from app.database import engine, get_db
from app.api.tournaments import router as tournaments_router
from app.api.leagues import router as leagues_router
from app.api.websocket import router as ws_router
from app.api.auth import router as auth_router, validate_token
from app.api.admin import router as admin_router, validate_admin_token
from app.api.export import router as export_router


def _run_alembic_upgrade():
    cfg = AlembicConfig(str(Path(__file__).parent.parent / "alembic.ini"))
    alembic_command.upgrade(cfg, "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_run_alembic_upgrade)
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
    path = request.url.path

    # Admin routes use their own auth
    if path.startswith("/api/admin/"):
        return await call_next(request)

    if not settings.app_password:
        return await call_next(request)

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
app.include_router(admin_router)
app.include_router(tournaments_router)
app.include_router(leagues_router)
app.include_router(export_router)
app.include_router(ws_router)


@app.get("/api/health")
async def health():
    db_ok = False
    try:
        async for db in get_db():
            await db.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}
