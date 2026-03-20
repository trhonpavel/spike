import re
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.league import League, LeaguePlayer
from app.models.tournament import Tournament, Player, Round, RoundStatus
from app.schemas.league import (
    LeagueCreate, LeagueOut, LeagueDetailOut,
    LeaguePlayerCreate, LeaguePlayerUpdate, LeaguePlayerOut,
    LeagueSessionCreate, LeagueSessionOut,
)
from app.config import settings

router = APIRouter(prefix="/api/v1/leagues", tags=["leagues"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:80] or "league"


async def _get_league(db: AsyncSession, slug: str) -> League:
    result = await db.execute(select(League).where(League.slug == slug))
    league = result.scalar_one_or_none()
    if not league:
        raise HTTPException(404, "League not found")
    return league


def _verify_league_admin(league: League, token: str | None):
    if settings.app_password:
        return
    if not token or token != league.admin_token:
        raise HTTPException(403, "Invalid admin token")


@router.post("", response_model=LeagueOut, status_code=201)
async def create_league(data: LeagueCreate, db: AsyncSession = Depends(get_db)):
    base_slug = _slugify(data.name)
    slug = base_slug
    for i in range(1, 100):
        exists = await db.execute(select(League).where(League.slug == slug))
        if not exists.scalar_one_or_none():
            break
        slug = f"{base_slug}-{i}"

    league = League(name=data.name, slug=slug)
    db.add(league)
    await db.commit()
    await db.refresh(league)
    return league


@router.get("", response_model=list[LeagueOut])
async def list_leagues(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(League).order_by(League.created_at.desc()))
    return result.scalars().all()


@router.get("/{slug}", response_model=LeagueDetailOut)
async def get_league(slug: str, db: AsyncSession = Depends(get_db)):
    league = await _get_league(db, slug)

    players_result = await db.execute(
        select(LeaguePlayer)
        .where(LeaguePlayer.league_id == league.id)
        .order_by(LeaguePlayer.elo_rating.desc())
    )
    players = list(players_result.scalars().all())

    sessions_result = await db.execute(
        select(Tournament)
        .where(Tournament.league_id == league.id)
        .order_by(Tournament.created_at.desc())
    )
    tournaments = list(sessions_result.scalars().all())

    sessions = []
    for t in tournaments:
        pc_result = await db.execute(
            select(func.count(Player.id)).where(Player.tournament_id == t.id)
        )
        sessions.append(LeagueSessionOut(
            id=t.id,
            name=t.name,
            slug=t.slug,
            status=t.status,
            session_date=t.session_date,
            player_count=pc_result.scalar() or 0,
        ))

    return LeagueDetailOut(
        id=league.id,
        name=league.name,
        slug=league.slug,
        status=league.status,
        player_count=len(players),
        sessions=sessions,
        players=[LeaguePlayerOut.model_validate(p) for p in players],
    )


@router.post("/{slug}/players", response_model=LeaguePlayerOut, status_code=201)
async def add_league_player(
    slug: str,
    data: LeaguePlayerCreate,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    league = await _get_league(db, slug)
    _verify_league_admin(league, x_admin_token)

    existing = await db.execute(
        select(LeaguePlayer).where(
            LeaguePlayer.league_id == league.id,
            LeaguePlayer.name == data.name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Player '{data.name}' already exists")

    player = LeaguePlayer(league_id=league.id, name=data.name)
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.patch("/{slug}/players/{player_id}", response_model=LeaguePlayerOut)
async def update_league_player(
    slug: str,
    player_id: int,
    data: LeaguePlayerUpdate,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    league = await _get_league(db, slug)
    _verify_league_admin(league, x_admin_token)

    player = await db.get(LeaguePlayer, player_id)
    if not player or player.league_id != league.id:
        raise HTTPException(404, "Player not found")

    if data.name is not None:
        dup = await db.execute(
            select(LeaguePlayer).where(
                LeaguePlayer.league_id == league.id,
                LeaguePlayer.name == data.name,
                LeaguePlayer.id != player_id,
            )
        )
        if dup.scalar_one_or_none():
            raise HTTPException(409, f"Player '{data.name}' already exists")
        player.name = data.name

    if data.active is not None:
        player.active = data.active

    await db.commit()
    await db.refresh(player)
    return player


@router.post("/{slug}/sessions", status_code=201)
async def create_session(
    slug: str,
    data: LeagueSessionCreate,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    league = await _get_league(db, slug)
    _verify_league_admin(league, x_admin_token)

    session_date = data.session_date or date.today()
    date_str = session_date.strftime("%Y-%m-%d")
    base_slug = f"{slug}-{date_str}"
    t_slug = base_slug
    for i in range(1, 100):
        exists = await db.execute(select(Tournament).where(Tournament.slug == t_slug))
        if not exists.scalar_one_or_none():
            break
        t_slug = f"{base_slug}-{i}"

    tournament = Tournament(
        name=f"{league.name} – {date_str}",
        slug=t_slug,
        admin_token=league.admin_token,
        league_id=league.id,
        session_date=session_date,
    )
    db.add(tournament)
    await db.flush()

    if data.attending_player_ids:
        lp_result = await db.execute(
            select(LeaguePlayer).where(
                LeaguePlayer.id.in_(data.attending_player_ids),
                LeaguePlayer.league_id == league.id,
            )
        )
        for lp in lp_result.scalars().all():
            db.add(Player(
                tournament_id=tournament.id,
                name=lp.name,
                elo_rating=lp.elo_rating,
                league_player_id=lp.id,
            ))

    await db.commit()
    await db.refresh(tournament)
    return {"tournament_slug": tournament.slug, "session_id": tournament.id}


@router.post("/{slug}/sessions/{tournament_id}/close", status_code=200)
async def close_session(
    slug: str,
    tournament_id: int,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    league = await _get_league(db, slug)
    _verify_league_admin(league, x_admin_token)

    tournament = await db.get(Tournament, tournament_id)
    if not tournament or tournament.league_id != league.id:
        raise HTTPException(404, "Session not found")
    if tournament.status == "finished":
        raise HTTPException(400, "Session already closed")

    players_result = await db.execute(
        select(Player).where(
            Player.tournament_id == tournament.id,
            Player.league_player_id.isnot(None),
        )
    )
    session_players = list(players_result.scalars().all())

    lp_ids = [p.league_player_id for p in session_players]
    if lp_ids:
        lp_result = await db.execute(
            select(LeaguePlayer).where(LeaguePlayer.id.in_(lp_ids))
        )
        lp_map = {lp.id: lp for lp in lp_result.scalars().all()}

        for sp in session_players:
            lp = lp_map.get(sp.league_player_id)
            if not lp:
                continue
            lp.elo_rating = sp.elo_rating
            lp.total_wins += sp.wins
            lp.total_losses += sp.losses
            lp.total_games += sp.games_played
            lp.total_balls_won += sp.balls_won
            lp.total_balls_total += sp.balls_total
            lp.total_point_differential += sp.point_differential
            lp.sessions_attended += 1

    tournament.status = "finished"
    await db.commit()
    return {"ok": True}
