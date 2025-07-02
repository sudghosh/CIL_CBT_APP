"""
Fix APIKeyType enum case consistency
Revision ID: fix_a4f_case_consistency
Revises: 20250701_add_a4f_api_key_type
Create Date: 2025-07-01 23:15:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'fix_a4f_case_consistency'
down_revision = '20250701_add_a4f_api_key_type'
branch_labels = None
depends_on = None

def upgrade():
    """Update APIKeyType enum to have consistent case"""
    
    # First, drop the existing enum constraint if it exists
    op.execute("ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_key_type_check;")
    
    # Drop the existing enum type
    op.execute("DROP TYPE IF EXISTS apikeytype CASCADE;")
    
    # Create the new enum type with consistent values
    op.execute("CREATE TYPE apikeytype AS ENUM ('google', 'openrouter', 'a4f');")
    
    # Recreate the column with the new enum type
    op.execute("ALTER TABLE api_keys ALTER COLUMN key_type TYPE apikeytype USING key_type::text::apikeytype;")

def downgrade():
    """Revert to original enum values"""
    
    # Drop the constraint if it exists
    op.execute("ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_key_type_check;")
    
    # Drop the current enum type
    op.execute("DROP TYPE IF EXISTS apikeytype CASCADE;")
    
    # Recreate the original enum type (mixed case)
    op.execute("CREATE TYPE apikeytype AS ENUM ('GOOGLE', 'OPENROUTER');")
    
    # Recreate the column
    op.execute("ALTER TABLE api_keys ALTER COLUMN key_type TYPE apikeytype USING key_type::text::apikeytype;")
