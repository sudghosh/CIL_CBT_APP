"""
Run this script to create a new database migration and apply it.
This helps update the database schema to match the SQLAlchemy models.
"""
import os
import subprocess
import sys

def run_migration():
    """Generate and run database migrations."""
    try:
        # Check if alembic is installed
        print("Checking alembic installation...")
        check_result = subprocess.run([sys.executable, "-m", "pip", "show", "alembic"], 
                                      capture_output=True, text=True)
        
        if "Name: alembic" not in check_result.stdout:
            print("Alembic is not installed. Installing alembic...")
            subprocess.run([sys.executable, "-m", "pip", "install", "alembic"],
                           check=True)
        
        # Change directory to database folder if needed
        db_dir = os.path.join(os.path.dirname(__file__), 'src', 'database')
        if os.path.exists(db_dir):
            os.chdir(db_dir)
            print(f"Changed directory to {db_dir}")
        else:
            print(f"Database directory {db_dir} not found, continuing in current directory")
            
        # Generate migration script
        print("Generating migration script...")
        subprocess.run(["alembic", "revision", "--autogenerate", "-m", "Fix cascade delete for paper sections and questions"],
                       check=True)
        
        # Apply migration
        print("Applying migration...")
        subprocess.run(["alembic", "upgrade", "head"],
                      check=True)
        
        print("Migration completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"Error running migration command: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
