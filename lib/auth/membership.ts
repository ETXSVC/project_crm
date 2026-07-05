import { prisma } from "@/lib/db/prisma";
import type { TenantRole } from "@prisma/client";

export type UserTenantContext = {
  activeTenantId?: string;
  activeTenantSlug?: string;
  role?: TenantRole;
};

export async function loadDefaultMembership(userId: string): Promise<UserTenantContext> {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) {
    return {};
  }

  return {
    activeTenantId: membership.tenantId,
    activeTenantSlug: membership.tenant.slug,
    role: membership.role,
  };
}
