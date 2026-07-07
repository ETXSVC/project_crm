import { cache } from "react";
import { auth } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/db/prisma";

/**
 * Resolves the current session. When logged in, the JWT carries an auth key that
 * points at the Redis-backed session record issued at login.
 */export const getSession = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session;
});

export const requireSession = cache(async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
});

/** One auth key lookup + tenant client per React render. */
export const getTenantDb = cache(async () => {
  const session = await requireSession();
  const tenantId = session.user.activeTenantId;
  if (!tenantId) {
    throw new Error("No active tenant");
  }

  // Tenant RLS is applied per query by createTenantPrisma (setTenantContext on each operation).
  return {
    db: createTenantPrisma(tenantId),
    tenantId,
    userId: session.user.id,
    session,
  };
});
export async function getTenantBySlug(slug: string) {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.tenant.findUnique({ where: { slug } });
}
