"""Tests for 2v2 Elo rating system."""

from app.core.elo import calculate_elo_updates, _margin_multiplier, _expected


class TestMarginMultiplier:
    def test_close_game(self):
        assert _margin_multiplier(0) == 1.0
        assert _margin_multiplier(1) == 1.0
        assert _margin_multiplier(3) == 1.0

    def test_medium_margin(self):
        assert _margin_multiplier(4) == 1.25
        assert _margin_multiplier(7) == 1.25

    def test_blowout(self):
        assert _margin_multiplier(8) == 1.5
        assert _margin_multiplier(15) == 1.5

    def test_negative_input(self):
        """Negative score diffs should use absolute value."""
        assert _margin_multiplier(-5) == 1.25


class TestExpected:
    def test_equal_elos(self):
        assert _expected(1500, 1500) == 0.5

    def test_higher_elo_favored(self):
        assert _expected(1600, 1400) > 0.5

    def test_lower_elo_underdog(self):
        assert _expected(1400, 1600) < 0.5

    def test_symmetric(self):
        e1 = _expected(1600, 1400)
        e2 = _expected(1400, 1600)
        assert abs(e1 + e2 - 1.0) < 1e-10


class TestCalculateEloUpdates:
    def test_equal_teams_team1_wins(self):
        new = calculate_elo_updates((1500, 1500), (1500, 1500), 21, 15)
        # Team 1 should gain, team 2 should lose
        assert new[0] > 1500
        assert new[1] > 1500
        assert new[2] < 1500
        assert new[3] < 1500

    def test_equal_teams_team2_wins(self):
        new = calculate_elo_updates((1500, 1500), (1500, 1500), 10, 21)
        assert new[0] < 1500
        assert new[1] < 1500
        assert new[2] > 1500
        assert new[3] > 1500

    def test_draw(self):
        new = calculate_elo_updates((1500, 1500), (1500, 1500), 15, 15)
        # Equal teams drawing should result in no change
        assert new == (1500.0, 1500.0, 1500.0, 1500.0)

    def test_unequal_teams_upset(self):
        """Weaker team winning should gain more than expected."""
        new = calculate_elo_updates((1400, 1400), (1600, 1600), 21, 15)
        # Team 1 (weaker) won, should gain a lot
        gain = new[0] - 1400
        assert gain > 16  # More than base K/2

    def test_both_teammates_get_same_delta(self):
        new = calculate_elo_updates((1500, 1600), (1450, 1550), 21, 10)
        delta1 = new[0] - 1500
        delta2 = new[1] - 1600
        assert abs(delta1 - delta2) < 1e-10

    def test_larger_margin_bigger_change(self):
        close = calculate_elo_updates((1500, 1500), (1500, 1500), 21, 19)
        blowout = calculate_elo_updates((1500, 1500), (1500, 1500), 21, 5)
        # Blowout should create bigger rating change
        assert blowout[0] - 1500 > close[0] - 1500

    def test_zero_zero_draw(self):
        new = calculate_elo_updates((1500, 1500), (1500, 1500), 0, 0)
        assert new == (1500.0, 1500.0, 1500.0, 1500.0)

    def test_returns_rounded_values(self):
        new = calculate_elo_updates((1500, 1500), (1500, 1500), 21, 15)
        for v in new:
            # Should be rounded to 2 decimal places
            assert v == round(v, 2)
