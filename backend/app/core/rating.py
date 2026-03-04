"""Player rating calculation — ported from main.py rateplayer()."""


def rate_player(wins: int, balls_won: int, balls_total: int, waitings: int) -> float:
    rating = 2.0 * wins + 3.0 * waitings
    if balls_total != 0:
        rating += round(balls_won / balls_total * 2, 2)
    return rating
