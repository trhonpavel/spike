"""initial schema — base tables

Revision ID: 000
Revises:
Create Date: 2026-03-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision: str = '000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table_name: str) -> set[str]:
    conn = op.get_bind()
    return {col['name'] for col in sa_inspect(conn).get_columns(table_name)}


def upgrade() -> None:
    conn = op.get_bind()
    existing = sa_inspect(conn).get_table_names()

    if 'tournaments' not in existing:
        op.create_table(
            'tournaments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('slug', sa.String(100), nullable=False, unique=True),
            sa.Column('admin_token', sa.String(36), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='active'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        )
    else:
        # Patch columns that may be missing on legacy DBs (previously added by _ensure_backward_compatible_schema)
        cols = _existing_columns('tournaments')
        if 'created_at' not in cols:
            op.add_column('tournaments', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))

    if 'players' not in existing:
        op.create_table(
            'players',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tournament_id', sa.Integer(), sa.ForeignKey('tournaments.id'), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('wins', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('balls_won', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('balls_total', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('waitings', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('rating', sa.Float(), nullable=False, server_default='0.0'),
            sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0'),
            sa.Column('point_differential', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('games_played', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('losses', sa.Integer(), nullable=False, server_default='0'),
        )
    else:
        # Patch columns that may be missing on legacy DBs
        cols = _existing_columns('players')
        for col_name, col_def in [
            ('elo_rating', sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0')),
            ('point_differential', sa.Column('point_differential', sa.Integer(), nullable=False, server_default='0')),
            ('games_played', sa.Column('games_played', sa.Integer(), nullable=False, server_default='0')),
            ('losses', sa.Column('losses', sa.Integer(), nullable=False, server_default='0')),
        ]:
            if col_name not in cols:
                op.add_column('players', col_def)

    if 'rounds' not in existing:
        op.create_table(
            'rounds',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('tournament_id', sa.Integer(), sa.ForeignKey('tournaments.id'), nullable=False),
            sa.Column('round_number', sa.Integer(), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='drawn'),
        )

    if 'groups' not in existing:
        op.create_table(
            'groups',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('round_id', sa.Integer(), sa.ForeignKey('rounds.id'), nullable=False),
            sa.Column('group_index', sa.Integer(), nullable=False),
            sa.Column('player1_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('player2_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('player3_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('player4_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        )

    if 'matches' not in existing:
        op.create_table(
            'matches',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('group_id', sa.Integer(), sa.ForeignKey('groups.id'), nullable=False),
            sa.Column('match_index', sa.Integer(), nullable=False),
            sa.Column('team1_p1_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('team1_p2_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('team2_p1_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('team2_p2_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
            sa.Column('score_team1', sa.Integer(), nullable=True),
            sa.Column('score_team2', sa.Integer(), nullable=True),
        )

    if 'round_waitings' not in existing:
        op.create_table(
            'round_waitings',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('round_id', sa.Integer(), sa.ForeignKey('rounds.id'), nullable=False),
            sa.Column('player_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        )


def downgrade() -> None:
    op.drop_table('round_waitings')
    op.drop_table('matches')
    op.drop_table('groups')
    op.drop_table('rounds')
    op.drop_table('players')
    op.drop_table('tournaments')
