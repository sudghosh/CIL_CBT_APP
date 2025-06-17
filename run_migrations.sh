#!/bin/bash
# run_migrations.sh
# Script to apply database migrations using Alembic

echo "Running database migrations..."
cd /app/src/database
alembic upgrade head
echo "Migrations complete!"
