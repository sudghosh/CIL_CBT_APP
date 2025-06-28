#!/bin/bash
# Simple migration status check script

echo "=== MIGRATION STATUS CHECK ==="
echo "Current date: $(date)"
echo

echo "Checking database connection..."
docker exec cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT current_database(), current_user;"
echo

echo "Checking questions table for numeric_difficulty column..."
docker exec cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'questions' AND column_name = 'numeric_difficulty';"
echo

echo "Checking for user_question_difficulties table..."
docker exec cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT table_name FROM information_schema.tables WHERE table_name = 'user_question_difficulties';"
echo

echo "Checking alembic_version table..."
docker exec cil_hr_postgres psql -U cildb -d cil_cbt_db -c "SELECT version_num FROM alembic_version LIMIT 1;" 2>/dev/null || echo "alembic_version table not found"
echo

echo "=== CHECK COMPLETE ==="
