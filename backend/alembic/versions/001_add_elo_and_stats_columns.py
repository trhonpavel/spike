"""add elo and stats columns to players

Revision ID: 001
Revises:
Create Date: 2026-03-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision: str = '001'
down_revision: Union[str, None] = '000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Migration 000 may have already added these columns for legacy DBs; skip if present
    existing_cols = {col['name'] for col in sa_inspect(op.get_bind()).get_columns('players')}
    for col_name, col_def in [
        ('elo_rating', sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0')),
        ('point_differential', sa.Column('point_differential', sa.Integer(), nullable=False, server_default='0')),
        ('games_played', sa.Column('games_played', sa.Integer(), nullable=False, server_default='0')),
        ('losses', sa.Column('losses', sa.Integer(), nullable=False, server_default='0')),
    ]:
        if col_name not in existing_cols:
            op.add_column('players', col_def)


def downgrade() -> None:
    op.drop_column('players', 'losses')
    op.drop_column('players', 'games_played')
    op.drop_column('players', 'point_differential')
    op.drop_column('players', 'elo_rating')
