"""
Helper script for running database migrations inside a container.
This script handles:
1. Installing alembic if needed
2. Finding the correct directory for migrations
3. Running the migration commands
"""
import os
import subprocess
import sys

def install_package(package_name):
    """Install a Python package."""
    print(f"Installing {package_name}...")
    subprocess.run([sys.executable, "-m", "pip", "install", package_name], check=True)

def run_command(command, description=None):
    """Run a shell command and handle errors."""
    if description:
        print(f"{description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Command failed with exit code {result.returncode}")
            print(f"Error output: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Error running command: {e}")
        return False

def run_migration():
    """Find the correct directory and run migrations."""
    try:
        # Install alembic if not already installed
        try:
            import alembic
            print("Alembic is already installed.")
        except ImportError:
            install_package("alembic")
        
        # Determine the correct directory structure
        possible_paths = [
            os.path.join(os.getcwd(), 'src', 'database'),
            os.path.join(os.getcwd(), 'database'),
            os.path.join('/app', 'src', 'database'),
            os.path.join('/app', 'database'),
        ]
        
        alembic_path = None
        for path in possible_paths:
            if os.path.exists(os.path.join(path, 'alembic.ini')):
                alembic_path = path
                break
        
        if alembic_path is None:
            # Try to find alembic.ini anywhere
            for root, dirs, files in os.walk('/app'):
                if 'alembic.ini' in files:
                    alembic_path = root
                    break
        
        if alembic_path is None:
            # Create a basic alembic setup in the database directory
            print("No alembic configuration found. Creating one.")
            database_dir = os.path.join('/app', 'src', 'database')
            if not os.path.exists(database_dir):
                database_dir = '/app'
            
            os.chdir(database_dir)
            run_command("alembic init migrations", "Initializing alembic")
            
            # Update the alembic.ini file to point to the correct SQLAlchemy URL
            with open(os.path.join(database_dir, 'alembic.ini'), 'r') as f:
                config = f.read()
            
            config = config.replace('sqlalchemy.url = driver://user:pass@localhost/dbname',
                                  'sqlalchemy.url = postgresql://cildb:password@postgres:5432/cil_cbt_db')
            
            with open(os.path.join(database_dir, 'alembic.ini'), 'w') as f:
                f.write(config)
            
            # Update env.py to import our models
            env_path = os.path.join(database_dir, 'migrations', 'env.py')
            with open(env_path, 'r') as f:
                env_content = f.read()
            
            import_line = "from database.models import Base\ntarget_metadata = Base.metadata"
            env_content = env_content.replace('target_metadata = None', import_line)
            
            with open(env_path, 'w') as f:
                f.write(env_content)
            
            alembic_path = database_dir
        
        # Change to the directory with alembic.ini
        print(f"Using alembic configuration in {alembic_path}")
        os.chdir(alembic_path)
        
        # Run alembic commands
        if not run_command("alembic revision --autogenerate -m \"Fix cascade delete for paper sections and questions\"", "Generating migration"):
            sys.exit(1)
            
        if not run_command("alembic upgrade head", "Applying migration"):
            sys.exit(1)
            
        print("Migration completed successfully.")
    
    except Exception as e:
        print(f"Error during migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
