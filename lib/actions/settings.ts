"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { invalidateCrmCache } from "@/lib/cache/invalidate";
import { assertPermission } from "@/lib/auth/guards";
import {
  workspaceSettingsSchema,
  pipelineStageSchema,
  calendarSettingsSchema,
} from "@/lib/validations/settings-schemas";
import type { TenantRole } from "@prisma/client";

function requireWorkspaceManage(role?: TenantRole) {
  const denied = assertPermission(role, "workspace:manage");
  if (denied) throw new Error(denied);
}

export async function getSettings() {
  const { tenantId } = await getTenantDb();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      pipelineStages: { orderBy: { sortOrder: "asc" } },
      projectCalendars: true,
      _count: { select: { memberships: true } },
    },
  });

  return tenant;
}

export async function updateWorkspaceSettings(formData: FormData) {
  const { tenantId, userId, session } = await getTenantDb();
  requireWorkspaceManage(session.user.role);

  const parsed = workspaceSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    logoUrl: formData.get("logoUrl") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid company settings" };
  }

  const slugTaken = await prisma.tenant.findFirst({
    where: { slug: parsed.data.slug, id: { not: tenantId } },
  });
  if (slugTaken) {
    return { error: "That company URL slug is already taken" };
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      logoUrl: parsed.data.logoUrl || null,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Tenant",
    entityId: tenantId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function createPipelineStage(formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  requireWorkspaceManage(session.user.role);

  const parsed = pipelineStageSchema.safeParse({
    name: formData.get("name"),
    probability: formData.get("probability"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid stage data" };
  }

  const maxOrder = await db.pipelineStage.aggregate({
    where: {},
    _max: { sortOrder: true },
  });

  const stage = await db.pipelineStage.create({
    data: {
      tenantId,
      name: parsed.data.name,
      probability: parsed.data.probability,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "PipelineStage",
    entityId: stage.id,
  });

  revalidatePath("/settings");
  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function updatePipelineStage(stageId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  requireWorkspaceManage(session.user.role);

  const parsed = pipelineStageSchema.safeParse({
    name: formData.get("name"),
    probability: formData.get("probability"),
    sortOrder: formData.get("sortOrder"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid stage data" };
  }

  await db.pipelineStage.update({
    where: { id: stageId },
    data: {
      name: parsed.data.name,
      probability: parsed.data.probability,
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "PipelineStage",
    entityId: stageId,
  });

  revalidatePath("/settings");
  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function deletePipelineStage(stageId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  requireWorkspaceManage(session.user.role);

  const oppCount = await db.opportunity.count({
    where: { stageId, deletedAt: null },
  });

  if (oppCount > 0) {
    return { error: "Cannot delete a stage that has open opportunities" };
  }

  await db.pipelineStage.delete({
    where: { id: stageId },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "PipelineStage",
    entityId: stageId,
  });

  revalidatePath("/settings");
  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function updateCalendarSettings(calendarId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  requireWorkspaceManage(session.user.role);

  const workDaysRaw = formData.getAll("workDays").map((v) => Number(v));
  const holidaysRaw = formData
    .get("holidays")
    ?.toString()
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean) ?? [];

  const parsed = calendarSettingsSchema.safeParse({
    name: formData.get("name"),
    hoursPerDay: formData.get("hoursPerDay"),
    workDays: workDaysRaw.length > 0 ? workDaysRaw : [1, 2, 3, 4, 5],
    holidays: holidaysRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid calendar settings" };
  }

  const holidays = parsed.data.holidays
    ?.map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime())) ?? [];

  await db.projectCalendar.update({
    where: { id: calendarId },
    data: {
      name: parsed.data.name,
      hoursPerDay: parsed.data.hoursPerDay,
      workDays: parsed.data.workDays,
      holidays,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "ProjectCalendar",
    entityId: calendarId,
  });

  revalidatePath("/settings");
  return { success: true };
}
