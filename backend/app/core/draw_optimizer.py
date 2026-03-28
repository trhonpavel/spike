"""Draw quality evaluation — ported from main.py finddiff(), sameness(), ratedraw()."""

from dataclasses import dataclass


@dataclass
class DrawPlayer:
    id: int
    name: str
    rating: float
    waitings: int
    elo_rating: float = 1500.0


def find_diff(ratings: list[float]) -> float:
    """Sum of normalized squared differences between all pairs of 4 ratings.
    Divided by 100² so a 100-point Elo gap contributes ~1.0, not 10000.
    """
    diff = 0.0
    for i in range(4):
        for j in range(i + 1, 4):
            diff += ((ratings[i] - ratings[j]) / 100) ** 2
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


def rate_draw(
    groups: list[list[DrawPlayer]],
    played_games: list[list[int]],
    partner_counts: dict[tuple[int, int], int] | None = None,
) -> float:
    """Rate quality of a draw. Lower is better. Returns -1 if any group is a duplicate.

    Scoring:
    - Group-level sameness penalty: +30 for 2 repeats, +100 for 3 repeats, -1 (reject) for 4
    - Pair-level partner history: +10 / +30 / +60 for 1 / 2 / 3+ times partnered
    - Elo balance: sum of normalized squared differences (100-pt gap ≈ 1.0)
    """
    rating = 0.0
    for group in groups:
        ids = [p.id for p in group]
        same = sameness(ids, played_games)
        if same == 4:
            return -1.0
        rating += [0, 0, 30, 100][same]
        rating += find_diff([p.elo_rating for p in group])

        if partner_counts:
            for i in range(4):
                for j in range(i + 1, 4):
                    key = (min(ids[i], ids[j]), max(ids[i], ids[j]))
                    count = partner_counts.get(key, 0)
                    if count == 1:
                        rating += 10
                    elif count == 2:
                        rating += 30
                    elif count >= 3:
                        rating += 60
    return rating
