"""2v2 Elo rating with score-margin K-factor scaling."""

from __future__ import annotations


def _margin_multiplier(score_diff: int) -> float:
    """K-factor multiplier based on score margin."""
    diff = abs(score_diff)
    if diff <= 3:
        return 1.0
    elif diff <= 7:
        return 1.25
    else:
        return 1.5


def _expected(team_elo: float, opp_elo: float) -> float:
    """Expected score (probability of winning)."""
    return 1.0 / (1.0 + 10.0 ** ((opp_elo - team_elo) / 400.0))


def calculate_elo_updates(
    team1_elos: tuple[float, float],
    team2_elos: tuple[float, float],
    score1: int,
    score2: int,
    base_k: float = 32.0,
) -> tuple[float, float, float, float]:
    """Calculate new Elo ratings for all 4 players after a 2v2 match.

    Args:
        team1_elos: (player1_elo, player2_elo) for team 1.
        team2_elos: (player1_elo, player2_elo) for team 2.
        score1: Team 1 score.
        score2: Team 2 score.
        base_k: Base K-factor (default 32).

    Returns:
        Tuple of 4 new elo values: (t1p1_new, t1p2_new, t2p1_new, t2p2_new).
    """
    team1_avg = (team1_elos[0] + team1_elos[1]) / 2.0
    team2_avg = (team2_elos[0] + team2_elos[1]) / 2.0

    expected1 = _expected(team1_avg, team2_avg)
    expected2 = 1.0 - expected1

    # Actual outcome: 1 = win, 0 = loss, 0.5 = draw
    if score1 > score2:
        actual1, actual2 = 1.0, 0.0
    elif score2 > score1:
        actual1, actual2 = 0.0, 1.0
    else:
        actual1, actual2 = 0.5, 0.5

    multiplier = _margin_multiplier(score1 - score2)
    k = base_k * multiplier

    delta1 = k * (actual1 - expected1)
    delta2 = k * (actual2 - expected2)

    return (
        round(team1_elos[0] + delta1, 2),
        round(team1_elos[1] + delta1, 2),
        round(team2_elos[0] + delta2, 2),
        round(team2_elos[1] + delta2, 2),
    )
