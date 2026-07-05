# Multi-Tenant Project Management Platform

A Docker-based SaaS project management platform with CRM, Gantt charts, and a widget-based dashboard — built with Next.js 15, PostgreSQL, and Prisma.

## Features

- **Multi-tenancy** — Row-level tenant isolation with PostgreSQL RLS, Prisma tenant extension, and RBAC roles
- **Project Management** — WBS task hierarchy, dependencies, scheduling engine, critical path, baselines, resources
- **Gantt Chart** — Interactive drag-and-drop scheduling with zoom levels and critical path highlighting
- **CRM** — Accounts, contacts, leads, opportunities, pipeline kanban, activity logging
- **Dashboard** — Customizable widget grid with project health, CRM funnel, workload, and activity feed
- **Global Search** — Command palette (⌘K) across projects, accounts, contacts, and tasks

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose (Linux)

No local Node.js or PostgreSQL installation required.

## Quick Start

```bash
cp .env.example .env
docker compose --profile dev up --build
```

The entrypoint automatically runs migrations and seeds demo data on first launch.

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Application |
| http://localhost:8025 | Mailhog (email capture) |

**Demo credentials:** `demo@example.com` / `password`

## Makefile Commands

```bash
make up       # Start dev stack
make down     # Stop containers
make logs     # Tail app logs
make shell    # Shell into app container
make migrate  # Run Prisma migrations
make seed     # Seed database
docker compose --profile dev exec app pnpm test
docker compose --profile dev exec app ./node_modules/.bin/tsx scripts/run-e2e.ts
make prod     # Start production stack
```

## Architecture

```
app/          Next.js App Router (pages, API routes)
components/   UI components (shadcn, Gantt, CRM, dashboard)
lib/          Auth, DB, scheduling engine, server actions
prisma/       Database schema, migrations (PostgreSQL RLS), seed
docker/       Entrypoint and wait scripts
```

### Tenant isolation (RLS)

- Shared-schema multi-tenancy: tenant-owned rows include `tenantId`
- PostgreSQL Row Level Security (`20260704220000_enable_rls`) enforces isolation at the database
- App connects as `proj_app` (RLS enforced); migrations/seeds use `MIGRATION_DATABASE_URL`
- `getTenantDb()` sets `app.tenant_id` in `lib/db/tenant-context.ts` before tenant queries

### Docker Services

| Service | Purpose |
|---------|---------|
| `app` | Next.js application |
| `postgres` | PostgreSQL 16 database |
| `redis` | Redis cache for dashboard/CRM aggregates |
| `mailhog` | Email capture (dev) |

## Development

All commands run inside Docker:

```bash
docker compose --profile dev exec app pnpm db:migrate:dev
docker compose --profile dev exec app pnpm db:seed
docker compose --profile dev exec app pnpm test
```

### Phase gate (required before next phase)

Each implementation phase must pass **health + unit + E2E** before you start the next one.

```bash
# After finishing a phase (Docker stack up on port 3001):
pnpm phase:gate -- --phase=1

# Check progress:
pnpm phase:status
```

| Phase | Focus |
|-------|--------|
| 1 | PostgreSQL RLS |
| 2 | Tenant query hardening |
| 3 | Production auth |
| 4 | Stripe billing |
| 5 | CI/CD |

`phase:gate` runs the same checks as `test:system` and records pass/fail in `.phase-status.json`. Phase N+1 is blocked until Phase N gate passes.

### System test (dry run, no recording)

```bash
pnpm test:system -- --phase=1
```

This runs:
1. `/api/health` — DB + Redis + RLS checks
2. Unit/integration tests in Docker (`vitest`, incl. RLS)
3. E2E smoke tests in Docker (`e2e/smoke.spec.ts`)

After changing `Dockerfile.dev`, rebuild once: `docker compose --profile dev build app`

## Production

```bash
docker compose --profile prod up --build -d
```

Set `AUTH_SECRET` and `NEXTAUTH_URL` in `.env` before deploying.

## License

Private — all rights reserved.
