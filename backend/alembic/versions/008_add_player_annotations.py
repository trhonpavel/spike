"""Add locked/tentative/note to league_players

Revision ID: 008
Revises: 007
Create Date: 2026-04-09
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('league_players', sa.Column('locked', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('league_players', sa.Column('tentative', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('league_players', sa.Column('note', sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column('league_players', 'note')
    op.drop_column('league_players', 'tentative')
    op.drop_column('league_players', 'locked')
