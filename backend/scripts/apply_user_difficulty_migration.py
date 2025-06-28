#!/usr/bin/env python
"""
Script to apply database migrations for the user-specific difficulty feature in a Docker environment.
This script creates the migration file and applies it to the database.
"""

import os
import sys
import logging
from alembic import command
from alembic.config import Config
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_migration():
    """Create a new migration for the user-specific difficulty feature."""
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Navigate to the backend directory
        backend_dir = os.path.abspath(os.path.join(script_dir, '..'))
        os.chdir(backend_dir)
        
        # Get the alembic.ini configuration
        alembic_cfg = Config(os.path.join(backend_dir, 'alembic.ini'))
        
        # Create a migration with a timestamp-based version ID
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        migration_message = "Add user question difficulty model"
        
        # Create a new migration
        logger.info(f"Creating migration for user-specific difficulty: {migration_message}...")
        command.revision(alembic_cfg, 
                        message=migration_message, 
                        autogenerate=True)
        
        logger.info("Migration file created successfully")
        return True
    except Exception as e:
        logger.error(f"Error creating migration: {e}")
        return False

def apply_migration():
    """Apply the latest migration to the database."""
    try:
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Navigate to the backend directory
        backend_dir = os.path.abspath(os.path.join(script_dir, '..'))
        os.chdir(backend_dir)
        
        # Get the alembic.ini configuration
        alembic_cfg = Config(os.path.join(backend_dir, 'alembic.ini'))
        
        # Apply the migration
        logger.info("Applying migration...")
        command.upgrade(alembic_cfg, "head")
        
        logger.info("Migration applied successfully")
        return True
    except Exception as e:
        logger.error(f"Error applying migration: {e}")
        return False

def main():
    """Main entry point for the script."""
    if create_migration():
        if apply_migration():
            logger.info("Migration process completed successfully")
            return 0
    
    logger.error("Migration process failed")
    return 1

if __name__ == "__main__":
    sys.exit(main())
