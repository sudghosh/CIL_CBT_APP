"""Add A4F API key type

Revision ID: 20250701_add_a4f_api_key_type
Revises: 20250630_api_key_management
Create Date: 2025-07-01 15:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
import enum

# revision identifiers, used by Alembic.
revision = '20250701_add_a4f_api_key_type'
down_revision = '20250630_api_key_management'
branch_labels = None
depends_on = None

class APIKeyType(enum.Enum):
    GOOGLE = "google"
    OPENROUTER = "openrouter"
    A4F = "a4f"

def upgrade():
    """Add A4F to the APIKeyType enum"""
    # For PostgreSQL, we need to alter the enum type
    op.execute("ALTER TYPE apikeytype ADD VALUE 'a4f'")

def downgrade():
    """Remove A4F from the APIKeyType enum"""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type and updating the table
    # For simplicity, we'll leave the enum value in place during downgrade
    # In production, you might want to implement a more complex downgrade
    pass
