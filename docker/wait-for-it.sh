#!/bin/sh
set -e

host="${POSTGRES_HOST:-postgres}"
port="${POSTGRES_PORT:-5432}"
timeout=60

echo "Waiting for PostgreSQL at $host:$port..."
for i in $(seq 1 $timeout); do
  if nc -z "$host" "$port" 2>/dev/null; then
    echo "PostgreSQL is ready!"
    break
  fi
  if [ "$i" -eq "$timeout" ]; then
    echo "Timeout waiting for PostgreSQL"
    exit 1
  fi
  sleep 1
done
