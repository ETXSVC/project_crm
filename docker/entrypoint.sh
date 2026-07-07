#!/bin/sh
set -e

. /app/docker/wait-for-it.sh

MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL:-postgresql://proj:proj@postgres:5432/projtest}"

echo "Generating Prisma client..."
pnpm prisma generate

echo "Running database migrations..."
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm prisma migrate deploy

echo "Seeding database if needed..."
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm db:seed || true

# Mirror host port inside the container so E2E can use NEXTAUTH_URL (localhost:3001).
if command -v socat >/dev/null 2>&1; then
  socat TCP-LISTEN:3001,fork,reuseaddr TCP:127.0.0.1:3000 &
fi

echo "Starting application..."
exec "$@"
