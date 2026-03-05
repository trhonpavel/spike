import uuid
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


class TournamentStatus(str, enum.Enum):
    active = "active"
    finished = "finished"


class RoundStatus(str, enum.Enum):
    drawn = "drawn"
    confirmed = "confirmed"
    finalized = "finalized"


class Tournament(Base):
    __tablename__ = "tournaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    admin_token: Mapped[str] = mapped_column(String(36), default=lambda: str(uuid.uuid4()))
    status: Mapped[TournamentStatus] = mapped_column(
        SAEnum(TournamentStatus), default=TournamentStatus.active
    )

    players: Mapped[list["Player"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")
    rounds: Mapped[list["Round"]] = relationship(back_populates="tournament", cascade="all, delete-orphan")


class Player(Base):
    __tablename__ = "players"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id"))
    name: Mapped[str] = mapped_column(String(100))
    wins: Mapped[int] = mapped_column(Integer, default=0)
    balls_won: Mapped[int] = mapped_column(Integer, default=0)
    balls_total: Mapped[int] = mapped_column(Integer, default=0)
    waitings: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    elo_rating: Mapped[float] = mapped_column(Float, default=1500.0)
    point_differential: Mapped[int] = mapped_column(Integer, default=0)
    games_played: Mapped[int] = mapped_column(Integer, default=0)
    losses: Mapped[int] = mapped_column(Integer, default=0)

    tournament: Mapped["Tournament"] = relationship(back_populates="players")


class Round(Base):
    __tablename__ = "rounds"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id"))
    round_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[RoundStatus] = mapped_column(
        SAEnum(RoundStatus), default=RoundStatus.drawn
    )

    tournament: Mapped["Tournament"] = relationship(back_populates="rounds")
    groups: Mapped[list["Group"]] = relationship(back_populates="round", cascade="all, delete-orphan")
    waitings: Mapped[list["RoundWaiting"]] = relationship(back_populates="round", cascade="all, delete-orphan")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("rounds.id"))
    group_index: Mapped[int] = mapped_column(Integer)
    player1_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    player2_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    player3_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    player4_id: Mapped[int] = mapped_column(ForeignKey("players.id"))

    round: Mapped["Round"] = relationship(back_populates="groups")
    matches: Mapped[list["Match"]] = relationship(back_populates="group", cascade="all, delete-orphan")

    player1: Mapped["Player"] = relationship(foreign_keys=[player1_id])
    player2: Mapped["Player"] = relationship(foreign_keys=[player2_id])
    player3: Mapped["Player"] = relationship(foreign_keys=[player3_id])
    player4: Mapped["Player"] = relationship(foreign_keys=[player4_id])


# match_index 0: (p1,p2) vs (p3,p4)
# match_index 1: (p1,p3) vs (p2,p4)
# match_index 2: (p1,p4) vs (p2,p3)
class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id"))
    match_index: Mapped[int] = mapped_column(Integer)  # 0, 1, 2
    team1_p1_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    team1_p2_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    team2_p1_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    team2_p2_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    score_team1: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score_team2: Mapped[int | None] = mapped_column(Integer, nullable=True)

    group: Mapped["Group"] = relationship(back_populates="matches")


class RoundWaiting(Base):
    __tablename__ = "round_waitings"

    id: Mapped[int] = mapped_column(primary_key=True)
    round_id: Mapped[int] = mapped_column(ForeignKey("rounds.id"))
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))

    round: Mapped["Round"] = relationship(back_populates="waitings")
    player: Mapped["Player"] = relationship()


class MatchPlayerStat(Base):
    """Per-player per-match record for Elo history and detailed stats."""
    __tablename__ = "match_player_stats"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id"))
    player_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    side: Mapped[str] = mapped_column(String(10))  # "team1" or "team2"
    partner_id: Mapped[int] = mapped_column(ForeignKey("players.id"))
    score_for: Mapped[int] = mapped_column(Integer)
    score_against: Mapped[int] = mapped_column(Integer)
    won: Mapped[bool] = mapped_column(Boolean)
    elo_before: Mapped[float] = mapped_column(Float)
    elo_after: Mapped[float] = mapped_column(Float)

    match: Mapped["Match"] = relationship(foreign_keys=[match_id])
    player: Mapped["Player"] = relationship(foreign_keys=[player_id])
    partner: Mapped["Player"] = relationship(foreign_keys=[partner_id])


class PartnerRecord(Base):
    """Denormalized partner synergy record for fast queries."""
    __tablename__ = "partner_records"
    __table_args__ = (
        UniqueConstraint("tournament_id", "player1_id", "player2_id", name="uq_partner_pair"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournaments.id"))
    player1_id: Mapped[int] = mapped_column(ForeignKey("players.id"))  # always min(p1, p2)
    player2_id: Mapped[int] = mapped_column(ForeignKey("players.id"))  # always max(p1, p2)
    games_together: Mapped[int] = mapped_column(Integer, default=0)
    wins_together: Mapped[int] = mapped_column(Integer, default=0)
    point_diff_together: Mapped[int] = mapped_column(Integer, default=0)

    player1: Mapped["Player"] = relationship(foreign_keys=[player1_id])
    player2: Mapped["Player"] = relationship(foreign_keys=[player2_id])
