# Vtiger CRM integration

## Architecture

Each **workspace (tenant)** connects to its **own Vtiger CRM instance** via credentials stored on the `Tenant` record:

| Field | Purpose |
|-------|---------|
| `vtigerBaseUrl` | API base URL for webservice calls |
| `vtigerUsername` | Webservice user |
| `vtigerAccessKey` | Access key (server-side only; never returned to the client after save) |
| `vtigerPublicUrl` | Optional browser URL for embed / “Open Vtiger” |

| Data | Tenant isolation |
|------|------------------|
| Projects, tasks, members, billing | Per-tenant (PostgreSQL RLS) |
| `Project.vtigerAccountId` / `ProjectVtigerContact` links | Per-tenant (RLS on link rows) |
| Vtiger Accounts, Contacts, Leads, Potentials | **Per workspace** — each tenant uses its own Vtiger login and dataset |

## Trust boundary

- **App layer:** `crm:view` / `crm:edit` permissions gate who can call CRM server actions within a tenant.
- **Vtiger layer:** Server actions resolve credentials with `getVtigerConfigForTenant(activeTenantId)` and open a session cached per tenant.
- **Project links:** Which app projects reference which Vtiger records is tenant-scoped; underlying Vtiger records belong to that workspace’s Vtiger instance only.

## Configuration

### Production (multi-tenant SaaS)

1. Set `VTIGER_SINGLE_TENANT_MODE=false` (or omit; default env fallback is only when explicitly `true`).
2. Each workspace owner/admin configures Vtiger under **Settings → CRM** (`workspace:manage` or `billing:manage`).
3. Save base URL, username, and access key; use **Verify connection** to test that workspace’s credentials.

Access keys are masked in the UI after save (similar to Stripe secrets). The full key is never sent to the browser.

### Development (Docker)

The compose stack still provides global `VTIGER_*` variables for the local Vtiger container. With `VTIGER_SINGLE_TENANT_MODE=true` (default in dev), workspaces **without** saved credentials fall back to those env vars so local CRM works without manual setup.

The seed script optionally copies env credentials onto the demo tenant when present.

| Variable | Purpose |
|----------|---------|
| `VTIGER_BASE_URL` | Dev API URL (e.g. `http://vtiger` in Docker) |
| `VTIGER_PUBLIC_URL` | Browser URL for embed / “Open Vtiger” |
| `VTIGER_USERNAME` / `VTIGER_ACCESS_KEY` | Dev webservice user |
| `VTIGER_SINGLE_TENANT_MODE` | Default `true`. When `true`, env vars are used only if the workspace has no stored config |

## Security

- User-supplied Vtiger record IDs are validated (`lib/vtiger/validate.ts`) before query interpolation or retrieve/update/delete calls.
- Prefer `vtigerRetrieve` / parameterized webservice operations over raw VTQL where possible.
- Per-tenant sessions are cached in memory keyed by `tenantId`; clearing credentials invalidates the cache for that workspace.
