"""Add difficulty metrics to questions

Revision ID: d3a82f01bc47
Revises: 3f82c5a198e4
Create Date: 2025-06-20 01:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd3a82f01bc47'
down_revision = '3f82c5a198e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add numeric difficulty column (0-10 scale) for more granular difficulty measurement
    op.add_column('questions', sa.Column('numeric_difficulty', sa.Float(), nullable=True))
    
    # Add average_completion_time column to track question difficulty metrics
    op.add_column('questions', sa.Column('average_completion_time', sa.Float(), nullable=True))
    
    # Add success_rate column to track question difficulty metrics (percentage of correct answers)
    op.add_column('questions', sa.Column('success_rate', sa.Float(), nullable=True))
    
    # Add difficulty_last_calculated column to track when difficulty was last updated
    op.add_column('questions', sa.Column('difficulty_last_calculated', sa.DateTime(), nullable=True))

def downgrade() -> None:
    # Remove all added columns
    op.drop_column('questions', 'difficulty_last_calculated')
    op.drop_column('questions', 'success_rate')
    op.drop_column('questions', 'average_completion_time')
    op.drop_column('questions', 'numeric_difficulty')
