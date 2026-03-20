"""Tests for draw quality evaluation functions."""

from app.core.draw_optimizer import find_diff, sameness, rate_draw, DrawPlayer


class TestFindDiff:
    def test_equal_ratings(self):
        assert find_diff([1500, 1500, 1500, 1500]) == 0.0

    def test_varied_ratings(self):
        result = find_diff([1400, 1500, 1600, 1700])
        assert result > 0

    def test_symmetric(self):
        """Order shouldn't matter for total difference."""
        a = find_diff([1400, 1500, 1600, 1700])
        b = find_diff([1700, 1600, 1500, 1400])
        assert a == b

    def test_two_groups_comparison(self):
        """More spread should give higher diff."""
        tight = find_diff([1490, 1500, 1510, 1520])
        spread = find_diff([1300, 1500, 1700, 1900])
        assert spread > tight


class TestSameness:
    def test_no_history(self):
        assert sameness([1, 2, 3, 4], []) == 0

    def test_completely_new(self):
        assert sameness([1, 2, 3, 4], [[5, 6, 7, 8]]) == 0

    def test_partial_overlap(self):
        assert sameness([1, 2, 3, 4], [[1, 2, 5, 6]]) == 2

    def test_full_overlap(self):
        assert sameness([1, 2, 3, 4], [[1, 2, 3, 4]]) == 4

    def test_multiple_past_games(self):
        past = [[1, 2, 5, 6], [1, 3, 5, 7], [1, 2, 3, 8]]
        assert sameness([1, 2, 3, 4], past) == 3


class TestRateDraw:
    def _make_players(self, ids):
        return [DrawPlayer(id=i, name=f"P{i}", rating=0, waitings=0, elo_rating=1500) for i in ids]

    def test_no_history(self):
        groups = [self._make_players([1, 2, 3, 4])]
        result = rate_draw(groups, [])
        assert result >= 0

    def test_duplicate_group_returns_negative(self):
        groups = [self._make_players([1, 2, 3, 4])]
        result = rate_draw(groups, [[1, 2, 3, 4]])
        assert result == -1.0

    def test_better_draw_scores_lower(self):
        """Equal elo groups should score lower (better) than spread groups."""
        equal_group = [
            DrawPlayer(id=i, name=f"P{i}", rating=0, waitings=0, elo_rating=1500)
            for i in [1, 2, 3, 4]
        ]
        spread_group = [
            DrawPlayer(id=1, name="P1", rating=0, waitings=0, elo_rating=1200),
            DrawPlayer(id=2, name="P2", rating=0, waitings=0, elo_rating=1400),
            DrawPlayer(id=3, name="P3", rating=0, waitings=0, elo_rating=1600),
            DrawPlayer(id=4, name="P4", rating=0, waitings=0, elo_rating=1800),
        ]
        equal_score = rate_draw([equal_group], [])
        spread_score = rate_draw([spread_group], [])
        assert equal_score < spread_score
