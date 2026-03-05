import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from sqlalchemy import or_
from app.models.tournament import (
    Tournament, Player, Round, Group, Match, RoundWaiting, RoundStatus,
    PartnerRecord, MatchPlayerStat,
)
from app.schemas.tournament import (
    TournamentCreate, TournamentOut, TournamentPublic,
    PlayerCreate, PlayerOut,
    RoundOut, GroupOut, MatchOut,
    ScoreUpdate, StandingOut,
    PartnerStatOut, PlayerStatsOut,
    PartnerRecordOut, MatchPlayerStatOut,
)
from app.config import settings
from app.services.draw import perform_draw
from app.services.scoring import update_match_score, finalize_round
from app.core.stats import compute_player_stats
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


# --- Player Stats ---


@router.get("/{slug}/players/{player_id}/stats", response_model=PlayerStatsOut)
async def get_player_stats(
    slug: str,
    player_id: int,
    db: AsyncSession = Depends(get_db),
):
    t = await _get_tournament(db, slug)

    # Verify player exists
    p_result = await db.execute(
        select(Player).where(Player.id == player_id, Player.tournament_id == t.id)
    )
    if not p_result.scalar_one_or_none():
        raise HTTPException(404, "Player not found")

    # Load all finalized rounds with groups+matches
    result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
        )
        .where(Round.tournament_id == t.id, Round.status == RoundStatus.finalized)
        .order_by(Round.round_number)
    )
    finalized_rounds = list(result.scalars().all())

    # Build player name map
    all_players = await db.execute(
        select(Player).where(Player.tournament_id == t.id)
    )
    player_names = {p.id: p.name for p in all_players.scalars().all()}

    stats = compute_player_stats(player_id, finalized_rounds, player_names)

    return PlayerStatsOut(
        games_played=stats.games_played,
        wins=stats.wins,
        losses=stats.losses,
        point_differential=stats.point_differential,
        avg_point_diff=stats.avg_point_diff,
        win_rate=stats.win_rate,
        consistency=stats.consistency,
        clutch_score=stats.clutch_score,
        form=stats.form,
        adaptability=stats.adaptability,
        partner_stats=[
            PartnerStatOut(
                partner_id=ps.partner_id,
                partner_name=ps.partner_name,
                games=ps.games,
                wins=ps.wins,
                point_diff=ps.point_diff,
                avg_diff=ps.avg_diff,
                win_rate=ps.win_rate,
            )
            for ps in stats.partner_stats
        ],
    )


# --- Partner Records ---


@router.get("/{slug}/partner-records", response_model=list[PartnerRecordOut])
async def get_partner_records(
    slug: str,
    player_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get partner synergy records for a player."""
    t = await _get_tournament(db, slug)

    result = await db.execute(
        select(PartnerRecord).where(
            PartnerRecord.tournament_id == t.id,
            or_(
                PartnerRecord.player1_id == player_id,
                PartnerRecord.player2_id == player_id,
            ),
        )
    )
    records = list(result.scalars().all())

    # Resolve player names
    all_partner_ids = set()
    for r in records:
        all_partner_ids.add(r.player1_id)
        all_partner_ids.add(r.player2_id)
    if all_partner_ids:
        names_result = await db.execute(
            select(Player).where(Player.id.in_(all_partner_ids))
        )
        names_map = {p.id: p.name for p in names_result.scalars().all()}
    else:
        names_map = {}

    return [
        PartnerRecordOut(
            id=r.id,
            tournament_id=r.tournament_id,
            player1_id=r.player1_id,
            player2_id=r.player2_id,
            player1_name=names_map.get(r.player1_id, ""),
            player2_name=names_map.get(r.player2_id, ""),
            games_together=r.games_together,
            wins_together=r.wins_together,
            point_diff_together=r.point_diff_together,
        )
        for r in records
    ]


@router.get("/{slug}/match-player-stats", response_model=list[MatchPlayerStatOut])
async def get_match_player_stats(
    slug: str,
    player_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Get per-match stat records for a player (for Elo history)."""
    t = await _get_tournament(db, slug)

    result = await db.execute(
        select(MatchPlayerStat).where(
            MatchPlayerStat.player_id == player_id,
        )
    )
    return list(result.scalars().all())


# --- Standings ---


@router.get("/{slug}/standings", response_model=list[StandingOut])
async def get_standings(
    slug: str,
    sort_by: Literal["rating", "elo", "win_rate"] = Query("rating"),
    db: AsyncSession = Depends(get_db),
):
    t = await _get_tournament(db, slug)
    result = await db.execute(
        select(Player).where(Player.tournament_id == t.id)
    )
    players = list(result.scalars().all())

    if sort_by == "elo":
        players.sort(key=lambda p: -p.elo_rating)
    elif sort_by == "win_rate":
        players.sort(key=lambda p: -(p.wins / p.games_played * 100 if p.games_played > 0 else 0))
    else:
        players.sort(key=lambda p: -p.rating)

    return [
        StandingOut(rank=i + 1, player=PlayerOut.model_validate(p))
        for i, p in enumerate(players)
    ]


@router.post("/{slug}/backfill-elo", response_model=list[StandingOut])
async def backfill_elo(
    slug: str,
    db: AsyncSession = Depends(get_db),
    x_admin_token: str | None = Header(None),
):
    """Reset all players to 1500 Elo and replay all finalized rounds in order."""
    t = await _get_tournament(db, slug)
    _verify_admin(t, x_admin_token)

    # Reset all players
    p_result = await db.execute(
        select(Player).where(Player.tournament_id == t.id)
    )
    players = {p.id: p for p in p_result.scalars().all()}
    for p in players.values():
        p.elo_rating = 1500.0
        p.point_differential = 0
        p.games_played = 0
        p.losses = 0
        p.wins = 0
        p.balls_won = 0
        p.balls_total = 0
        p.waitings = 0
        p.rating = 0.0

    # Load all finalized rounds in order
    rounds_result = await db.execute(
        select(Round)
        .options(
            selectinload(Round.groups).selectinload(Group.matches),
            selectinload(Round.waitings),
        )
        .where(Round.tournament_id == t.id, Round.status == RoundStatus.finalized)
        .order_by(Round.round_number)
    )
    finalized_rounds = list(rounds_result.scalars().all())

    from app.core.elo import calculate_elo_updates
    from app.core.rating import rate_player

    for round_obj in finalized_rounds:
        # Accumulate basic stats
        for group in round_obj.groups:
            for match in group.matches:
                if match.score_team1 is None:
                    continue
                s1, s2 = match.score_team1, match.score_team2
                team1 = [match.team1_p1_id, match.team1_p2_id]
                team2 = [match.team2_p1_id, match.team2_p2_id]

                for pid in team1:
                    players[pid].balls_won += s1
                    players[pid].balls_total += s1 + s2
                    players[pid].games_played += 1
                    players[pid].point_differential += s1 - s2
                for pid in team2:
                    players[pid].balls_won += s2
                    players[pid].balls_total += s1 + s2
                    players[pid].games_played += 1
                    players[pid].point_differential += s2 - s1

                if s1 > s2:
                    for pid in team1:
                        players[pid].wins += 1
                    for pid in team2:
                        players[pid].losses += 1
                elif s2 > s1:
                    for pid in team2:
                        players[pid].wins += 1
                    for pid in team1:
                        players[pid].losses += 1

        # Waitings
        for w in round_obj.waitings:
            players[w.player_id].waitings += 1

        # Elo updates
        for group in sorted(round_obj.groups, key=lambda g: g.group_index):
            for match in sorted(group.matches, key=lambda m: m.match_index):
                if match.score_team1 is None:
                    continue
                t1p1 = players[match.team1_p1_id]
                t1p2 = players[match.team1_p2_id]
                t2p1 = players[match.team2_p1_id]
                t2p2 = players[match.team2_p2_id]

                new_elos = calculate_elo_updates(
                    (t1p1.elo_rating, t1p2.elo_rating),
                    (t2p1.elo_rating, t2p2.elo_rating),
                    match.score_team1,
                    match.score_team2,
                )
                t1p1.elo_rating = new_elos[0]
                t1p2.elo_rating = new_elos[1]
                t2p1.elo_rating = new_elos[2]
                t2p2.elo_rating = new_elos[3]

    # Update ratings
    for p in players.values():
        p.rating = rate_player(p.wins, p.balls_won, p.balls_total, p.waitings)

    await db.commit()

    sorted_players = sorted(players.values(), key=lambda p: -p.rating)
    return [
        StandingOut(rank=i + 1, player=PlayerOut.model_validate(p))
        for i, p in enumerate(sorted_players)
    ]
