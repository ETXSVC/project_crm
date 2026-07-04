import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function createTenantPrisma(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const tenantScopedModels = [
            "Project",
            "Task",
            "TaskDependency",
            "Milestone",
            "Resource",
            "ResourceAssignment",
            "Baseline",
            "CrmAccount",
            "Contact",
            "Lead",
            "Opportunity",
            "PipelineStage",
            "Activity",
            "AuditLog",
            "Notification",
            "ProjectCalendar",
          ];

          if (tenantScopedModels.includes(model)) {
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
