# Multi-Tenant Project Management Platform

A Docker-based SaaS project management platform with CRM, Gantt charts, and a widget-based dashboard — built with Next.js 15, PostgreSQL, and Prisma.

## Features

- **Multi-tenancy** — Row-level tenant isolation with RBAC roles
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
make test     # Run unit tests
make prod     # Start production stack
```

## Architecture

```
app/          Next.js App Router (pages, API routes)
components/   UI components (shadcn, Gantt, CRM, dashboard)
lib/          Auth, DB, scheduling engine, server actions
prisma/       Database schema and seed
docker/       Entrypoint and wait scripts
```

### Docker Services

| Service | Purpose |
|---------|---------|
| `app` | Next.js application |
| `postgres` | PostgreSQL 16 database |
| `redis` | Session cache |
| `mailhog` | Email capture (dev) |

## Development

All commands run inside Docker:

```bash
docker compose --profile dev exec app pnpm db:migrate:dev
docker compose --profile dev exec app pnpm db:seed
docker compose --profile dev exec app pnpm test
docker compose --profile dev exec app pnpm test:e2e
```

## Production

```bash
docker compose --profile prod up --build -d
```

Set `AUTH_SECRET` and `NEXTAUTH_URL` in `.env` before deploying.

## License

Private — all rights reserved.
