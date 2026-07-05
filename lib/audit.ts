import { createTenantPrisma } from "@/lib/db/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = createTenantPrisma(params.tenantId);
  return db.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function createNotification(params: {
  tenantId: string;
  userId: string;
  type: "ASSIGNMENT" | "DUE_DATE" | "DEAL_STAGE" | "MENTION" | "SYSTEM";
  title: string;
  message: string;
  link?: string;
}) {
  const db = createTenantPrisma(params.tenantId);
  const { tenantId: _tenantId, ...data } = params;
  return db.notification.create({ data });
}
