from datetime import datetime
from pydantic import BaseModel


class AdminLoginRequest(BaseModel):
    password: str


class AdminLoginResponse(BaseModel):
    token: str


class TournamentListItem(BaseModel):
    id: int
    name: str
    slug: str
    status: str
    player_count: int
    round_count: int
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class ServerStatus(BaseModel):
    db_ok: bool
    tournaments_count: int
    players_count: int
    uptime_seconds: float
