"""add active flag to players

Revision ID: 005
Revises: 004
Create Date: 2026-03-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cols = {col['name'] for col in sa_inspect(op.get_bind()).get_columns('players')}
    if 'active' not in cols:
        op.add_column(
            'players',
            sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        )


def downgrade() -> None:
    op.drop_column('players', 'active')
