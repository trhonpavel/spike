"""Tests for legacy rating formula."""

from app.core.rating import rate_player


class TestRatePlayer:
    def test_zero_stats(self):
        assert rate_player(0, 0, 0, 0) == 0.0

    def test_wins_contribute(self):
        r = rate_player(5, 0, 0, 0)
        assert r == 10.0  # 2.0 * 5

    def test_waitings_contribute(self):
        r = rate_player(0, 0, 0, 3)
        assert r == 9.0  # 3.0 * 3

    def test_balls_ratio(self):
        r = rate_player(0, 50, 100, 0)
        assert r == 1.0  # round(50/100 * 2, 2)

    def test_full_calculation(self):
        r = rate_player(3, 40, 80, 1)
        # 2*3 + 3*1 + round(40/80 * 2, 2)
        # = 6 + 3 + 1.0 = 10.0
        assert r == 10.0

    def test_zero_balls_total(self):
        """Should not divide by zero when balls_total is 0."""
        r = rate_player(2, 0, 0, 1)
        assert r == 2 * 2 + 3 * 1  # 7.0

    def test_high_waitings(self):
        r = rate_player(0, 0, 0, 10)
        assert r == 30.0  # 3.0 * 10
