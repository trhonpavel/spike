"""Draw algorithm — ported from main.py lines 157-238.

Creates groups of 4 players, optimizes to minimize repeated groupings
and skill differences within groups.
"""

import copy
import random
import time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tournament import (
    Tournament, Player, Round, Group, Match, RoundWaiting, RoundStatus,
)
from app.core.draw_optimizer import DrawPlayer, sameness, rate_draw

# Match pairings within a group of 4 players (indices 0-3):
# match 0: (0,1) vs (2,3)   match 1: (0,2) vs (1,3)   match 2: (0,3) vs (1,2)
MATCH_TABLE = [
    (0, 1, 2, 3),
    (0, 2, 1, 3),
    (0, 3, 1, 2),
]


async def get_played_games(db: AsyncSession, tournament_id: int) -> list[list[int]]:
    """Get list of past groups as lists of player IDs."""
    result = await db.execute(
        select(Group)
        .join(Round)
        .where(
            Round.tournament_id == tournament_id,
            Round.status == RoundStatus.finalized,
        )
    )
    groups = result.scalars().all()
    return [
        [g.player1_id, g.player2_id, g.player3_id, g.player4_id]
        for g in groups
    ]


def _optimize_draw(
    groups: list[list[DrawPlayer]],
    played_games: list[list[int]],
    time_limit: float = 5.0,
) -> list[list[DrawPlayer]]:
    """Optimize draw by swapping players between adjacent groups.

    Port of main.py lines 175-238.
    """
    games_count = len(groups)
    if games_count < 2:
        return groups

    # Phase 1: fix duplicate groups by swapping with next group
    for i in range(games_count - 1):
        ids_i = [p.id for p in groups[i]]
        ids_next = [p.id for p in groups[i + 1]]
        need_fix = (
            sameness(ids_i, played_games) == 4
            or (i == games_count - 2 and sameness(ids_next, played_games) == 4)
        )
        if need_fix:
            min_diff = 100000.0
            best_swap = None
            for j in range(4):
                for k in range(4):
                    new_i = [p.id for p in groups[i]]
                    new_next = [p.id for p in groups[i + 1]]
                    new_i[j] = groups[i + 1][k].id
                    new_next[k] = groups[i][j].id
                    if sameness(new_i, played_games) != 4 and sameness(new_next, played_games) != 4:
                        diff = abs(groups[i][j].rating - groups[i + 1][k].rating)
                        if diff < min_diff:
                            best_swap = (j, k)
                            min_diff = diff
            if best_swap:
                j, k = best_swap
                groups[i][j], groups[i + 1][k] = groups[i + 1][k], groups[i][j]

    # Phase 2: optimize by trying all single swaps (+ nested double swaps)
    best = copy.deepcopy(groups)
    best_ranking = rate_draw(groups, played_games)
    if best_ranking == -1:
        best_ranking = 10000000.0

    start = time.monotonic()
    for i in range(games_count - 1):
        for j in range(4):
            for k in range(4):
                trial = copy.deepcopy(groups)
                trial[i][j], trial[i + 1][k] = trial[i + 1][k], trial[i][j]
                ranking = rate_draw(trial, played_games)
                if ranking > -0.5 and ranking < best_ranking:
                    best_ranking = ranking
                    best = copy.deepcopy(trial)
                # Nested double swap within time limit
                if (time.monotonic() - start) < time_limit:
                    for ii in range(i, games_count - 1):
                        l_start = j + 1 if ii == i else 0
                        m_start = k + 1 if ii == i else 0
                        for jj in range(l_start, 4):
                            for kk in range(m_start, 4):
                                trial2 = copy.deepcopy(trial)
                                trial2[ii][jj], trial2[ii + 1][kk] = trial2[ii + 1][kk], trial2[ii][jj]
                                ranking2 = rate_draw(trial2, played_games)
                                if ranking2 > -0.5 and ranking2 < best_ranking:
                                    best_ranking = ranking2
                                    best = copy.deepcopy(trial2)

    return best


async def perform_draw(db: AsyncSession, tournament: Tournament) -> Round:
    """Perform a round draw for a tournament. Returns the new Round."""
    result = await db.execute(
        select(Player).where(Player.tournament_id == tournament.id)
    )
    players = list(result.scalars().all())

    if len(players) < 4:
        raise ValueError("Need at least 4 players")

    # Get past groups
    played_games = await get_played_games(db, tournament.id)

    # Determine round number
    rounds_result = await db.execute(
        select(Round).where(Round.tournament_id == tournament.id)
    )
    existing_rounds = rounds_result.scalars().all()
    round_number = len(existing_rounds) + 1

    # Check for unfinalized rounds
    for r in existing_rounds:
        if r.status != RoundStatus.finalized:
            raise ValueError(f"Round {r.round_number} is not finalized yet")

    # Shuffle and determine waiting players
    random.shuffle(players)
    waiting_count = len(players) % 4
    players.sort(key=lambda p: p.waitings)
    waiting_players = players[:waiting_count]
    active_players = players[waiting_count:]
    active_players.sort(key=lambda p: -p.elo_rating)

    # Build draw players and form initial groups
    draw_players = [
        DrawPlayer(id=p.id, name=p.name, rating=p.rating, waitings=p.waitings, elo_rating=p.elo_rating)
        for p in active_players
    ]
    games_count = len(draw_players) // 4
    initial_groups = [
        draw_players[4 * i: 4 * i + 4] for i in range(games_count)
    ]

    # Optimize
    optimized = _optimize_draw(initial_groups, played_games)

    # Create Round
    new_round = Round(
        tournament_id=tournament.id,
        round_number=round_number,
        status=RoundStatus.drawn,
    )
    db.add(new_round)
    await db.flush()

    # Create waiting records
    for wp in waiting_players:
        db.add(RoundWaiting(round_id=new_round.id, player_id=wp.id))

    # Create groups and matches
    for idx, group_players in enumerate(optimized):
        group = Group(
            round_id=new_round.id,
            group_index=idx,
            player1_id=group_players[0].id,
            player2_id=group_players[1].id,
            player3_id=group_players[2].id,
            player4_id=group_players[3].id,
        )
        db.add(group)
        await db.flush()

        for mi, (t1p1, t1p2, t2p1, t2p2) in enumerate(MATCH_TABLE):
            match = Match(
                group_id=group.id,
                match_index=mi,
                team1_p1_id=group_players[t1p1].id,
                team1_p2_id=group_players[t1p2].id,
                team2_p1_id=group_players[t2p1].id,
                team2_p2_id=group_players[t2p2].id,
            )
            db.add(match)

    await db.commit()

    # Reload with relationships
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
        .where(Round.id == new_round.id)
    )
    return result.scalar_one()
