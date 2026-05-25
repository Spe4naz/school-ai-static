#!/bin/sh
# wait-for-db.sh — waits for PostgreSQL to be ready, then runs CMD
set -e

host="${DB_HOST:-db}"
port="${DB_PORT:-5432}"
user="${DB_USER:-school}"

echo "Waiting for PostgreSQL at $host:$port..."
while ! pg_isready -h "$host" -p "$port" -U "$user" -q 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

exec "$@"
