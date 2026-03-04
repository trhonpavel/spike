"""Draw quality evaluation — ported from main.py finddiff(), sameness(), ratedraw()."""

from dataclasses import dataclass


@dataclass
class DrawPlayer:
    id: int
    name: str
    rating: float
    waitings: int


def find_diff(ratings: list[float]) -> float:
    """Sum of squared differences between all pairs of 4 ratings."""
    diff = 0.0
    for i in range(4):
        for j in range(i + 1, 4):
            diff += (ratings[i] - ratings[j]) ** 2
    return round(diff, 2)


def sameness(game_ids: list[int], played_games: list[list[int]]) -> int:
    """Max number of overlapping players between a proposed group and any past group."""
    best = 0
    for past in played_games:
        count = sum(1 for pid in game_ids if pid in past)
        if count > best:
            best = count
        if best == 4:
            return 4
    return best


def rate_draw(groups: list[list[DrawPlayer]], played_games: list[list[int]]) -> float:
    """Rate quality of a draw. Lower is better. Returns -1 if any group is a duplicate."""
    rating = 0.0
    for group in groups:
        ids = [p.id for p in group]
        same = sameness(ids, played_games)
        if same == 4:
            return -1.0
        rating += [0, 0, 6, 20][same]
        rating += find_diff([p.rating for p in group])
    return rating
