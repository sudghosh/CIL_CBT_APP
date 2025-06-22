#!/usr/bin/env python
"""
Script to apply database migrations for the Question Bank application.
This script should be run after making database model changes.
"""

import os
import sys
import subprocess
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """
    Run database migrations using Alembic.
    """
    logger.info("Starting database migration process")
    
    try:
        # Change to the backend directory
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        os.chdir(backend_dir)
        logger.info(f"Changed directory to: {backend_dir}")
        
        # First, generate a migration automatically based on model changes
        logger.info("Generating migration script...")
        result = subprocess.run(
            ["alembic", "revision", "--autogenerate", "-m", "Add numeric difficulty to Question"],
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(f"Migration script generated:\n{result.stdout}")
        
        # Then apply the migration
        logger.info("Applying migration...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(f"Migration applied successfully:\n{result.stdout}")
        
        logger.info("Database migration complete")
        return 0
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Error during migration: {e}")
        logger.error(f"Command output: {e.stdout}")
        logger.error(f"Command error: {e.stderr}")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
