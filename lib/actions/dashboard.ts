"use server";

import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { formatDate } from "@/lib/utils";
import { cacheGetOrSet } from "@/lib/cache/redis";
import { cacheKeys, CACHE_TTL } from "@/lib/cache/keys";
import { fetchCrmPipelineStats } from "@/lib/cache/crm-stats";

const DEFAULT_LAYOUT = [
  { i: "project-health", x: 0, y: 0, w: 4, h: 2 },
  { i: "crm-pipeline", x: 4, y: 0, w: 4, h: 2 },
  { i: "upcoming", x: 8, y: 0, w: 4, h: 2 },
  { i: "workload", x: 0, y: 2, w: 6, h: 3 },
  { i: "activity", x: 6, y: 2, w: 6, h: 3 },
  { i: "quick-actions", x: 0, y: 5, w: 12, h: 1 },
];

type TenantDashboardData = {
  projectHealth: { onTrack: number; atRisk: number; overdue: number };
  projects: Awaited<ReturnType<typeof prisma.project.findMany>>;
  milestones: Array<{
    id: string;
    name: string;
    dateLabel: string;
    project: { name: string };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    createdAtLabel: string;
    user: { name: string | null; email: string };
  }>;
  crmStats: Awaited<ReturnType<typeof fetchCrmPipelineStats>>;
  workload: Array<{
    id: string;
    name: string;
    assignmentCount: number;
    avgProgress: number;
  }>;
};

async function fetchTenantDashboardData(tenantId: string): Promise<TenantDashboardData> {
  const [projects, milestones, auditLogs, crmStats, resources] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId, deletedAt: null },
      include: { _count: { select: { tasks: true } } },
    }),
    prisma.milestone.findMany({
      where: { tenantId, date: { gte: new Date() } },
      include: { project: { select: { name: true } } },
      orderBy: { date: "asc" },
      take: 10,
    }),
    prisma.auditLog.findMany({
      where: { tenantId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    fetchCrmPipelineStats(tenantId),
    prisma.resource.findMany({
      where: { tenantId },
      include: {
        assignments: {
          include: { task: { select: { name: true, percentComplete: true } } },
        },
      },
    }),
  ]);

  const now = new Date();
  const projectHealth = {
    onTrack: 0,
    atRisk: 0,
    overdue: 0,
  };

  for (const project of projects) {
    if (project.status === "COMPLETED") continue;
    const endDate = project.endDate ? new Date(project.endDate) : null;
    if (endDate && endDate < now) {
      projectHealth.overdue++;
    } else if (project.status === "ON_HOLD") {
      projectHealth.atRisk++;
    } else {
      projectHealth.onTrack++;
    }
  }

  const workload = resources.map((r) => ({
    id: r.id,
    name: r.name,
    assignmentCount: r.assignments.length,
    avgProgress:
      r.assignments.length > 0
        ? Math.round(
            r.assignments.reduce((s, a) => s + a.task.percentComplete, 0) / r.assignments.length
          )
        : 0,
  }));

  return {
    projectHealth,
    projects: projects.slice(0, 5),
    milestones: milestones.map((m) => ({
      id: m.id,
      name: m.name,
      dateLabel: formatDate(m.date),
      project: m.project,
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      createdAtLabel: formatDate(log.createdAt),
      user: log.user,
    })),
    crmStats,
    workload,
  };
}

export async function getDashboardData() {
  const { tenantId, userId } = await getTenantDb();

  const [tenantData, notifications, layout] = await Promise.all([
    cacheGetOrSet(
      cacheKeys.tenantDashboard(tenantId),
      CACHE_TTL.dashboard,
      () => fetchTenantDashboardData(tenantId)
    ),
    prisma.notification.findMany({
      where: { tenantId, userId, read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.dashboardLayout.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    }),
  ]);

  return {
    ...tenantData,
    notifications,
    layout: (layout?.layout as typeof DEFAULT_LAYOUT) ?? DEFAULT_LAYOUT,
  };
}

export async function saveDashboardLayout(layout: unknown) {
  const { tenantId, userId } = await getTenantDb();

  await prisma.dashboardLayout.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    create: { tenantId, userId, layout: layout as object },
    update: { layout: layout as object },
  });

  return { success: true };
}

export async function markNotificationRead(notificationId: string) {
  const { tenantId, userId } = await getTenantDb();
  await prisma.notification.update({
    where: { id: notificationId, tenantId, userId },
    data: { read: true },
  });
  return { success: true };
}

export async function globalSearch(query: string) {
  const { tenantId } = await getTenantDb();
  if (!query || query.length < 2) return { projects: [], accounts: [], contacts: [], tasks: [] };

  const [projects, accounts, contacts, tasks] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId, deletedAt: null, name: { contains: query, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.crmAccount.findMany({
      where: { tenantId, deletedAt: null, name: { contains: query, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.task.findMany({
      where: { tenantId, deletedAt: null, name: { contains: query, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, projectId: true },
    }),
  ]);

  return { projects, accounts, contacts, tasks };
}
