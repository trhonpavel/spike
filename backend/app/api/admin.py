import secrets
import time
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.tournament import Tournament, TournamentStatus, Player, Round
from app.schemas.admin import (
    AdminLoginRequest, AdminLoginResponse,
    TournamentListItem, ServerStatus,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

# In-memory admin token store
_admin_tokens: dict[str, datetime] = {}
ADMIN_TOKEN_LIFETIME = timedelta(days=7)

_start_time = time.monotonic()


def validate_admin_token(token: str) -> bool:
    expiry = _admin_tokens.get(token)
    if expiry is None:
        return False
    if datetime.utcnow() > expiry:
        del _admin_tokens[token]
        return False
    return True


def _require_admin(request: Request):
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        if validate_admin_token(token):
            return
    raise HTTPException(401, "Admin authentication required")


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest):
    if not settings.admin_password:
        raise HTTPException(404, "Admin auth not configured")
    if not secrets.compare_digest(body.password, settings.admin_password):
        raise HTTPException(401, "Wrong admin password")
    token = str(uuid4())
    _admin_tokens[token] = datetime.utcnow() + ADMIN_TOKEN_LIFETIME
    return AdminLoginResponse(token=token)


@router.get("/tournaments", response_model=list[TournamentListItem])
async def list_tournaments(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_admin(request)
    result = await db.execute(
        select(
            Tournament.id,
            Tournament.name,
            Tournament.slug,
            Tournament.status,
            Tournament.created_at,
            func.count(func.distinct(Player.id)).label("player_count"),
            func.count(func.distinct(Round.id)).label("round_count"),
        )
        .outerjoin(Player, Player.tournament_id == Tournament.id)
        .outerjoin(Round, Round.tournament_id == Tournament.id)
        .group_by(Tournament.id)
        .order_by(Tournament.id.desc())
    )
    rows = result.all()
    return [
        TournamentListItem(
            id=r.id,
            name=r.name,
            slug=r.slug,
            status=r.status.value if hasattr(r.status, "value") else r.status,
            player_count=r.player_count,
            round_count=r.round_count,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete("/tournaments/{tournament_id}", status_code=204)
async def delete_tournament(
    tournament_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_admin(request)
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    await db.delete(t)
    await db.commit()


@router.post("/tournaments/{tournament_id}/finish", status_code=200)
async def finish_tournament(
    tournament_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_admin(request)
    result = await db.execute(select(Tournament).where(Tournament.id == tournament_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    t.status = TournamentStatus.finished
    await db.commit()
    return {"status": "finished"}


@router.get("/status", response_model=ServerStatus)
async def server_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    _require_admin(request)
    db_ok = False
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    t_count = (await db.execute(select(func.count(Tournament.id)))).scalar() or 0
    p_count = (await db.execute(select(func.count(Player.id)))).scalar() or 0
    uptime = time.monotonic() - _start_time

    return ServerStatus(
        db_ok=db_ok,
        tournaments_count=t_count,
        players_count=p_count,
        uptime_seconds=round(uptime, 1),
    )
