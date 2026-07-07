import { cache } from "react";
import { cacheGetOrSet } from "@/lib/cache/redis";
import { cacheKeys, CACHE_TTL } from "@/lib/cache/keys";
import { getTenantDb } from "@/lib/db/get-tenant-db";

export type ProjectShell = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  crmAccountId: string | null;
  crmAccount: { name: string } | null;
  vtigerAccountId: string | null;
  vtigerContacts: { vtigerContactId: string }[];
};

export type CrmAccountOption = { id: string; name: string };

type TaskDates = { startDate: Date | string | null; endDate: Date | string | null };

function reviveDates<T extends TaskDates>(rows: T[]): T[] {
  return rows.map((row) => ({
    ...row,
    startDate: row.startDate ? new Date(row.startDate) : null,
    endDate: row.endDate ? new Date(row.endDate) : null,
  }));
}

export const loadProjectShell = cache(async (projectId: string): Promise<ProjectShell | null> => {
  const { db, tenantId } = await getTenantDb();
  return db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      crmAccountId: true,
      crmAccount: { select: { name: true } },
      vtigerAccountId: true,
      vtigerContacts: { select: { vtigerContactId: true } },
    },
  });
});

export const loadCrmAccountOptions = cache(async (): Promise<CrmAccountOption[]> => {
  const { db, tenantId } = await getTenantDb();
  return db.crmAccount.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
});

export async function loadProjectBaselines(projectId: string) {
  const { db, tenantId } = await getTenantDb();
  return db.baseline.findMany({
    where: { projectId, tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { tasks: true } },
    },
  });
}

export async function loadProjectTasks(projectId: string) {
  const { tenantId } = await getTenantDb();
  const tasks = await cacheGetOrSet(cacheKeys.projectTasks(tenantId, projectId), CACHE_TTL.projectData, () =>
    fetchProjectTasks(projectId, tenantId)
  );
  return reviveDates(tasks);
}

async function fetchProjectTasks(projectId: string, tenantId: string) {
  const { db } = await getTenantDb();
  return db.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      parentId: true,
      startDate: true,
      endDate: true,
      duration: true,
      percentComplete: true,
      isCritical: true,
      version: true,
      assignments: { select: { resource: { select: { name: true } } } },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export async function loadGanttData(projectId: string) {
  const { tenantId } = await getTenantDb();
  const data = await cacheGetOrSet(cacheKeys.projectGantt(tenantId, projectId), CACHE_TTL.projectData, () =>
    fetchGanttData(projectId, tenantId)
  );
  return { tasks: reviveDates(data.tasks), dependencies: data.dependencies };
}

async function fetchGanttData(projectId: string, tenantId: string) {
  const { db } = await getTenantDb();
  const [tasks, dependencies] = await Promise.all([
    db.task.findMany({
      where: { projectId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        parentId: true,
        startDate: true,
        endDate: true,
        duration: true,
        percentComplete: true,
        isCritical: true,
        version: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.taskDependency.findMany({
      where: { projectId, tenantId },
      select: {
        id: true,
        predecessorId: true,
        successorId: true,
        type: true,
      },
    }),
  ]);
  return { tasks, dependencies };
}

export async function loadResourcesPageData(projectId: string) {
  const { tenantId } = await getTenantDb();
  return cacheGetOrSet(
    cacheKeys.projectResources(tenantId, projectId),
    CACHE_TTL.projectData,
    () => fetchResourcesPageData(projectId, tenantId)
  );
}

async function fetchResourcesPageData(projectId: string, tenantId: string) {
  const { db } = await getTenantDb();
  const [resources, tasks] = await Promise.all([
    db.resource.findMany({
      where: {
        tenantId,
        OR: [{ projectId }, { projectId: null }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        email: true,
        capacityHrs: true,
        costRate: true,
        assignments: {
          select: {
            taskId: true,
            task: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.task.findMany({
      where: { projectId, tenantId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { resources, tasks };
}
