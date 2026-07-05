import { prisma } from "@/lib/db/prisma";

export const TENANT_SETTING = "app.tenant_id";
export const USER_SETTING = "app.user_id";

/**
 * Sets the active tenant on the current DB session.
 * Uses session-scoped config so subsequent Prisma queries on the same
 * pooled connection see the tenant GUC (required for PostgreSQL RLS).
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config(${TENANT_SETTING}, ${tenantId}, false)`;
}

export async function setUserContext(userId: string): Promise<void> {
  await prisma.$executeRaw`SELECT set_config(${USER_SETTING}, ${userId}, false)`;
}

export async function clearTenantContext(): Promise<void> {
  await prisma.$executeRaw`SELECT set_config(${TENANT_SETTING}, '', false)`;
}

export async function clearUserContext(): Promise<void> {
  await prisma.$executeRaw`SELECT set_config(${USER_SETTING}, '', false)`;
}

export async function withTenantContext<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await setTenantContext(tenantId);
  try {
    return await callback();
  } finally {
    await clearTenantContext();
  }
}

export async function isRlsEnabled(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    SELECT c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = ${tableName}
  `;
  const row = rows[0];
  return Boolean(row?.relrowsecurity && row?.relforcerowsecurity);
}
