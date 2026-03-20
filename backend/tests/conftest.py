"""Shared pytest fixtures."""

import pytest


@pytest.fixture
def sample_players():
    """4 players with varying elo for test scenarios."""
    return [
        {"id": 1, "name": "Alice", "elo": 1500.0},
        {"id": 2, "name": "Bob", "elo": 1600.0},
        {"id": 3, "name": "Charlie", "elo": 1400.0},
        {"id": 4, "name": "Diana", "elo": 1550.0},
    ]
