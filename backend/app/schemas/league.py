from datetime import date
from pydantic import BaseModel, Field


class LeagueCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class LeaguePlayerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class LeaguePlayerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    active: bool | None = None


class LeaguePlayerOut(BaseModel):
    id: int
    name: str
    elo_rating: float
    total_wins: int
    total_losses: int
    total_games: int
    total_balls_won: int
    total_balls_total: int
    total_point_differential: int
    sessions_attended: int
    active: bool

    model_config = {"from_attributes": True}


class LeagueSessionCreate(BaseModel):
    session_date: date | None = None
    attending_player_ids: list[int]


class LeagueSessionOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    session_date: date | None
    player_count: int


class LeagueOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    admin_token: str | None = None

    model_config = {"from_attributes": True}


class LeagueDetailOut(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    player_count: int
    sessions: list[LeagueSessionOut]
    players: list[LeaguePlayerOut]
