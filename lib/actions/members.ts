"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { setTenantContext } from "@/lib/db/tenant-context";
import { getAdminPrisma } from "@/lib/db/admin-prisma";
import { createAuditLog } from "@/lib/audit";
import { checkPlanLimit } from "@/lib/billing/limits";
import { assertPermission } from "@/lib/auth/guards";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/auth/permissions";
import type { TenantRole } from "@prisma/client";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "PROJECT_MANAGER", "MEMBER", "SALES", "VIEWER"]),
});

const roleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "PROJECT_MANAGER",
  "MEMBER",
  "SALES",
  "VIEWER",
]);

export async function getMembersAndInvites() {
  const { tenantId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "members:view");
  if (denied) return { error: denied };

  await setTenantContext(tenantId);

  const [memberships, invitations] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { tenantId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    members: memberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      roleLabel: ROLE_LABELS[m.role],
    })),
    invitations: invitations.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      roleLabel: ROLE_LABELS[invite.role],
      expiresAt: invite.expiresAt,
      token: invite.token,
    })),
    assignableRoles: ASSIGNABLE_ROLES.map((role) => ({
      value: role,
      label: ROLE_LABELS[role],
    })),
  };
}

export async function createMemberInvite(formData: FormData) {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "members:invite");
  if (denied) return { error: denied };

  await setTenantContext(tenantId);

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Enter a valid email and role" };

  const email = parsed.data.email.toLowerCase();
  const role = parsed.data.role as TenantRole;

  const limitError = await checkPlanLimit(tenantId, "members");
  if (limitError) return { error: limitError };

  const existingMember = await prisma.tenantMembership.findFirst({
    where: { tenantId, user: { email } },
  });
  if (existingMember) return { error: "That user is already a member of this company" };

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.invitation.deleteMany({ where: { tenantId, email } });
  const invitation = await prisma.invitation.create({
    data: { tenantId, email, role, token, expiresAt },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: { email, role },
  });

  revalidatePath("/settings");
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  return {
    success: true,
    inviteUrl: `${baseUrl}/invite/${token}`,
  };
}

export async function revokeMemberInvite(invitationId: string) {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "members:invite");
  if (denied) return { error: denied };

  await setTenantContext(tenantId);

  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, tenantId },
  });
  if (!invitation) return { error: "Invitation not found" };

  await prisma.invitation.delete({ where: { id: invitationId } });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "Invitation",
    entityId: invitationId,
    metadata: { email: invitation.email },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateMemberRole(membershipId: string, role: string) {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "members:manage");
  if (denied) return { error: denied };

  await setTenantContext(tenantId);

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { error: "Invalid role" };
  if (parsedRole.data === "OWNER" && session.user.role !== "OWNER") {
    return { error: "Only owners can assign the owner role" };
  }

  const membership = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return { error: "Member not found" };

  if (membership.role === "OWNER" && parsedRole.data !== "OWNER") {
    const ownerCount = await prisma.tenantMembership.count({
      where: { tenantId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return { error: "Cannot change role of the last owner" };
    }
  }

  await prisma.tenantMembership.update({
    where: { id: membershipId },
    data: { role: parsedRole.data },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "TenantMembership",
    entityId: membershipId,
    metadata: { role: parsedRole.data },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function removeMember(membershipId: string) {
  const { tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "members:manage");
  if (denied) return { error: denied };

  await setTenantContext(tenantId);

  const membership = await prisma.tenantMembership.findFirst({
    where: { id: membershipId, tenantId },
  });
  if (!membership) return { error: "Member not found" };
  if (membership.userId === userId) return { error: "You cannot remove yourself" };

  if (membership.role === "OWNER") {
    const ownerCount = await prisma.tenantMembership.count({
      where: { tenantId, role: "OWNER" },
    });
    if (ownerCount <= 1) return { error: "Cannot remove the last owner" };
  }

  await prisma.tenantMembership.delete({ where: { id: membershipId } });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "TenantMembership",
    entityId: membershipId,
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function getInvitationByToken(token: string) {
  const admin = getAdminPrisma();
  const invitation = await admin.invitation.findUnique({
    where: { token },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    return null;
  }

  return {
    email: invitation.email,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role],
    tenantName: invitation.tenant.name,
    tenantSlug: invitation.tenant.slug,
    expiresAt: invitation.expiresAt,
  };
}

export async function acceptInvitation(token: string) {
  const session = await (await import("@/lib/auth")).auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "Sign in to accept this invitation" };
  }

  const admin = getAdminPrisma();
  const invitation = await admin.invitation.findUnique({
    where: { token },
    include: { tenant: true },
  });

  if (!invitation || invitation.expiresAt < new Date()) {
    return { error: "This invitation is invalid or has expired" };
  }

  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      error: `Sign in as ${invitation.email} to accept this invitation`,
    };
  }

  const existing = await admin.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        tenantId: invitation.tenantId,
        userId: session.user.id,
      },
    },
  });

  if (!existing) {
    const limitError = await checkPlanLimit(invitation.tenantId, "members");
    if (limitError) return { error: limitError };

    await admin.tenantMembership.create({
      data: {
        tenantId: invitation.tenantId,
        userId: session.user.id,
        role: invitation.role,
      },
    });
  }

  await admin.invitation.delete({ where: { id: invitation.id } });

  return {
    success: true,
    tenantId: invitation.tenantId,
    tenantSlug: invitation.tenant.slug,
    role: invitation.role,
  };
}
