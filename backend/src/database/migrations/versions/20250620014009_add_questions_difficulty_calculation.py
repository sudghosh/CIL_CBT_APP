"""Add questions difficulty calculation

Revision ID: $(python -c "import uuid; print(uuid.uuid4().hex[:12])")
Revises: 3f82c5a198e4
Create Date: $(date -u "+%Y-%m-%d %H:%M:%S.000000")

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '$(python -c "import uuid; print(uuid.uuid4().hex[:12])")'
down_revision = '3f82c5a198e4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add questions difficulty calculation."""
    # Add numeric difficulty column to questions table
    op.add_column('questions', sa.Column('numeric_difficulty', sa.Float(), nullable=True))
    
    # Add average_completion_time column to track question difficulty metrics
    op.add_column('questions', sa.Column('average_completion_time', sa.Float(), nullable=True))
    
    # Add success_rate column to track question difficulty metrics
    op.add_column('questions', sa.Column('success_rate', sa.Float(), nullable=True))
    
    # Add default_difficulty_level column with string values (Easy, Medium, Hard)
    op.add_column('questions', sa.Column('default_difficulty_level', sa.String(length=20), nullable=True))
    
    # Add last_calculated column to track when difficulty was last updated
    op.add_column('questions', sa.Column('difficulty_last_calculated', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove all added columns
    op.drop_column('questions', 'difficulty_last_calculated')
    op.drop_column('questions', 'default_difficulty_level')
    op.drop_column('questions', 'success_rate')
    op.drop_column('questions', 'average_completion_time')
    op.drop_column('questions', 'numeric_difficulty')
