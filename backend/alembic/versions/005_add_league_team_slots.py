"""add league_team_slots

Revision ID: 005
Revises: 004
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'league_team_slots',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('league_id', sa.Integer(), sa.ForeignKey('leagues.id', ondelete='CASCADE'), nullable=False),
        sa.Column('slot_index', sa.Integer(), nullable=False),
        sa.Column('player1_id', sa.Integer(), sa.ForeignKey('league_players.id', ondelete='SET NULL'), nullable=True),
        sa.Column('player2_id', sa.Integer(), sa.ForeignKey('league_players.id', ondelete='SET NULL'), nullable=True),
        sa.UniqueConstraint('league_id', 'slot_index', name='uq_league_team_slot'),
    )


def downgrade() -> None:
    op.drop_table('league_team_slots')
