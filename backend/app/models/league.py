import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class League(Base):
    __tablename__ = "leagues"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    admin_token: Mapped[str] = mapped_column(String(36), default=lambda: str(uuid.uuid4()))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class LeaguePlayer(Base):
    __tablename__ = "league_players"

    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"))
    name: Mapped[str] = mapped_column(String(100))
    elo_rating: Mapped[float] = mapped_column(Float, default=1500.0)
    total_wins: Mapped[int] = mapped_column(Integer, default=0)
    total_losses: Mapped[int] = mapped_column(Integer, default=0)
    total_games: Mapped[int] = mapped_column(Integer, default=0)
    total_balls_won: Mapped[int] = mapped_column(Integer, default=0)
    total_balls_total: Mapped[int] = mapped_column(Integer, default=0)
    total_point_differential: Mapped[int] = mapped_column(Integer, default=0)
    sessions_attended: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class LeagueTeamSlot(Base):
    __tablename__ = "league_team_slots"
    __table_args__ = (UniqueConstraint("league_id", "slot_index", name="uq_league_team_slot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"))
    slot_index: Mapped[int] = mapped_column(Integer)
    player1_id: Mapped[int | None] = mapped_column(ForeignKey("league_players.id", ondelete="SET NULL"), nullable=True)
    player2_id: Mapped[int | None] = mapped_column(ForeignKey("league_players.id", ondelete="SET NULL"), nullable=True)
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    tentative: Mapped[bool] = mapped_column(Boolean, default=False)
    note: Mapped[str | None] = mapped_column(String(300), nullable=True)
