import { auth } from "@/lib/auth";
import { createTenantPrisma } from "@/lib/db/prisma";
import { setTenantContext } from "@/lib/db/tenant-context";

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function getTenantDb() {
  const session = await requireSession();
  const tenantId = session.user.activeTenantId;
  if (!tenantId) {
    throw new Error("No active tenant");
  }

  await setTenantContext(tenantId);

  return {
    db: createTenantPrisma(tenantId),
    tenantId,
    userId: session.user.id,
    session,
  };
}

export async function getTenantBySlug(slug: string) {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma.tenant.findUnique({ where: { slug } });
}
