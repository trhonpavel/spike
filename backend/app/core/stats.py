"""Computed advanced player statistics from match data.

Computes stats on-the-fly from finalized rounds — no DB changes needed.
"""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field


@dataclass
class PartnerStat:
    partner_id: int
    partner_name: str
    games: int = 0
    wins: int = 0
    point_diff: int = 0

    @property
    def avg_diff(self) -> float:
        return round(self.point_diff / self.games, 2) if self.games else 0.0

    @property
    def win_rate(self) -> float:
        return round(self.wins / self.games * 100, 1) if self.games else 0.0


@dataclass
class PlayerStats:
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    point_differential: int = 0
    avg_point_diff: float = 0.0
    win_rate: float = 0.0
    consistency: float = 0.0
    clutch_score: float = 0.0
    form: float = 0.0
    adaptability: int = 0
    partner_stats: list[PartnerStat] = field(default_factory=list)


@dataclass
class _MatchInfo:
    """Internal: one match from the player's perspective."""
    round_number: int
    partner_id: int
    my_score: int
    opp_score: int
    won: bool


def compute_player_stats(
    player_id: int,
    finalized_rounds: list,
    player_names: dict[int, str] | None = None,
) -> PlayerStats:
    """Compute advanced stats for a player from finalized round data.

    Args:
        player_id: The player to compute stats for.
        finalized_rounds: List of Round ORM objects with groups→matches loaded.
        player_names: Optional {id: name} map for resolving partner names.

    Returns:
        PlayerStats with all computed fields.
    """
    if player_names is None:
        player_names = {}

    matches: list[_MatchInfo] = []

    for round_obj in finalized_rounds:
        for group in round_obj.groups:
            for match in group.matches:
                if match.score_team1 is None:
                    continue

                team1 = [match.team1_p1_id, match.team1_p2_id]
                team2 = [match.team2_p1_id, match.team2_p2_id]

                if player_id in team1:
                    partner_id = team1[1] if team1[0] == player_id else team1[0]
                    my_score = match.score_team1
                    opp_score = match.score_team2
                elif player_id in team2:
                    partner_id = team2[1] if team2[0] == player_id else team2[0]
                    my_score = match.score_team2
                    opp_score = match.score_team1
                else:
                    continue

                matches.append(_MatchInfo(
                    round_number=round_obj.round_number,
                    partner_id=partner_id,
                    my_score=my_score,
                    opp_score=opp_score,
                    won=my_score > opp_score,
                ))

    stats = PlayerStats()

    if not matches:
        return stats

    stats.games_played = len(matches)
    stats.wins = sum(1 for m in matches if m.won)
    stats.losses = stats.games_played - stats.wins

    # Point differential
    diffs = [m.my_score - m.opp_score for m in matches]
    stats.point_differential = sum(diffs)
    stats.avg_point_diff = round(stats.point_differential / stats.games_played, 2)

    # Win rate
    stats.win_rate = round(stats.wins / stats.games_played * 100, 1)

    # Consistency = stdev of per-match diffs (lower = more consistent)
    if len(diffs) >= 2:
        stats.consistency = round(statistics.stdev(diffs), 2)
    else:
        stats.consistency = 0.0

    # Clutch score = win% in close matches (|diff| <= 3)
    close = [m for m in matches if abs(m.my_score - m.opp_score) <= 3]
    if close:
        close_wins = sum(1 for m in close if m.won)
        stats.clutch_score = round(close_wins / len(close) * 100, 1)

    # Form = win% in last 5 rounds (by round_number)
    round_numbers = sorted(set(m.round_number for m in matches))
    last_5_rounds = set(round_numbers[-5:]) if round_numbers else set()
    recent = [m for m in matches if m.round_number in last_5_rounds]
    if recent:
        recent_wins = sum(1 for m in recent if m.won)
        stats.form = round(recent_wins / len(recent) * 100, 1)

    # Partner stats
    partner_map: dict[int, PartnerStat] = {}
    for m in matches:
        if m.partner_id not in partner_map:
            partner_map[m.partner_id] = PartnerStat(
                partner_id=m.partner_id,
                partner_name=player_names.get(m.partner_id, f"Player #{m.partner_id}"),
            )
        ps = partner_map[m.partner_id]
        ps.games += 1
        if m.won:
            ps.wins += 1
        ps.point_diff += m.my_score - m.opp_score

    stats.partner_stats = sorted(partner_map.values(), key=lambda p: -p.games)

    # Adaptability = number of partners with >50% win rate
    stats.adaptability = sum(
        1 for ps in stats.partner_stats if ps.games >= 1 and ps.win_rate > 50
    )

    return stats
