# Multi-company architecture

This app is a multi-tenant SaaS. In the product UI we call each tenant a **company**. Code and the database still use `Tenant` / `tenantId`.

## Concepts

| Concept | Model / field | Description |
|---------|---------------|-------------|
| User | `User` | A person with one login (email + password or OAuth). |
| Company | `Tenant` | An isolated organization with its own projects, CRM, billing, and settings. |
| Membership | `TenantMembership` | Links a user to a company with a role (`OWNER`, `ADMIN`, etc.). |
| Active company | `session.user.activeTenantId` | The company whose data the user is viewing right now. |

A single user can belong to **many companies** with a **different role in each**.

## End-user flows

### Sign up (first company)

1. User registers at `/signup` with name, email, password, and **company name**.
2. The app creates a `User`, a `Tenant`, and a `TenantMembership` with role `OWNER`.
3. User lands on the dashboard for that company.

### OAuth / magic link (no company yet)

1. User signs in without an existing membership.
2. Middleware sends them to `/onboarding` to **create their company**.
3. They become `OWNER` of the new company.

### Join another company (invite)

1. A company admin invites by email from **Settings → Members & invitations**.
2. Invitee opens `/invite/{token}` and signs in with the **matching email**.
3. Accepting creates a `TenantMembership` for **that company only** (with the invited role).
4. Session switches to the joined company.

Invitations never grant access to other companies the user already belongs to.

### Switch companies

Use the **company switcher** in the sidebar footer. Switching updates the session (`activeTenantId`, role) and reloads all tenant-scoped data.

### Create another company

Any signed-in user can click **Create company** in the sidebar switcher (or complete onboarding on first login). Each new company gets a fresh `Tenant` and an `OWNER` membership for the creator. Billing, CRM, and projects are independent per company.

## Data isolation

All business data is scoped to `activeTenantId`:

- **Projects, tasks, resources, baselines** — `tenantId` on each row; queries use `getTenantDb()` + Prisma tenant extension with PostgreSQL RLS.
- **CRM** — per-company Vtiger credentials on `Tenant`; API sessions keyed by `activeTenantId`.
- **Billing** — Stripe customer and plan per `Tenant`.
- **Settings** — company name, slug, calendars, pipeline stages per tenant.
- **Members** — `TenantMembership` and `Invitation` rows are tenant-scoped; invite lookup uses admin Prisma only for token resolution.

Row Level Security policies enforce `tenantId` at the database layer. See [ACCESS_CONTROL.md](./ACCESS_CONTROL.md) for roles and permissions.

## Settings per company

**Settings → Company** shows name, URL slug, logo, member count, plan badge, and your role. Owners/admins can edit profile fields and manage **Members**, **CRM**, **Billing**, and calendars for the **active company only**.

## Demo account

After seeding, `demo@example.com` / `password` belongs to two companies:

- **Demo Corporation** (`demo`) — Owner  
- **Acme Industries** (`acme`) — Admin  

Use the company switcher to verify multi-company behavior without affecting production data.

## Internal naming

Keep `tenant`, `tenantId`, `TenantMembership`, and `workspace:manage` in code. Use **company** in user-facing strings, docs, and tests unless referring to internal APIs.
