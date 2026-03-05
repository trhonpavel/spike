"""add elo and stats columns to players

Revision ID: 001
Revises:
Create Date: 2026-03-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('players', sa.Column('elo_rating', sa.Float(), nullable=False, server_default='1500.0'))
    op.add_column('players', sa.Column('point_differential', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('players', sa.Column('games_played', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('players', sa.Column('losses', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('players', 'losses')
    op.drop_column('players', 'games_played')
    op.drop_column('players', 'point_differential')
    op.drop_column('players', 'elo_rating')
