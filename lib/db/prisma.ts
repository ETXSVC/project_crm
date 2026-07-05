import { PrismaClient } from "@prisma/client";
import { setTenantContext } from "@/lib/db/tenant-context";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const tenantScopedModels = [
  "Project",
  "Task",
  "TaskDependency",
  "Milestone",
  "Resource",
  "ResourceAssignment",
  "Baseline",
  "BaselineTask",
  "CrmAccount",
  "Contact",
  "Lead",
  "Opportunity",
  "PipelineStage",
  "Activity",
  "AuditLog",
  "Notification",
  "ProjectCalendar",
  "DashboardLayout",
] as const;

export function createTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          await setTenantContext(tenantId);

          if (tenantScopedModels.includes(model as (typeof tenantScopedModels)[number])) {
            if (operation === "create" || operation === "createMany") {
              if (operation === "create") {
                (args as { data: Record<string, unknown> }).data = {
                  ...(args as { data: Record<string, unknown> }).data,
                  tenantId,
                };
              }
            } else if ("where" in args && args.where) {
              (args as { where: Record<string, unknown> }).where = {
                ...(args as { where: Record<string, unknown> }).where,
                tenantId,
              };
            } else if (
              ["findMany", "findFirst", "count", "aggregate"].includes(operation)
            ) {
              (args as { where?: Record<string, unknown> }).where = {
                ...((args as { where?: Record<string, unknown> }).where ?? {}),
                tenantId,
              };
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type TenantPrisma = ReturnType<typeof createTenantPrisma>;
