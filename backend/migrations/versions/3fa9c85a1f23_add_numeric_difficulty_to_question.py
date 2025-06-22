"""Add numeric_difficulty to Question

Revision ID: 3fa9c85a1f23
Revises: 
Create Date: 2025-06-19

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3fa9c85a1f23'
down_revision = None  # This should be updated with the actual previous migration ID
branch_labels = None
depends_on = None


def upgrade():
    # Add numeric_difficulty column to questions table
    op.add_column('questions', sa.Column('numeric_difficulty', sa.Integer(), nullable=False, server_default='5'))
    
    # Update existing records to set numeric_difficulty based on difficulty_level
    op.execute("""
        UPDATE questions 
        SET numeric_difficulty = CASE 
            WHEN difficulty_level = 'Easy' THEN 2
            WHEN difficulty_level = 'Medium' THEN 5
            WHEN difficulty_level = 'Hard' THEN 8
            ELSE 5
        END
    """)


def downgrade():
    # Drop numeric_difficulty column from questions table
    op.drop_column('questions', 'numeric_difficulty')
