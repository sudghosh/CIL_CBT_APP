"""Add user question difficulty model

Revision ID: 20250621010000
Revises: d3a82f01bc47
Create Date: 2025-06-21 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250621010000'
down_revision = 'd3a82f01bc47'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_question_difficulty table
    op.create_table(
        'user_question_difficulty',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('numeric_difficulty', sa.Float(), nullable=False, server_default='5.0'),
        sa.Column('difficulty_level', sa.String(), nullable=False, server_default='Medium'),
        sa.Column('confidence', sa.Float(), nullable=True),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('correct_answers', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('avg_time_seconds', sa.Float(), nullable=True),
        sa.Column('is_calibrating', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'question_id', name='uq_user_question')
    )
    
    # Create index on user_id and question_id for faster lookups
    op.create_index(
        'ix_user_question_difficulty_user_question', 
        'user_question_difficulty', 
        ['user_id', 'question_id'], 
        unique=False
    )

    # Ensure numeric_difficulty exists in the questions table (in case it was missed)
    # First check if numeric_difficulty column exists
    connection = op.get_bind()
    insp = sa.inspect(connection)
    columns = insp.get_columns('questions')
    has_numeric_difficulty = any(col['name'] == 'numeric_difficulty' for col in columns)
    
    if not has_numeric_difficulty:
        # Add numeric_difficulty column to questions table
        op.add_column('questions', sa.Column('numeric_difficulty', sa.Float(), nullable=True))
        
        # Update existing records to set numeric_difficulty based on difficulty_level
        op.execute("""
            UPDATE questions 
            SET numeric_difficulty = CASE 
                WHEN difficulty_level = 'Easy' THEN 3.0
                WHEN difficulty_level = 'Medium' THEN 5.0
                WHEN difficulty_level = 'Hard' THEN 7.0
                ELSE 5.0
            END
        """)
        
        # Now make it not nullable
        op.alter_column('questions', 'numeric_difficulty', nullable=False, server_default='5.0')


def downgrade() -> None:
    # Drop user_question_difficulty table
    op.drop_table('user_question_difficulty')
    
    # We don't remove numeric_difficulty from questions table as it might be used elsewhere
    # and this wasn't added by this migration specifically
