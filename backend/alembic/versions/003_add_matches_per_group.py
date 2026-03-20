"""add matches_per_group to tournaments

Revision ID: 003
Revises: 002
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
    cols = {col['name'] for col in sa_inspect(op.get_bind()).get_columns('tournaments')}
    if 'matches_per_group' not in cols:
        op.add_column(
            'tournaments',
            sa.Column('matches_per_group', sa.Integer(), nullable=False, server_default='3'),
        )


def downgrade() -> None:
    op.drop_column('tournaments', 'matches_per_group')
