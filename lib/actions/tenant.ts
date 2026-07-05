"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireSession } from "@/lib/db/get-tenant-db";

export async function getUserTenants() {
  const session = await requireSession();

  const memberships = await prisma.tenantMembership.findMany({
    where: { userId: session.user.id },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  return memberships.map((membership) => ({
    id: membership.tenant.id,
    name: membership.tenant.name,
    slug: membership.tenant.slug,
    role: membership.role,
    isActive: membership.tenant.id === session.user.activeTenantId,
  }));
}

export async function switchActiveTenant(tenantId: string) {
  const session = await requireSession();

  const membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: { tenantId, userId: session.user.id },
    },
    include: { tenant: { select: { slug: true } } },
  });

  if (!membership) {
    return { error: "You are not a member of that workspace" };
  }

  if (membership.tenantId === session.user.activeTenantId) {
    return { success: true, tenantId, tenantSlug: membership.tenant.slug, role: membership.role };
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    role: membership.role,
  };
}
