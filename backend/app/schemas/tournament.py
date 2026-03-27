from pydantic import BaseModel, Field


class TournamentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class TournamentOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    admin_token: str | None = None

    model_config = {"from_attributes": True}


class TournamentPublic(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    league_slug: str | None = None

    model_config = {"from_attributes": True}


class PlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    elo_rating: float | None = None  # None = auto (avg if mid-tournament, else 1500)


class PlayerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    active: bool | None = None


class PlayerBulkCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    elo_rating: float = 1500.0


class PlayerOut(BaseModel):
    id: int
    name: str
    wins: int
    balls_won: int
    balls_total: int
    waitings: int
    rating: float
    elo_rating: float = 1500.0
    point_differential: int = 0
    games_played: int = 0
    losses: int = 0
    active: bool = True

    model_config = {"from_attributes": True}


class MatchOut(BaseModel):
    id: int
    match_index: int
    team1_p1: PlayerOut
    team1_p2: PlayerOut
    team2_p1: PlayerOut
    team2_p2: PlayerOut
    score_team1: int | None
    score_team2: int | None


class GroupOut(BaseModel):
    id: int
    group_index: int
    players: list[PlayerOut]
    matches: list[MatchOut]


class RoundOut(BaseModel):
    id: int
    round_number: int
    status: str
    groups: list[GroupOut]
    waiting_players: list[PlayerOut]


class ScoreUpdate(BaseModel):
    score_team1: int = Field(ge=0, le=30)
    score_team2: int = Field(ge=0, le=30)


class StandingOut(BaseModel):
    rank: int
    player: PlayerOut


class PartnerStatOut(BaseModel):
    partner_id: int
    partner_name: str
    games: int
    wins: int
    point_diff: int
    avg_diff: float
    win_rate: float


class PlayerStatsOut(BaseModel):
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
    partner_stats: list[PartnerStatOut] = []


class MatchPlayerStatOut(BaseModel):
    id: int
    match_id: int
    player_id: int
    side: str
    partner_id: int
    score_for: int
    score_against: int
    won: bool
    elo_before: float
    elo_after: float

    model_config = {"from_attributes": True}


class PartnerRecordOut(BaseModel):
    id: int
    tournament_id: int
    player1_id: int
    player2_id: int
    player1_name: str = ""
    player2_name: str = ""
    games_together: int
    wins_together: int
    point_diff_together: int
