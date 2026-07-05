# Multi-Tenant Project Management Platform

A Docker-based SaaS platform for project management, CRM, Gantt scheduling, and customizable dashboards — built with **Next.js 15**, **PostgreSQL 16 (RLS)**, **Prisma**, **Redis**, **NextAuth v5**, and **Stripe**.

📖 **[User Manual](docs/USER_MANUAL.md)** — step-by-step guide with screenshots for end users.

---

## Features

| Module | Capabilities |
|--------|-------------|
| **Multi-tenancy** | Shared-schema isolation via PostgreSQL RLS, Prisma tenant extension, workspace switcher |
| **Projects** | WBS hierarchy, dependencies (FS/SS/FF/SF), scheduling engine, critical path, baselines, resources |
| **Gantt** | Interactive drag-and-drop timeline with zoom and critical-path highlighting |
| **CRM** | Accounts, contacts, leads, opportunities (kanban), activity logging, lead conversion |
| **Dashboard** | Drag-resize widget grid with project health, CRM funnel, workload, activity feed |
| **Search** | Command palette (⌘K) across projects, accounts, contacts, and tasks |
| **Auth** | Credentials, magic link, optional Google/GitHub OAuth, session hardening |
| **Billing** | Stripe checkout, subscriptions, webhooks, Free/Pro plan limits |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose (Linux)

No local Node.js or PostgreSQL installation is required for development.

---

## Quick start

```bash
cp .env.example .env
docker compose --profile dev up --build
```

The entrypoint waits for Postgres, runs migrations, seeds demo data, and starts the dev server.

| URL | Purpose |
|-----|---------|
| http://localhost:3001 | Application (dev profile — port 3001 on host) |
| http://localhost:8025 | Mailhog email capture (dev) |

**Demo credentials:** `demo@example.com` / `password`

---

## Makefile commands

```bash
make up            # Start dev stack (build + up)
make down          # Stop containers
make logs          # Tail app logs
make shell         # Shell into app container
make migrate       # Run Prisma migrations (dev)
make seed          # Seed database
make test          # Vitest unit/integration tests
make system-test   # Health + lint + vitest + E2E
make phase-status  # Show phase gate progress
make prod          # Production stack (profile prod)
make build         # Rebuild dev image
```

Equivalent Docker commands:

```bash
docker compose --profile dev exec app pnpm test
docker compose --profile dev exec app pnpm lint
docker compose --profile dev exec app ./node_modules/.bin/tsx scripts/run-e2e.ts
```

---

## Project structure

```
app/                 Next.js App Router — pages and API routes
  (app)/             Authenticated shell (dashboard, projects, CRM, settings)
  (auth)/            Login, signup, onboarding, verify-email
  api/               Health, auth, Stripe webhooks
components/          UI — shadcn, Gantt, CRM, dashboard, layout
lib/
  actions/           Server actions (auth, CRM, projects, billing, tenant, settings)
  auth/              NextAuth config, providers, callbacks, session
  billing/           Stripe client, plans, limits, subscription sync
  cache/             Redis caching for dashboard and CRM aggregates
  db/                Prisma client, tenant extension, RLS context
  scheduling/        Forward pass, cycle detection, critical path (CPM)
prisma/              Schema, migrations (init, RLS, billing), seed
docker/              Entrypoint, wait-for-it scripts
docs/                User manual and screenshots
e2e/                 Playwright smoke tests
scripts/             Phase gates, system tests, CI verification, screenshot capture
.github/workflows/   GitHub Actions CI pipeline
```

---

## Application routes

### Public

| Route | Description |
|-------|-------------|
| `/login` | Sign in (password, magic link, OAuth) |
| `/signup` | Create account + workspace |
| `/onboarding` | First workspace for OAuth/magic-link users |
| `/verify-email` | Magic link confirmation page |
| `/api/health` | Health check (DB, Redis, RLS, auth, billing flags) |
| `/api/webhooks/stripe` | Stripe subscription webhooks |

### Authenticated

| Route | Description |
|-------|-------------|
| `/dashboard` | Widget dashboard |
| `/projects` | Project list |
| `/projects/[id]` | Project overview |
| `/projects/[id]/tasks` | WBS task list |
| `/projects/[id]/gantt` | Interactive Gantt chart |
| `/projects/[id]/resources` | Resource management |
| `/crm/accounts` | CRM accounts |
| `/crm/contacts` | Contacts |
| `/crm/leads` | Leads |
| `/crm/opportunities` | Pipeline kanban |
| `/crm/activities` | Activity log |
| `/settings` | Workspace, pipeline, calendars, billing |

---

## Architecture

### Request flow

```
Browser → Next.js middleware (auth + tenant check)
       → Server action / page
       → getTenantDb() → set app.tenant_id GUC
       → Tenant-scoped Prisma client (RLS + extension)
       → PostgreSQL
```

### Tenant isolation (defense in depth)

1. **PostgreSQL RLS** — migration `20260704220000_enable_rls`; app connects as `proj_app`
2. **Session GUC** — `set_config('app.tenant_id', …)` in `lib/db/tenant-context.ts`
3. **Prisma extension** — `createTenantPrisma()` auto-injects `tenantId` on tenant-owned models
4. **Migrations/seeds** — use `MIGRATION_DATABASE_URL` (superuser `proj`)

### Auth

- **NextAuth v5** JWT sessions (30-day max, 24h rolling refresh)
- Session fields: `activeTenantId`, `activeTenantSlug`, `role`
- Providers: credentials (always), magic link (SMTP), Google/GitHub (optional env)
- Edge-safe split: `auth.config.ts` for middleware; full config in `lib/auth/index.ts`

### Billing

| Plan | Projects | CRM accounts | Members |
|------|----------|--------------|---------|
| Free | 5 | 25 | 5 |
| Pro | Unlimited | Unlimited | Unlimited |

Stripe checkout and customer portal via server actions; webhooks sync subscription state to the `Tenant` model. Limits enforced in `createProject` and `createCrmAccount`.

### Caching

Redis caches dashboard aggregates and CRM pipeline stats. Cache keys are tenant-scoped; mutations invalidate relevant keys.

### Scheduling engine

`lib/scheduling/engine.ts` performs forward-pass scheduling, cycle detection, and critical-path analysis. Triggered automatically on task and dependency changes.

---

## Docker services

| Service | Profile | Host port | Purpose |
|---------|---------|-----------|---------|
| `app` | dev | 3001 | Next.js dev server |
| `app-prod` | prod | 3000 | Production build (standalone) |
| `postgres` | always | — | PostgreSQL 16 |
| `redis` | always | — | Redis 7 cache |
| `mailhog` | dev | 8025 | Email capture |

**Entrypoint** (`docker/entrypoint.sh`): wait for Postgres → `prisma generate` → migrate → seed → socat mirror port 3001 → start app.

After changing `Dockerfile.dev`, rebuild: `docker compose --profile dev build app`

---

## Environment variables

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | App connection (`proj_app` — RLS enforced) |
| `MIGRATION_DATABASE_URL` | Migrations/seeds (superuser) |
| `REDIS_URL` | Redis cache |
| `AUTH_SECRET` | NextAuth JWT signing secret |
| `NEXTAUTH_URL` | Auth callback base (`http://localhost:3001` in dev) |
| `SMTP_*` | Magic link email (Mailhog in dev) |
| `AUTH_GOOGLE_*` / `AUTH_GITHUB_*` | Optional OAuth |
| `STRIPE_*` | Optional billing (checkout + webhooks) |
| `UPLOAD_DIR` | File upload directory |

Production: set strong `AUTH_SECRET` and correct `NEXTAUTH_URL` before deploy.

---

## Testing

### Unit and integration tests

```bash
docker compose --profile dev exec app pnpm test
```

Includes RLS tests, tenant query isolation, billing plans, auth providers, scheduling engine.

### E2E smoke tests

```bash
docker compose --profile dev exec app ./node_modules/.bin/tsx scripts/run-e2e.ts
```

Covers login, signup, dashboard, projects, and CRM pipeline pages.

### System test (dry run)

```bash
pnpm test:system -- --phase=5
```

Runs health check → CI workflow verification (phase 5) → lint → unit → E2E.

### Phase gate

Each roadmap phase must pass **health + lint + unit + E2E** before the next begins:

```bash
pnpm phase:gate -- --phase=1
pnpm phase:status
```

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | PostgreSQL RLS | ✅ |
| 2 | Tenant query hardening | ✅ |
| 3 | Production auth | ✅ |
| 4 | Stripe billing | ✅ |
| 5 | CI/CD | ✅ |

Progress is recorded in `.phase-status.json`.

---

## CI/CD (GitHub Actions)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

**Triggers:** push to `main`, all pull requests.

**Steps:**

1. Copy `.env.example` → `.env`
2. `docker compose --profile dev up --build -d`
3. Wait for `http://localhost:3001/api/health`
4. Lint → Vitest → Playwright E2E
5. Upload Playwright artifacts on failure
6. Tear down stack

Validate locally:

```bash
pnpm verify:ci
```

> **Note:** Pushing workflow files requires a GitHub token with the `workflow` scope. If push is rejected, run `gh auth refresh -h github.com -s workflow`.

---

## Documentation

| Document | Audience |
|----------|----------|
| [docs/USER_MANUAL.md](docs/USER_MANUAL.md) | End users — workflows with screenshots |
| This README | Developers and operators |

Regenerate screenshots:

```bash
docker compose --profile dev exec app ./node_modules/.bin/tsx scripts/capture-manual-screenshots.ts
```

---

## Production deployment

```bash
docker compose --profile prod up --build -d
```

Set `AUTH_SECRET`, `NEXTAUTH_URL`, and production database/Redis URLs in `.env`. Configure Stripe and OAuth credentials as needed.

---

## Branching

Development uses **`main`** as the single integration branch. All phase work is merged to `main`; feature branches can be created as needed and merged via pull request (CI gate required).

---

## License

Private — all rights reserved.
