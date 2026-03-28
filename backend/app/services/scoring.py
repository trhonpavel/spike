"""Score processing — ported from main.py lines 299-336.

Processes match scores, updates player stats (wins, balls_won, balls_total),
recalculates ratings, computes Elo updates, and creates per-match stat records.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.tournament import (
    Player, Round, Group, Match, RoundWaiting, RoundStatus,
    MatchPlayerStat, PartnerRecord,
)
from app.core.rating import rate_player
from app.core.elo import calculate_elo_updates


async def update_match_score(
    db: AsyncSession, match: Match, score_team1: int, score_team2: int
) -> Match:
    """Update a single match score."""
    match.score_team1 = score_team1
    match.score_team2 = score_team2
    await db.commit()
    await db.refresh(match)
    return match


async def _upsert_partner_record(
    db: AsyncSession,
    tournament_id: int,
    p1_id: int,
    p2_id: int,
    won: bool,
    point_diff: int,
) -> None:
    """Upsert a PartnerRecord for a pair of players."""
    lo, hi = min(p1_id, p2_id), max(p1_id, p2_id)
    result = await db.execute(
        select(PartnerRecord).where(
            PartnerRecord.tournament_id == tournament_id,
            PartnerRecord.player1_id == lo,
            PartnerRecord.player2_id == hi,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        record = PartnerRecord(
            tournament_id=tournament_id,
            player1_id=lo,
            player2_id=hi,
            games_together=0,
            wins_together=0,
            point_diff_together=0,
        )
        db.add(record)
    record.games_together += 1
    if won:
        record.wins_together += 1
    record.point_diff_together += point_diff


async def finalize_round(db: AsyncSession, round_obj: Round) -> Round:
    """Finalize a round: process all scores, update player stats, compute Elo, and create records."""
    if round_obj.status == RoundStatus.finalized:
        raise ValueError("Round already finalized")

    # Load groups with matches
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.matches))
        .where(Group.round_id == round_obj.id)
    )
    groups = list(result.scalars().all())

    # Check all matches have scores
    for group in groups:
        for match in group.matches:
            if match.score_team1 is None or match.score_team2 is None:
                raise ValueError(
                    f"Match {match.match_index + 1} in group {group.group_index + 1} has no score"
                )

    # Accumulate stats per player
    stats: dict[int, dict] = {}

    for group in groups:
        group_player_ids = [group.player1_id, group.player2_id, group.player3_id, group.player4_id]
        for pid in group_player_ids:
            if pid not in stats:
                stats[pid] = {"wins": 0, "losses": 0, "games": 0, "balls_won": 0, "balls_total": 0, "point_diff": 0}

        for match in group.matches:
            s1 = match.score_team1
            s2 = match.score_team2
            team1 = [match.team1_p1_id, match.team1_p2_id]
            team2 = [match.team2_p1_id, match.team2_p2_id]

            for pid in team1:
                stats[pid]["balls_won"] += s1
                stats[pid]["balls_total"] += s1 + s2
                stats[pid]["games"] += 1
                stats[pid]["point_diff"] += s1 - s2
            for pid in team2:
                stats[pid]["balls_won"] += s2
                stats[pid]["balls_total"] += s1 + s2
                stats[pid]["games"] += 1
                stats[pid]["point_diff"] += s2 - s1

            if s1 > s2:
                for pid in team1:
                    stats[pid]["wins"] += 1
                for pid in team2:
                    stats[pid]["losses"] += 1
            elif s2 > s1:
                for pid in team2:
                    stats[pid]["wins"] += 1
                for pid in team1:
                    stats[pid]["losses"] += 1

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
    players = {p.id: p for p in p_result.scalars().all()}

    for pid, player in players.items():
        if pid in stats:
            s = stats[pid]
            player.wins += s["wins"]
            player.losses += s["losses"]
            player.games_played += s["games"]
            player.balls_won += s["balls_won"]
            player.balls_total += s["balls_total"]
            player.point_differential += s["point_diff"]
        if pid in waiting_ids:
            player.waitings += 1
        player.rating = rate_player(
            player.wins, player.balls_won, player.balls_total, player.waitings
        )

    # Elo updates + MatchPlayerStat creation + PartnerRecord upserts
    # We need tournament_id for partner records
    tournament_id = round_obj.tournament_id

    for group in sorted(groups, key=lambda g: g.group_index):
        for match in sorted(group.matches, key=lambda m: m.match_index):
            t1p1 = players[match.team1_p1_id]
            t1p2 = players[match.team1_p2_id]
            t2p1 = players[match.team2_p1_id]
            t2p2 = players[match.team2_p2_id]

            # Snapshot elo_before
            elo_before = {
                t1p1.id: t1p1.elo_rating,
                t1p2.id: t1p2.elo_rating,
                t2p1.id: t2p1.elo_rating,
                t2p2.id: t2p2.elo_rating,
            }

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

            s1, s2 = match.score_team1, match.score_team2
            team1_won = s1 > s2
            team2_won = s2 > s1

            # Create MatchPlayerStat rows (4 per match)
            for pid, partner_id, side, score_for, score_against, won, elo_after in [
                (t1p1.id, t1p2.id, "team1", s1, s2, team1_won, new_elos[0]),
                (t1p2.id, t1p1.id, "team1", s1, s2, team1_won, new_elos[1]),
                (t2p1.id, t2p2.id, "team2", s2, s1, team2_won, new_elos[2]),
                (t2p2.id, t2p1.id, "team2", s2, s1, team2_won, new_elos[3]),
            ]:
                db.add(MatchPlayerStat(
                    match_id=match.id,
                    player_id=pid,
                    side=side,
                    partner_id=partner_id,
                    score_for=score_for,
                    score_against=score_against,
                    won=won,
                    elo_before=elo_before[pid],
                    elo_after=elo_after,
                ))

            # Upsert PartnerRecords
            await _upsert_partner_record(
                db, tournament_id, t1p1.id, t1p2.id, team1_won, s1 - s2
            )
            await _upsert_partner_record(
                db, tournament_id, t2p1.id, t2p2.id, team2_won, s2 - s1
            )

    round_obj.status = RoundStatus.finalized
    await db.commit()
    return round_obj


async def unfinalize_round(db: AsyncSession, round_obj: Round) -> Round:
    """Reverse finalization: restore all player stats/Elo and set round back to confirmed."""
    if round_obj.status != RoundStatus.finalized:
        raise ValueError("Round is not finalized")

    # Only allow undoing the last finalized round
    result = await db.execute(
        select(Round).where(
            Round.tournament_id == round_obj.tournament_id,
            Round.status == RoundStatus.finalized,
            Round.round_number > round_obj.round_number,
        )
    )
    if result.scalar_one_or_none():
        raise ValueError("Can only undo the last finalized round")

    # Load groups + matches
    result = await db.execute(
        select(Group).options(selectinload(Group.matches)).where(Group.round_id == round_obj.id)
    )
    groups = list(result.scalars().all())
    match_ids = [m.id for g in groups for m in g.matches]

    if match_ids:
        # Load all MatchPlayerStat records for this round
        mps_result = await db.execute(
            select(MatchPlayerStat).where(MatchPlayerStat.match_id.in_(match_ids))
        )
        all_mps = list(mps_result.scalars().all())

        # Group by player
        by_player: dict[int, list[MatchPlayerStat]] = {}
        for mps in all_mps:
            by_player.setdefault(mps.player_id, []).append(mps)

        # Load affected players
        p_result = await db.execute(select(Player).where(Player.id.in_(by_player.keys())))
        players = {p.id: p for p in p_result.scalars().all()}

        for pid, mps_list in by_player.items():
            player = players[pid]
            mps_list.sort(key=lambda m: m.match_id)

            # Restore Elo to before the first match in this round
            player.elo_rating = mps_list[0].elo_before

            # Reverse accumulated stats
            player.wins -= sum(1 for m in mps_list if m.won)
            player.losses -= sum(1 for m in mps_list if not m.won)
            player.games_played -= len(mps_list)
            player.balls_won -= sum(m.score_for for m in mps_list)
            player.balls_total -= sum(m.score_for + m.score_against for m in mps_list)
            player.point_differential -= sum(m.score_for - m.score_against for m in mps_list)
            player.rating = rate_player(player.wins, player.balls_won, player.balls_total, player.waitings)

        # Reverse PartnerRecords
        tournament_id = round_obj.tournament_id
        for group in groups:
            for match in group.matches:
                s1, s2 = match.score_team1, match.score_team2
                for lo, hi, won, diff in [
                    (min(match.team1_p1_id, match.team1_p2_id), max(match.team1_p1_id, match.team1_p2_id), s1 > s2, s1 - s2),
                    (min(match.team2_p1_id, match.team2_p2_id), max(match.team2_p1_id, match.team2_p2_id), s2 > s1, s2 - s1),
                ]:
                    pr_result = await db.execute(
                        select(PartnerRecord).where(
                            PartnerRecord.tournament_id == tournament_id,
                            PartnerRecord.player1_id == lo,
                            PartnerRecord.player2_id == hi,
                        )
                    )
                    pr = pr_result.scalar_one_or_none()
                    if pr:
                        pr.games_together -= 1
                        if won:
                            pr.wins_together -= 1
                        pr.point_diff_together -= diff
                        if pr.games_together <= 0:
                            await db.delete(pr)

        # Delete MatchPlayerStat records
        for mps in all_mps:
            await db.delete(mps)

    # Reverse waitings
    wait_result = await db.execute(
        select(RoundWaiting).where(RoundWaiting.round_id == round_obj.id)
    )
    for wr in wait_result.scalars().all():
        p_result = await db.get(Player, wr.player_id)
        if p_result:
            p_result.waitings -= 1
            p_result.rating = rate_player(p_result.wins, p_result.balls_won, p_result.balls_total, p_result.waitings)

    round_obj.status = RoundStatus.confirmed
    await db.commit()
    return round_obj
