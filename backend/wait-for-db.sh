#!/bin/sh
# Usage: ./wait-for-db.sh [host] [port]
# Reads DB_HOST and DB_PORT from args or environment variables.
set -e
host="${1:-${DB_HOST:-postgres}}"
port="${2:-${DB_PORT:-5432}}"
shift 2
cmd="$@"
until pg_isready -h "$host" -p "$port"; do
  echo "Waiting for PostgreSQL at $host:$port..."
  sleep 2
done
echo "Postgres is up - executing command"
exec $cmd
