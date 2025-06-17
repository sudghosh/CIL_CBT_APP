"""Add adaptive test and performance tracking

Revision ID: 3f82c5a198e4
Revises: fdf3a791130f
Create Date: 2025-06-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f82c5a198e4'
down_revision: Union[str, None] = 'fdf3a791130f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add difficulty_level to Question
    op.add_column('questions', sa.Column('difficulty_level', sa.String(length=20), nullable=False, server_default='Medium'))
    
    # Add adaptive strategy and current question index to TestAttempt
    op.add_column('test_attempts', sa.Column('adaptive_strategy_chosen', sa.String(length=50), nullable=True))
    op.add_column('test_attempts', sa.Column('current_question_index', sa.Integer(), nullable=False, server_default='0'))
    
    # Create UserPerformanceProfile table
    op.create_table(
        'user_performance_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('test_attempt_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=True),
        sa.Column('subtopic', sa.String(length=255), nullable=True),
        sa.Column('difficulty_level', sa.String(length=20), nullable=False),
        sa.Column('correct', sa.Boolean(), nullable=False),
        sa.Column('response_time_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['question_id'], ['questions.id'], ),
        sa.ForeignKeyConstraint(['test_attempt_id'], ['test_attempts.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create UserOverallSummary table
    op.create_table(
        'user_overall_summaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('total_tests_taken', sa.Integer(), nullable=False),
        sa.Column('total_questions_attempted', sa.Integer(), nullable=False),
        sa.Column('total_correct_answers', sa.Integer(), nullable=False),
        sa.Column('avg_score_percentage', sa.Float(), nullable=False),
        sa.Column('avg_response_time_seconds', sa.Float(), nullable=True),
        sa.Column('easy_questions_accuracy', sa.Float(), nullable=True),
        sa.Column('medium_questions_accuracy', sa.Float(), nullable=True),
        sa.Column('hard_questions_accuracy', sa.Float(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create UserTopicSummary table
    op.create_table(
        'user_topic_summaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=False),
        sa.Column('total_questions', sa.Integer(), nullable=False),
        sa.Column('correct_answers', sa.Integer(), nullable=False),
        sa.Column('accuracy_percentage', sa.Float(), nullable=False),
        sa.Column('avg_response_time_seconds', sa.Float(), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'topic', name='uix_user_topic')
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables
    op.drop_table('user_topic_summaries')
    op.drop_table('user_overall_summaries')
    op.drop_table('user_performance_profiles')
    
    # Remove columns from TestAttempt
    op.drop_column('test_attempts', 'current_question_index')
    op.drop_column('test_attempts', 'adaptive_strategy_chosen')
    
    # Remove column from Question
    op.drop_column('questions', 'difficulty_level')
