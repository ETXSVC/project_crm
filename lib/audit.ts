import { prisma } from "@/lib/db/prisma";
import type { AuditAction, Prisma } from "@prisma/client";

export async function createAuditLog(params: {
  tenantId: string;
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
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
  return prisma.notification.create({ data: params });
}
