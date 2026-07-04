#!/bin/sh
set -e

. /app/docker/wait-for-it.sh

echo "Generating Prisma client..."
pnpm prisma generate

echo "Running database migrations..."
pnpm prisma migrate deploy

echo "Seeding database if needed..."
pnpm db:seed || true

echo "Starting application..."
exec "$@"
