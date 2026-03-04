import re

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.tournament import (
    Tournament, Player, Round, Group, Match, RoundWaiting, RoundStatus,
)
from app.schemas.tournament import (
    TournamentCreate, TournamentOut, TournamentPublic,
    PlayerCreate, PlayerOut,
    RoundOut, GroupOut, MatchOut,
    ScoreUpdate, StandingOut,
)
from app.config import settings
from app.services.draw import perform_draw
from app.services.scoring import update_match_score, finalize_round
from app.api.websocket import manager

router = APIRouter(prefix="/api/v1/tournaments", tags=["tournaments"])


def _slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug[:80] or "tournament"


async def _get_tournament(db: AsyncSession, slug: str) -> Tournament:
    result = await db.execute(
        select(Tournament).where(Tournament.slug == slug)
    )
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Tournament not found")
    return t


def _verify_admin(tournament: Tournament, token: str | None):
    if settings.app_password:
        return  # whole app is password-protected, everyone is admin
    if not token or token != tournament.admin_token:
        raise HTTPException(403, "Invalid admin token")


def _build_match_out(match: Match, players_map: dict[int, Player]) -> MatchOut:
    return MatchOut(
        id=match.id,
        match_index=match.match_index,
        team1_p1=PlayerOut.model_validate(players_map[match.team1_p1_id]),
        team1_p2=PlayerOut.model_validate(players_map[match.team1_p2_id]),
        team2_p1=PlayerOut.model_validate(players_map[match.team2_p1_id]),
        team2_p2=PlayerOut.model_validate(players_map[match.team2_p2_id]),
        score_team1=match.score_team1,
        score_team2=match.score_team2,
    )


def _build_group_out(group: Group) -> GroupOut:
    players = [group.player1, group.player2, group.player3, group.player4]
    players_map = {p.id: p for p in players}
    matches_sorted = sorted(group.matches, key=lambda m: m.match_index)
    return GroupOut(
        id=group.id,
        group_index=group.group_index,
        players=[PlayerOut.model_validate(p) for p in players],
        matches=[_build_match_out(m, players_map) for m in matches_sorted],
    )


def _build_round_out(round_obj: Round) -> RoundOut:
    groups_sorted = sorted(round_obj.groups, key=lambda g: g.group_index)
    waiting = [
        PlayerOut.model_validate(w.player) for w in round_obj.waitings
    ]
    return RoundOut(
        id=round_obj.id,
        round_number=round_obj.round_number,
        status=round_obj.status.value,
        groups=[_build_group_out(g) for g in groups_sorted],
        waiting_players=waiting,
    )


# --- Tournament CRUD ---


@router.post("", response_model=TournamentOut, status_code=201)
async def create_tournament(data: TournamentCreate, db: AsyncSession = Depends(get_db)):
    base_slug = _slugify(data.name)
    slug = base_slug

    # Ensure unique slug
    for i in range(1, 100):
        exists = await db.execute(select(Tournament).where(Tournament.slug == slug))
        if not exists.scalar_one_or_none():
            break
        slug = f"{base_slug}-{i}"

    tournament = Tournament(name=data.name, slug=slug)
    db.add(tournament)
    await db.commit()
    await db.refresh(tournament)
    return tournament


@router.get("/{slug}", response_model=TournamentPublic)
async def get_tournament(slug: str, db: AsyncSession = Depends(get_db)):
    return await _get_tournament(db, slug)


# --- Players ---


@router.get("/{slug}/players", response_model=list[PlayerOut])
async def list_players(slug: str, db: AsyncSession = Depends(get_db)):
    t = await _get_tournament(db, slug)
    result = await db.execute(
        select(Player).where(Player.tournament_id == t.id).order_by(Player.name)
    )
    return result.scalars().all()


@router.post("/{slug}/players", response_model=PlayerOut, status_code=201)
async def add_player(
    slug: str,
    data: PlayerCreate,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    # Check duplicate name
    existing = await db.execute(
        select(Player).where(Player.tournament_id == t.id, Player.name == data.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, f"Player '{data.name}' already exists")

    player = Player(tournament_id=t.id, name=data.name)
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.delete("/{slug}/players/{player_id}", status_code=204)
async def remove_player(
    slug: str,
    player_id: int,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    result = await db.execute(
        select(Player).where(Player.id == player_id, Player.tournament_id == t.id)
    )
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(404, "Player not found")

    await db.delete(player)
    await db.commit()


# --- Rounds & Draw ---


@router.get("/{slug}/rounds", response_model=list[RoundOut])
async def list_rounds(slug: str, db: AsyncSession = Depends(get_db)):
    t = await _get_tournament(db, slug)
    result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
            selectinload(Round.groups).selectinload(Group.player1),
            selectinload(Round.groups).selectinload(Group.player2),
            selectinload(Round.groups).selectinload(Group.player3),
            selectinload(Round.groups).selectinload(Group.player4),
            selectinload(Round.waitings).selectinload(RoundWaiting.player),
        )
        .where(Round.tournament_id == t.id)
        .order_by(Round.round_number)
    )
    rounds = result.scalars().all()
    return [_build_round_out(r) for r in rounds]


@router.post("/{slug}/rounds/draw", response_model=RoundOut, status_code=201)
async def draw_round(
    slug: str,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)
    try:
        new_round = await perform_draw(db, t)
    except ValueError as e:
        raise HTTPException(400, str(e))
    await manager.broadcast(slug, "round_drawn")
    return _build_round_out(new_round)


@router.post("/{slug}/rounds/{round_id}/confirm", response_model=RoundOut)
async def confirm_round(
    slug: str,
    round_id: int,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
            selectinload(Round.groups).selectinload(Group.player1),
            selectinload(Round.groups).selectinload(Group.player2),
            selectinload(Round.groups).selectinload(Group.player3),
            selectinload(Round.groups).selectinload(Group.player4),
            selectinload(Round.waitings).selectinload(RoundWaiting.player),
        )
        .where(Round.id == round_id, Round.tournament_id == t.id)
    )
    round_obj = result.scalar_one_or_none()
    if not round_obj:
        raise HTTPException(404, "Round not found")
    if round_obj.status != RoundStatus.drawn:
        raise HTTPException(400, "Round is not in drawn state")

    round_obj.status = RoundStatus.confirmed
    await db.commit()
    return _build_round_out(round_obj)


# --- Scores ---


@router.put("/{slug}/matches/{match_id}/score", response_model=MatchOut)
async def set_score(
    slug: str,
    match_id: int,
    data: ScoreUpdate,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    result = await db.execute(
        select(Match)
        .join(Group)
        .join(Round)
        .where(Match.id == match_id, Round.tournament_id == t.id)
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(404, "Match not found")

    match = await update_match_score(db, match, data.score_team1, data.score_team2)

    # Build response
    player_ids = [match.team1_p1_id, match.team1_p2_id, match.team2_p1_id, match.team2_p2_id]
    p_result = await db.execute(select(Player).where(Player.id.in_(player_ids)))
    players_map = {p.id: p for p in p_result.scalars().all()}

    out = _build_match_out(match, players_map)
    await manager.broadcast(slug, "score_updated")
    return out


@router.post("/{slug}/rounds/{round_id}/finalize", response_model=RoundOut)
async def finalize_round_endpoint(
    slug: str,
    round_id: int,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
            selectinload(Round.groups).selectinload(Group.player1),
            selectinload(Round.groups).selectinload(Group.player2),
            selectinload(Round.groups).selectinload(Group.player3),
            selectinload(Round.groups).selectinload(Group.player4),
            selectinload(Round.waitings).selectinload(RoundWaiting.player),
        )
        .where(Round.id == round_id, Round.tournament_id == t.id)
    )
    round_obj = result.scalar_one_or_none()
    if not round_obj:
        raise HTTPException(404, "Round not found")

    try:
        await finalize_round(db, round_obj)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Reload
    result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
            selectinload(Round.groups).selectinload(Group.player1),
            selectinload(Round.groups).selectinload(Group.player2),
            selectinload(Round.groups).selectinload(Group.player3),
            selectinload(Round.groups).selectinload(Group.player4),
            selectinload(Round.waitings).selectinload(RoundWaiting.player),
        )
        .where(Round.id == round_id)
    )
    round_obj = result.scalar_one()
    await manager.broadcast(slug, "round_finalized")
    return _build_round_out(round_obj)


# --- Standings ---


@router.get("/{slug}/standings", response_model=list[StandingOut])
async def get_standings(slug: str, db: AsyncSession = Depends(get_db)):
    t = await _get_tournament(db, slug)
    result = await db.execute(
        select(Player).where(Player.tournament_id == t.id)
    )
    players = list(result.scalars().all())
    players.sort(key=lambda p: -p.rating)

    return [
        StandingOut(rank=i + 1, player=PlayerOut.model_validate(p))
        for i, p in enumerate(players)
    ]
