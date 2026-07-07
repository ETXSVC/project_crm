"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { createAuditLog } from "@/lib/audit";
import { invalidateProjectCache } from "@/lib/cache/invalidate";
import { checkPlanLimit } from "@/lib/billing/limits";
import { assertPermission } from "@/lib/auth/guards";
import { projectSchema, taskSchema, taskUpdateSchema, dependencySchema, resourceSchema } from "@/lib/validations/schemas";
import {
  forwardPass,
  detectCycle,
  computeCriticalPath,
  type ScheduleTask,
  type ScheduleDependency,
} from "@/lib/scheduling/engine";

export async function getProjects() {
  const { db, tenantId } = await getTenantDb();
  return db.project.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      crmAccount: { select: { id: true, name: true } },
      vtigerContacts: { select: { vtigerContactId: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getProject(projectId: string) {
  const { db, tenantId } = await getTenantDb();
  return db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      crmAccount: true,
      vtigerContacts: { select: { vtigerContactId: true } },
      calendar: true,
      milestones: { orderBy: { date: "asc" } },
      baselines: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { tasks: true } } },
      },
    },
  });
}

export async function createProject(formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:create");
  if (denied) return { error: denied };
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
    vtigerAccountId: formData.get("vtigerAccountId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid project data" };

  const limitError = await checkPlanLimit(tenantId, "projects");
  if (limitError) return { error: limitError };

  const calendar = await db.projectCalendar.findFirst({
    where: { tenantId },
  });

  const project = await db.project.create({
    data: {
      tenantId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status ?? "PLANNING",
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      crmAccountId: parsed.data.crmAccountId || undefined,
      vtigerAccountId: parsed.data.vtigerAccountId || undefined,
      calendarId: calendar?.id,
    },
  });

  const vtigerContactIds = formData.getAll("vtigerContactIds").map(String).filter(Boolean);
  if (vtigerContactIds.length > 0) {
    await db.projectVtigerContact.createMany({
      data: vtigerContactIds.map((vtigerContactId) => ({
        tenantId,
        projectId: project.id,
        vtigerContactId,
      })),
      skipDuplicates: true,
    });
  }

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Project",
    entityId: project.id,
    metadata: { name: project.name },
  });

  revalidatePath("/projects");
  await invalidateProjectCache(tenantId, project.id);
  return { success: true, projectId: project.id };
}

export async function updateProject(projectId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:edit");
  if (denied) return { error: denied };
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
    vtigerAccountId: formData.get("vtigerAccountId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid project data" };

  await db.project.update({
    where: { id: projectId, tenantId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      crmAccountId: parsed.data.crmAccountId || null,
      vtigerAccountId: parsed.data.vtigerAccountId || null,
    },
  });

  if (formData.has("vtigerContactIds")) {
    const vtigerContactIds = formData.getAll("vtigerContactIds").map(String).filter(Boolean);
    await db.$transaction([
      db.projectVtigerContact.deleteMany({
        where: {
          tenantId,
          projectId,
          ...(vtigerContactIds.length > 0 ? { vtigerContactId: { notIn: vtigerContactIds } } : {}),
        },
      }),
      ...vtigerContactIds.map((vtigerContactId) =>
        db.projectVtigerContact.upsert({
          where: {
            tenantId_projectId_vtigerContactId: { tenantId, projectId, vtigerContactId },
          },
          create: { tenantId, projectId, vtigerContactId },
          update: {},
        })
      ),
    ]);
  }

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Project",
    entityId: projectId,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks`);
  revalidatePath(`/projects/${projectId}/gantt`);
  revalidatePath(`/projects/${projectId}/resources`);
  revalidatePath("/projects");
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function deleteProject(projectId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:delete");
  if (denied) return { error: denied };
  await db.project.update({
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
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function getProjectTasks(projectId: string) {
  const { db, tenantId } = await getTenantDb();
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

export async function getProjectDependencies(projectId: string) {
  const { db, tenantId } = await getTenantDb();
  return db.taskDependency.findMany({
    where: { projectId, tenantId },
  });
}

export async function createTask(projectId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
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

  const maxOrder = await db.task.aggregate({
    where: { projectId, tenantId },
    _max: { sortOrder: true },
  });

  try {
    const task = await db.task.create({
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
    await invalidateProjectCache(tenantId, projectId);
    return { success: true, taskId: task.id };
  } catch (e) {
    console.error("createTask error:", e);
    return { error: "Failed to create task" };
  }
}

export async function updateTask(taskId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
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

  const existing = await db.task.findFirst({
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

  await db.task.update({
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
  await invalidateProjectCache(tenantId, existing.projectId);
  return { success: true };
}

export async function updateTaskDates(
  taskId: string,
  startDate: string,
  endDate: string
) {
  const { db, tenantId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
  const task = await db.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!task) return { error: "Task not found" };

  await db.task.update({
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
  await invalidateProjectCache(tenantId, task.projectId);
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
  const task = await db.task.findFirst({
    where: { id: taskId, tenantId },
  });
  if (!task) return { error: "Task not found" };

  await db.task.update({
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
  await invalidateProjectCache(tenantId, task.projectId);
  return { success: true };
}

export async function createDependency(projectId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
  const parsed = dependencySchema.safeParse({
    predecessorId: formData.get("predecessorId"),
    successorId: formData.get("successorId"),
    type: formData.get("type") || undefined,
    lag: formData.get("lag") ? Number(formData.get("lag")) : undefined,
  });

  if (!parsed.success) return { error: "Invalid dependency data" };

  const existing = await db.taskDependency.findMany({
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

  await db.taskDependency.create({
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
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function deleteDependency(dependencyId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:schedule");
  if (denied) return { error: denied };
  const dep = await db.taskDependency.findFirst({
    where: { id: dependencyId, tenantId },
  });
  if (!dep) return { error: "Dependency not found" };

  await db.taskDependency.delete({ where: { id: dependencyId } });
  await recalculateSchedule(dep.projectId);
  revalidatePath(`/projects/${dep.projectId}`);
  await invalidateProjectCache(tenantId, dep.projectId);
  return { success: true };
}

export async function recalculateSchedule(projectId: string) {
  const { db, tenantId } = await getTenantDb();

  const project = await db.project.findFirst({
    where: { id: projectId, tenantId },
  });
  if (!project) return;

  const tasks = await db.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
  });

  const dependencies = await db.taskDependency.findMany({
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
    await db.task.update({
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
    await db.project.update({
      where: { id: projectId },
      data: { endDate: projectEnd },
    });
  }
}

export async function createBaseline(projectId: string, name: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:baseline");
  if (denied) return { error: denied };

  if (!name.trim()) return { error: "Baseline name is required" };
  const tasks = await db.task.findMany({
    where: { projectId, tenantId, deletedAt: null },
  });

  const baseline = await db.baseline.create({
    data: {
      tenantId,
      projectId,
      name: name.trim(),
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
  await invalidateProjectCache(tenantId, projectId);
  return { success: true, baselineId: baseline.id };
}

export async function deleteBaseline(projectId: string, baselineId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:baseline");
  if (denied) return { error: denied };

  const baseline = await db.baseline.findFirst({
    where: { id: baselineId, projectId, tenantId },
  });
  if (!baseline) return { error: "Baseline not found" };

  await db.baseline.delete({ where: { id: baselineId } });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "Baseline",
    entityId: baselineId,
    metadata: { name: baseline.name, projectId },
  });

  revalidatePath(`/projects/${projectId}`);
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function getResources(projectId?: string) {
  const { db, tenantId } = await getTenantDb();
  return db.resource.findMany({
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
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:resources");
  if (denied) return { error: denied };
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

  const resource = await db.resource.create({
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

  await invalidateProjectCache(tenantId, parsed.data.projectId ?? undefined);
  return { success: true, resourceId: resource.id };
}

export async function updateResource(resourceId: string, formData: FormData) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:resources");
  if (denied) return { error: denied };
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

  const existing = await db.resource.findFirst({
    where: { id: resourceId, tenantId },
  });
  if (!existing) return { error: "Resource not found" };

  await db.resource.update({
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

  await invalidateProjectCache(tenantId, existing.projectId ?? undefined);
  return { success: true };
}

export async function deleteResource(resourceId: string) {
  const { db, tenantId, userId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:resources");
  if (denied) return { error: denied };
  const existing = await db.resource.findFirst({
    where: { id: resourceId, tenantId },
    include: { _count: { select: { assignments: true } } },
  });
  if (!existing) return { error: "Resource not found" };

  if (existing._count.assignments > 0) {
    return { error: "Remove task assignments before deleting this resource" };
  }

  await db.resource.delete({ where: { id: resourceId } });

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

  await invalidateProjectCache(tenantId, existing.projectId ?? undefined);
  return { success: true };
}

export async function assignResource(taskId: string, resourceId: string, units = 100) {
  const { db, tenantId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:resources");
  if (denied) return { error: denied };
  await db.resourceAssignment.upsert({
    where: { taskId_resourceId: { taskId, resourceId } },
    create: { tenantId, taskId, resourceId, units },
    update: { units },
  });
  const task = await db.task.findFirst({ where: { id: taskId, tenantId } });
  if (task) revalidatePath(`/projects/${task.projectId}`);
  await invalidateProjectCache(tenantId, task?.projectId);
  return { success: true };
}

export async function syncResourceAssignments(resourceId: string, taskIds: string[]) {
  const { db, tenantId, session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:resources");
  if (denied) return { error: denied };
  const resource = await db.resource.findFirst({
    where: { id: resourceId, tenantId },
  });
  if (!resource) return { error: "Resource not found" };

  const validTasks = await db.task.findMany({
    where: {
      tenantId,
      deletedAt: null,
      id: { in: taskIds },
      ...(resource.projectId ? { projectId: resource.projectId } : {}),
    },
    select: { id: true },
  });
  const validTaskIds = validTasks.map((task) => task.id);

  await db.$transaction([
    db.resourceAssignment.deleteMany({
      where: {
        resourceId,
        tenantId,
        ...(validTaskIds.length > 0 ? { taskId: { notIn: validTaskIds } } : {}),
      },
    }),
    ...validTaskIds.map((taskId) =>
      db.resourceAssignment.upsert({
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

  await invalidateProjectCache(tenantId, resource.projectId ?? undefined);
  return { success: true };
}
