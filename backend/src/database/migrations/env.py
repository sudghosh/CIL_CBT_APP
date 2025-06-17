# /app/src/database/migrations/env.py

from logging.config import fileConfig
import asyncio
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncEngine

import os
import sys
# Dynamically set sys.path so 'src' is importable regardless of working directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

# Ensure the project root is in sys.path for module imports
# The project root is typically '/app' inside the Docker container.
sys.path.insert(0, '/app')

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata

# IMPORTANT: Ensure your Base and all your models are correctly imported here.
# The paths below assume your project structure. Adjust if necessary.

# Assuming your Base object is defined in src/database/database.py
from src.database.database import Base

# NEW: Import all your model classes directly from the src.database.models module
# This is correct because all models are now in src/database/models.py (a single file).
from src.database.models import (
    User,
    AllowedEmail,
    Paper,
    Section,
    Subsection,
    Question,
    QuestionOption,
    TestAttempt,
    TestAnswer,
    UserPerformanceProfile,
    UserOverallSummary,
    UserTopicSummary,
)

# All your SQLAlchemy models' metadata are collected here for Alembic to inspect
target_metadata = Base.metadata


# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Configures the context and runs migrations for online mode."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,  # Recommended for better type comparison in autogenerate
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    In this scenario we need to create an AsyncEngine
    and associate an async connection with the context.
    """
    # Get the database URL from Alembic's config (alembic.ini)
    connectable = AsyncEngine(
        engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            # Ensure the URL is passed, even if it's already in the config section
            url=config.get_main_option("sqlalchemy.url")
        )
    )

    async with connectable.connect() as connection:
        # Pass the async connection to the synchronous do_run_migrations
        # using connection.run_sync, which handles the async bridge.
        await connection.run_sync(do_run_migrations)


if context.is_offline_mode():
    run_migrations_offline()
else:
    # This is the entry point for online migrations.
    # It runs the async run_migrations_online function.
    asyncio.run(run_migrations_online())