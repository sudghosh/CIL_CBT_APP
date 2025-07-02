"""
Add API key management models

Revision ID: api_key_management
Revises: 
Create Date: 2025-06-30
"""
from alembic import op
import sqlalchemy as sa
import enum

# revision identifiers, used by Alembic.
revision = 'api_key_management'
down_revision = None
branch_labels = None
depends_on = None

class APIKeyType(enum.Enum):
    GOOGLE = "google"
    OPENROUTER = "openrouter"


def upgrade():
    op.create_table(
        'api_keys',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('key_type', sa.Enum(APIKeyType), nullable=False),
        sa.Column('encrypted_key', sa.LargeBinary(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('created_by_admin_id', sa.Integer(), sa.ForeignKey('users.user_id'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.UniqueConstraint('key_type', name='uq_api_key_type'),
    )

def downgrade():
    op.drop_table('api_keys')
