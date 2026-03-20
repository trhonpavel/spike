"""add league tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-20
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing = sa_inspect(op.get_bind()).get_table_names()

    if 'leagues' not in existing:
        op.create_table(
            'leagues',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('name', sa.String(200), nullable=False),
            sa.Column('slug', sa.String(100), nullable=False, unique=True),
            sa.Column('admin_token', sa.String(36), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='active'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        )

    if 'league_players' not in existing:
        op.create_table(
            'league_players',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('league_id', sa.Integer(), sa.ForeignKey('leagues.id'), nullable=False),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0'),
            sa.Column('total_wins', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_losses', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_games', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_balls_won', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_balls_total', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('total_point_differential', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('sessions_attended', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        )

    t_cols = {col['name'] for col in sa_inspect(op.get_bind()).get_columns('tournaments')}
    if 'league_id' not in t_cols:
        op.add_column('tournaments', sa.Column('league_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_tournaments_league_id', 'tournaments', 'leagues', ['league_id'], ['id']
        )
    if 'session_date' not in t_cols:
        op.add_column('tournaments', sa.Column('session_date', sa.Date(), nullable=True))

    p_cols = {col['name'] for col in sa_inspect(op.get_bind()).get_columns('players')}
    if 'league_player_id' not in p_cols:
        op.add_column('players', sa.Column('league_player_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_players_league_player_id', 'players', 'league_players', ['league_player_id'], ['id']
        )


def downgrade() -> None:
    op.drop_constraint('fk_players_league_player_id', 'players', type_='foreignkey')
    op.drop_column('players', 'league_player_id')
    op.drop_column('tournaments', 'session_date')
    op.drop_constraint('fk_tournaments_league_id', 'tournaments', type_='foreignkey')
    op.drop_column('tournaments', 'league_id')
    op.drop_table('league_players')
    op.drop_table('leagues')
