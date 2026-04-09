"""add annotations to league_team_slots

Revision ID: 007
Revises: 006
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('league_team_slots', sa.Column('locked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('league_team_slots', sa.Column('tentative', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('league_team_slots', sa.Column('note', sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column('league_team_slots', 'note')
    op.drop_column('league_team_slots', 'tentative')
    op.drop_column('league_team_slots', 'locked')
