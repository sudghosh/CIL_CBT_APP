#!/bin/sh

# wait-for-db.sh
set -e
HOST="${DB_HOST}"
PORT="${DB_PORT:-5432}"
USER="${POSTGRES_USER:-cildb}"

if [ -z "$HOST" ]; then
  echo "Error: DB_HOST environment variable not set. Exiting wait-for-db.sh."
  exit 1
fi

echo "Waiting for PostgreSQL at $HOST:$PORT as user $USER..."

until pg_isready -h "$HOST" -p "$PORT" -U "$USER"; do
  echo "PostgreSQL at $HOST:$PORT is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is up - executing command"
exec "$@"
