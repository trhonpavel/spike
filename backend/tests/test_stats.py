"""Tests for compute_player_stats."""

from unittest.mock import MagicMock
from app.core.stats import compute_player_stats


def _make_match(t1p1, t1p2, t2p1, t2p2, s1, s2):
    m = MagicMock()
    m.team1_p1_id = t1p1
    m.team1_p2_id = t1p2
    m.team2_p1_id = t2p1
    m.team2_p2_id = t2p2
    m.score_team1 = s1
    m.score_team2 = s2
    return m


def _make_round(round_number, matches):
    group = MagicMock()
    group.matches = matches
    r = MagicMock()
    r.round_number = round_number
    r.groups = [group]
    return r


class TestComputePlayerStats:
    def test_empty_data(self):
        stats = compute_player_stats(1, [], {})
        assert stats.games_played == 0
        assert stats.wins == 0
        assert stats.losses == 0
        assert stats.point_differential == 0
        assert stats.win_rate == 0.0

    def test_single_win(self):
        match = _make_match(1, 2, 3, 4, 21, 10)
        r = _make_round(1, [match])
        names = {1: "Alice", 2: "Bob", 3: "Charlie", 4: "Diana"}
        stats = compute_player_stats(1, [r], names)
        assert stats.games_played == 1
        assert stats.wins == 1
        assert stats.losses == 0
        assert stats.point_differential == 11
        assert stats.win_rate == 100.0

    def test_single_loss(self):
        match = _make_match(1, 2, 3, 4, 10, 21)
        r = _make_round(1, [match])
        stats = compute_player_stats(1, [r], {})
        assert stats.wins == 0
        assert stats.losses == 1
        assert stats.point_differential == -11

    def test_player_on_team2(self):
        match = _make_match(1, 2, 3, 4, 10, 21)
        r = _make_round(1, [match])
        stats = compute_player_stats(3, [r], {})
        assert stats.wins == 1
        assert stats.point_differential == 11

    def test_multiple_rounds(self):
        m1 = _make_match(1, 2, 3, 4, 21, 15)
        m2 = _make_match(1, 3, 2, 4, 10, 21)
        r1 = _make_round(1, [m1])
        r2 = _make_round(2, [m2])
        stats = compute_player_stats(1, [r1, r2], {2: "Bob", 3: "Charlie"})
        assert stats.games_played == 2
        assert stats.wins == 1
        assert stats.losses == 1
        assert len(stats.partner_stats) == 2

    def test_partner_stats(self):
        m1 = _make_match(1, 2, 3, 4, 21, 15)
        m2 = _make_match(1, 2, 3, 4, 21, 10)
        r = _make_round(1, [m1, m2])
        names = {2: "Bob"}
        stats = compute_player_stats(1, [r], names)
        assert len(stats.partner_stats) == 1
        assert stats.partner_stats[0].partner_name == "Bob"
        assert stats.partner_stats[0].games == 2
        assert stats.partner_stats[0].wins == 2

    def test_player_not_in_match(self):
        match = _make_match(1, 2, 3, 4, 21, 10)
        r = _make_round(1, [match])
        stats = compute_player_stats(5, [r], {})
        assert stats.games_played == 0

    def test_none_scores_skipped(self):
        match = _make_match(1, 2, 3, 4, None, None)
        r = _make_round(1, [match])
        stats = compute_player_stats(1, [r], {})
        assert stats.games_played == 0

    def test_clutch_score(self):
        """Close games (diff <= 3) should count towards clutch."""
        m1 = _make_match(1, 2, 3, 4, 21, 19)  # close, win
        m2 = _make_match(1, 2, 3, 4, 19, 21)  # close, loss
        m3 = _make_match(1, 2, 3, 4, 21, 10)  # not close
        r = _make_round(1, [m1, m2, m3])
        stats = compute_player_stats(1, [r], {})
        assert stats.clutch_score == 50.0  # 1 win out of 2 close games

    def test_consistency(self):
        """Consistency (stdev) should be 0 when all diffs are equal."""
        m1 = _make_match(1, 2, 3, 4, 21, 11)
        m2 = _make_match(1, 2, 3, 4, 21, 11)
        r = _make_round(1, [m1, m2])
        stats = compute_player_stats(1, [r], {})
        assert stats.consistency == 0.0
