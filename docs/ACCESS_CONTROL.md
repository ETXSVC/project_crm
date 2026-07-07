# Access control, invitations, and baselines

## Role permissions

Centralized in `lib/auth/permissions.ts` and enforced in server actions via `assertPermission()` from `lib/auth/guards.ts`.

| Role | Projects | CRM | Settings | Billing | Members |
|------|----------|-----|----------|---------|---------|
| Owner | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | Full |
| Project Manager | Full (incl. baselines) | Read | — | — | View |
| Member | Create/edit/schedule | Read | — | — | — |
| Sales | Read | Full pipeline | — | — | — |
| Viewer | Read | Read | — | — | — |

Navigation hides CRM and Projects links when the active role lacks view permission.

## Multi-company access

Users can belong to multiple companies (`TenantMembership`). The session stores `activeTenantId`; server actions use `getTenantDb()` so all reads/writes target the active company. Switch companies via the sidebar switcher.

See [MULTI_COMPANY.md](./MULTI_COMPANY.md) for signup, onboarding, invites, and isolation.

## Member invitations

1. **Settings → Members & invitations** — owners/admins invite by email and role for the **active company**.
2. System generates a link: `/invite/{token}` (valid 7 days).
3. Invitee signs in with the matching email and accepts.
4. Membership is created for that company only; invitation is removed.
5. Plan member limits apply per company (`checkPlanLimit`).

Cross-tenant invite lookup uses `MIGRATION_DATABASE_URL` via `lib/db/admin-prisma.ts`. Tenant-scoped invite rows use PostgreSQL RLS (`20260705060000_invitation_rls`).

## Project baselines

On each project overview page:

- **Create baseline** — snapshots current task dates, duration, and progress (requires `project:baseline`).
- **List baselines** — name, capture date, task count.
- **Delete baseline** — removes snapshot (requires `project:baseline`).

Server actions: `createBaseline`, `deleteBaseline` in `lib/actions/projects.ts`.

## Vtiger CRM (per company)

Each company connects to its own Vtiger instance via **Settings → CRM**. Credentials are stored on the tenant record and used server-side only; CRM API sessions are scoped by `activeTenantId`.

In development, `VTIGER_SINGLE_TENANT_MODE=true` allows env-based fallback when a company has no saved config. In production multi-tenant SaaS, disable that fallback and require per-company configuration.

See [VTIGER_INTEGRATION.md](./VTIGER_INTEGRATION.md) for architecture, dev vs production, and security notes.
