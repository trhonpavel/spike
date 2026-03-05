"""add match_player_stats and partner_records tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'match_player_stats',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('match_id', sa.Integer(), sa.ForeignKey('matches.id'), nullable=False),
        sa.Column('player_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        sa.Column('side', sa.String(10), nullable=False),
        sa.Column('partner_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        sa.Column('score_for', sa.Integer(), nullable=False),
        sa.Column('score_against', sa.Integer(), nullable=False),
        sa.Column('won', sa.Boolean(), nullable=False),
        sa.Column('elo_before', sa.Float(), nullable=False),
        sa.Column('elo_after', sa.Float(), nullable=False),
    )

    op.create_table(
        'partner_records',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('tournament_id', sa.Integer(), sa.ForeignKey('tournaments.id'), nullable=False),
        sa.Column('player1_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        sa.Column('player2_id', sa.Integer(), sa.ForeignKey('players.id'), nullable=False),
        sa.Column('games_together', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('wins_together', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('point_diff_together', sa.Integer(), nullable=False, server_default='0'),
        sa.UniqueConstraint('tournament_id', 'player1_id', 'player2_id', name='uq_partner_pair'),
    )


def downgrade() -> None:
    op.drop_table('partner_records')
    op.drop_table('match_player_stats')
