"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/lib/audit";
import { invalidateProjectCache } from "@/lib/cache/invalidate";
import { projectSchema, taskSchema, taskUpdateSchema, dependencySchema, resourceSchema } from "@/lib/validations/schemas";
import {
  forwardPass,
  detectCycle,
  computeCriticalPath,
  type ScheduleTask,
  type ScheduleDependency,
} from "@/lib/scheduling/engine";

export async function getProjects() {
  const { tenantId } = await getTenantDb();
  return prisma.project.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      crmAccount: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(projectId: string) {
  const { tenantId } = await getTenantDb();
  return prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      crmAccount: true,
      calendar: true,
      milestones: { orderBy: { date: "asc" } },
      baselines: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createProject(formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid project data" };

  const calendar = await prisma.projectCalendar.findFirst({
    where: { tenantId },
  });

  const project = await prisma.project.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status ?? "PLANNING",
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      crmAccountId: parsed.data.crmAccountId || undefined,
      calendarId: calendar?.id,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    metadata: { name: project.name },
  });

  revalidatePath("/projects");
  await invalidateProjectCache(tenantId);
  return { success: true, projectId: project.id };
}

export async function updateProject(projectId: string, formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid project data" };

  await prisma.project.update({
    where: { id: projectId, tenantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      crmAccountId: parsed.data.crmAccountId || null,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Project",
    entityId: projectId,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const { tenantId, userId } = await getTenantDb();
  await prisma.project.update({
    where: { id: projectId, tenantId },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "Project",
    entityId: projectId,
  });

  revalidatePath("/projects");
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function getProjectTasks(projectId: string) {
  const { tenantId } = await getTenantDb();
  const tasks = await prisma.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
    include: {
      assignments: { include: { resource: true } },
      predecessors: true,
      successors: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  return tasks;
}

export async function getProjectDependencies(projectId: string) {
  const { tenantId } = await getTenantDb();
  return prisma.taskDependency.findMany({
    where: { projectId, tenantId },
  });
}

export async function createTask(projectId: string, formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = taskSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    parentId: formData.get("parentId") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    duration: formData.get("duration") ?? undefined,
    percentComplete: formData.get("percentComplete") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid task data" };
  }

  const maxOrder = await prisma.task.aggregate({
    where: { projectId, tenantId },
    _max: { sortOrder: true },
  });

  try {
    const task = await prisma.task.create({
      data: {
        tenantId,
        projectId,
        name: parsed.data.name,
        description: parsed.data.description,
        type: parsed.data.type ?? "TASK",
        parentId: parsed.data.parentId || undefined,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : new Date(),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        duration: parsed.data.duration ?? 1,
        percentComplete: parsed.data.percentComplete ?? 0,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });

    await recalculateSchedule(projectId);

    await createAuditLog({
      tenantId,
      userId,
      action: "CREATE",
      entityType: "Task",
      entityId: task.id,
      metadata: { name: task.name, projectId },
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/tasks`);
    revalidatePath(`/projects/${projectId}/gantt`);
    await invalidateProjectCache(tenantId);
    return { success: true, taskId: task.id };
  } catch (e) {
    console.error("createTask error:", e);
    return { error: "Failed to create task" };
  }
}

export async function updateTask(taskId: string, formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = taskUpdateSchema.safeParse({
    name: formData.get("name") || undefined,
    description: formData.get("description") || undefined,
    type: formData.get("type") || undefined,
    parentId: formData.has("parentId") ? formData.get("parentId") || null : undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    duration: formData.get("duration") ?? undefined,
    percentComplete: formData.get("percentComplete") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid task data" };
  }

  const existing = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!existing) return { error: "Task not found" };

  const version = formData.get("version")
    ? Number(formData.get("version"))
    : existing.version;
  if (version !== existing.version) {
    return { error: "Task was modified by another user. Please refresh." };
  }

  const data = parsed.data;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
      ...(data.startDate !== undefined
        ? { startDate: data.startDate ? new Date(data.startDate) : null }
        : {}),
      ...(data.endDate !== undefined
        ? { endDate: data.endDate ? new Date(data.endDate) : null }
        : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.percentComplete !== undefined ? { percentComplete: data.percentComplete } : {}),
      version: { increment: 1 },
    },
  });

  await recalculateSchedule(existing.projectId);

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Task",
    entityId: taskId,
  });

  revalidatePath(`/projects/${existing.projectId}`);
  revalidatePath(`/projects/${existing.projectId}/tasks`);
  revalidatePath(`/projects/${existing.projectId}/gantt`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function updateTaskDates(
  taskId: string,
  startDate: string,
  endDate: string
) {
  const { tenantId } = await getTenantDb();
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!task) return { error: "Task not found" };

  await prisma.task.update({
    where: { id: taskId },
    data: {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      version: { increment: 1 },
    },
  });

  await recalculateSchedule(task.projectId);
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/tasks`);
  revalidatePath(`/projects/${task.projectId}/gantt`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const { tenantId, userId } = await getTenantDb();
  const task = await prisma.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!task) return { error: "Task not found" };

  await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  await recalculateSchedule(task.projectId);

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "Task",
    entityId: taskId,
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/tasks`);
  revalidatePath(`/projects/${task.projectId}/gantt`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function createDependency(projectId: string, formData: FormData) {
  const { tenantId } = await getTenantDb();
  const parsed = dependencySchema.safeParse({
    predecessorId: formData.get("predecessorId"),
    successorId: formData.get("successorId"),
    type: formData.get("type") || undefined,
    lag: formData.get("lag") ? Number(formData.get("lag")) : undefined,
  });

  if (!parsed.success) return { error: "Invalid dependency data" };

  const existing = await prisma.taskDependency.findMany({
    where: { projectId, tenantId },
  });

  const wouldCycle = detectCycle(
    [...new Set([...existing.flatMap((d) => [d.predecessorId, d.successorId]), parsed.data.predecessorId, parsed.data.successorId])],
    [
      ...existing.map((d) => ({
        id: d.id,
        predecessorId: d.predecessorId,
        successorId: d.successorId,
        type: d.type,
        lag: d.lag,
      })),
      {
        id: "new",
        predecessorId: parsed.data.predecessorId,
        successorId: parsed.data.successorId,
        type: parsed.data.type ?? "FS",
        lag: parsed.data.lag ?? 0,
      },
    ]
  );

  if (wouldCycle) return { error: "This dependency would create a cycle" };

  await prisma.taskDependency.create({
    data: {
      tenantId,
      projectId,
      predecessorId: parsed.data.predecessorId,
      successorId: parsed.data.successorId,
      type: parsed.data.type ?? "FS",
      lag: parsed.data.lag ?? 0,
    },
  });

  await recalculateSchedule(projectId);
  revalidatePath(`/projects/${projectId}`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function deleteDependency(dependencyId: string) {
  const { tenantId } = await getTenantDb();
  const dep = await prisma.taskDependency.findFirst({
    where: { id: dependencyId, tenantId },
  });
  if (!dep) return { error: "Dependency not found" };

  await prisma.taskDependency.delete({ where: { id: dependencyId } });
  await recalculateSchedule(dep.projectId);
  revalidatePath(`/projects/${dep.projectId}`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function recalculateSchedule(projectId: string) {
  const { tenantId } = await getTenantDb();

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
  });
  if (!project) return;

  const tasks = await prisma.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
  });

  const dependencies = await prisma.taskDependency.findMany({
    where: { projectId, tenantId },
  });

  const scheduleTasks: ScheduleTask[] = tasks.map((t) => ({
    id: t.id,
    name: t.name,
    parentId: t.parentId,
    type: t.type,
    startDate: t.startDate,
    endDate: t.endDate,
    duration: t.duration,
    percentComplete: t.percentComplete,
    sortOrder: t.sortOrder,
  }));

  const scheduleDeps: ScheduleDependency[] = dependencies.map((d) => ({
    id: d.id,
    predecessorId: d.predecessorId,
    successorId: d.successorId,
    type: d.type,
    lag: d.lag,
  }));

  const scheduled = forwardPass(
    scheduleTasks,
    scheduleDeps,
    project.startDate ?? undefined
  );

  let critical = new Set<string>();
  try {
    critical = computeCriticalPath(scheduleTasks, scheduleDeps);
  } catch {
    critical = new Set();
  }

  for (const task of scheduled) {
    await prisma.task.update({
      where: { id: task.id },
      data: {
        startDate: task.startDate,
        endDate: task.endDate,
        duration: task.duration,
        isCritical: critical.has(task.id),
      },
    });
  }

  const ends = scheduled.map((t) => t.endDate).filter(Boolean) as Date[];
  if (ends.length > 0) {
    const projectEnd = new Date(Math.max(...ends.map((d) => d.getTime())));
    await prisma.project.update({
      where: { id: projectId },
      data: { endDate: projectEnd },
    });
  }
}

export async function createBaseline(projectId: string, name: string) {
  const { tenantId, userId } = await getTenantDb();
  const tasks = await prisma.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
  });

  const baseline = await prisma.baseline.create({
    data: {
      tenantId,
      projectId,
      name,
      tasks: {
        create: tasks.map((t) => ({
          taskId: t.id,
          startDate: t.startDate ?? new Date(),
          endDate: t.endDate ?? new Date(),
          duration: t.duration,
          percentComplete: t.percentComplete,
        })),
      },
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Baseline",
    entityId: baseline.id,
    metadata: { name, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
  await invalidateProjectCache(tenantId);
  return { success: true, baselineId: baseline.id };
}

export async function getResources(projectId?: string) {
  const { tenantId } = await getTenantDb();
  return prisma.resource.findMany({
    where: {
      tenantId,
      ...(projectId ? { OR: [{ projectId }, { projectId: null }] } : {}),
    },
    include: {
      _count: { select: { assignments: true } },
      assignments: {
        select: {
          taskId: true,
          task: { select: { name: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createResource(formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || undefined,
    email: formData.get("email") || undefined,
    capacityHrs: formData.get("capacityHrs") ?? undefined,
    costRate: formData.get("costRate") ?? undefined,
    projectId: formData.get("projectId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid resource data" };
  }

  const resource = await prisma.resource.create({
    data: {
      tenantId,
      projectId: parsed.data.projectId,
      name: parsed.data.name,
      type: parsed.data.type ?? "PERSON",
      email: parsed.data.email || undefined,
      capacityHrs: parsed.data.capacityHrs ?? 8,
      costRate: parsed.data.costRate ?? 0,
    },
  });

  if (parsed.data.projectId) {
    revalidatePath(`/projects/${parsed.data.projectId}/resources`);
  }
  revalidatePath("/projects");

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Resource",
    entityId: resource.id,
  });

  await invalidateProjectCache(tenantId);
  return { success: true, resourceId: resource.id };
}

export async function updateResource(resourceId: string, formData: FormData) {
  const { tenantId, userId } = await getTenantDb();
  const parsed = resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || undefined,
    email: formData.get("email") || undefined,
    capacityHrs: formData.get("capacityHrs") ?? undefined,
    costRate: formData.get("costRate") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid resource data" };
  }

  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
  });
  if (!existing) return { error: "Resource not found" };

  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      name: parsed.data.name,
      type: parsed.data.type ?? existing.type,
      email: parsed.data.email || null,
      capacityHrs: parsed.data.capacityHrs ?? existing.capacityHrs,
      costRate: parsed.data.costRate ?? existing.costRate,
    },
  });

  if (existing.projectId) {
    revalidatePath(`/projects/${existing.projectId}/resources`);
  }

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Resource",
    entityId: resourceId,
  });

  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function deleteResource(resourceId: string) {
  const { tenantId, userId } = await getTenantDb();
  const existing = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
    include: { _count: { select: { assignments: true } } },
  });
  if (!existing) return { error: "Resource not found" };

  if (existing._count.assignments > 0) {
    return { error: "Remove task assignments before deleting this resource" };
  }

  await prisma.resource.delete({ where: { id: resourceId } });

  if (existing.projectId) {
    revalidatePath(`/projects/${existing.projectId}/resources`);
  }

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "Resource",
    entityId: resourceId,
  });

  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function assignResource(taskId: string, resourceId: string, units = 100) {
  const { tenantId } = await getTenantDb();
  await prisma.resourceAssignment.upsert({
    where: { taskId_resourceId: { taskId, resourceId } },
    create: { tenantId, taskId, resourceId, units },
    update: { units },
  });
  const task = await prisma.task.findFirst({ where: { id: taskId, tenantId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  await invalidateProjectCache(tenantId);
  return { success: true };
}

export async function syncResourceAssignments(resourceId: string, taskIds: string[]) {
  const { tenantId } = await getTenantDb();
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId },
  });
  if (!resource) return { error: "Resource not found" };

  const validTasks = await prisma.task.findMany({
    where: {
      tenantId,
      deletedAt: null,
      id: { in: taskIds },
      ...(resource.projectId ? { projectId: resource.projectId } : {}),
    },
    select: { id: true },
  });
  const validTaskIds = validTasks.map((task) => task.id);

  await prisma.$transaction([
    prisma.resourceAssignment.deleteMany({
      where: {
        resourceId,
        tenantId,
        ...(validTaskIds.length > 0 ? { taskId: { notIn: validTaskIds } } : {}),
      },
    }),
    ...validTaskIds.map((taskId) =>
      prisma.resourceAssignment.upsert({
        where: { taskId_resourceId: { taskId, resourceId } },
        create: { tenantId, taskId, resourceId, units: 100 },
        update: {},
      })
    ),
  ]);

  if (resource.projectId) {
    revalidatePath(`/projects/${resource.projectId}/resources`);
    revalidatePath(`/projects/${resource.projectId}/tasks`);
  }

  await invalidateProjectCache(tenantId);
  return { success: true };
}
