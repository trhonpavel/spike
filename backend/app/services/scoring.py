"""Score processing — ported from main.py lines 299-336.

Processes match scores, updates player stats (wins, balls_won, balls_total),
and recalculates ratings.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tournament import (
    Player, Round, Group, Match, RoundWaiting, RoundStatus,
)
from app.core.rating import rate_player


async def update_match_score(
    db: AsyncSession, match: Match, score_team1: int, score_team2: int
) -> Match:
    """Update a single match score."""
    match.score_team1 = score_team1
    match.score_team2 = score_team2
    await db.commit()
    await db.refresh(match)
    return match


async def finalize_round(db: AsyncSession, round_obj: Round) -> Round:
    """Finalize a round: process all scores and update player stats.

    Port of main.py lines 299-336.
    """
    if round_obj.status == RoundStatus.finalized:
        raise ValueError("Round already finalized")

    # Load groups with matches
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.matches))
        .where(Group.round_id == round_obj.id)
    )
    groups = result.scalars().all()

    # Check all matches have scores
    for group in groups:
        for match in group.matches:
            if match.score_team1 is None or match.score_team2 is None:
                raise ValueError(
                    f"Match {match.match_index + 1} in group {group.group_index + 1} has no score"
                )

    # Accumulate stats per player: {player_id: {wins, balls_won, balls_total}}
    stats: dict[int, dict] = {}

    for group in groups:
        group_player_ids = [group.player1_id, group.player2_id, group.player3_id, group.player4_id]
        for pid in group_player_ids:
            if pid not in stats:
                stats[pid] = {"wins": 0, "balls_won": 0, "balls_total": 0}

        for match in group.matches:
            s1 = match.score_team1
            s2 = match.score_team2
            team1 = [match.team1_p1_id, match.team1_p2_id]
            team2 = [match.team2_p1_id, match.team2_p2_id]

            for pid in team1:
                stats[pid]["balls_won"] += s1
                stats[pid]["balls_total"] += s1 + s2
            for pid in team2:
                stats[pid]["balls_won"] += s2
                stats[pid]["balls_total"] += s1 + s2

            if s1 > s2:
                for pid in team1:
                    stats[pid]["wins"] += 1
            elif s2 > s1:
                for pid in team2:
                    stats[pid]["wins"] += 1

    # Load waiting players
    wait_result = await db.execute(
        select(RoundWaiting).where(RoundWaiting.round_id == round_obj.id)
    )
    waiting_records = wait_result.scalars().all()
    waiting_ids = {w.player_id for w in waiting_records}

    # Update all tournament players
    player_ids = set(stats.keys()) | waiting_ids
    p_result = await db.execute(
        select(Player).where(Player.id.in_(player_ids))
    )
    players = p_result.scalars().all()

    for player in players:
        if player.id in stats:
            s = stats[player.id]
            player.wins += s["wins"]
            player.balls_won += s["balls_won"]
            player.balls_total += s["balls_total"]
        if player.id in waiting_ids:
            player.waitings += 1
        player.rating = rate_player(
            player.wins, player.balls_won, player.balls_total, player.waitings
        )

    round_obj.status = RoundStatus.finalized
    await db.commit()
    return round_obj
