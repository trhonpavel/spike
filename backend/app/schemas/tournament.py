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

    model_config = {"from_attributes": True}


class PlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PlayerOut(BaseModel):
    id: int
    name: str
    wins: int
    balls_won: int
    balls_total: int
    waitings: int
    rating: float

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
