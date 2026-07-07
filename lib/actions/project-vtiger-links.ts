"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { createAuditLog } from "@/lib/audit";
import { invalidateProjectCache } from "@/lib/cache/invalidate";
import { assertPermission } from "@/lib/auth/guards";
import { isVtigerConfiguredForTenant } from "@/lib/vtiger/config";
import { vtigerRetrieve } from "@/lib/vtiger/client";
import { isVtigerRecordNotFound } from "@/lib/vtiger/errors";
import { mapVtigerAccount, mapVtigerContact } from "@/lib/vtiger/mappers";
import { validateVtigerRecordId } from "@/lib/vtiger/validate";

const PROJECT_PATHS = (projectId: string) => [
  `/projects/${projectId}`,
  `/projects/${projectId}/tasks`,
  `/projects/${projectId}/gantt`,
  `/projects/${projectId}/resources`,
  "/projects",
];

const CRM_PATHS = ["/crm", "/crm/accounts", "/crm/contacts"];

function revalidateProjectLinks(projectId: string, vtigerAccountId?: string | null, vtigerContactId?: string | null) {
  for (const path of PROJECT_PATHS(projectId)) {
    revalidatePath(path);
  }
  for (const path of CRM_PATHS) {
    revalidatePath(path);
  }
  if (vtigerAccountId) {
    revalidatePath(`/crm/accounts/${vtigerAccountId}`);
  }
  if (vtigerContactId) {
    revalidatePath(`/crm/contacts/${vtigerContactId}`);
  }
}

async function requireProjectEdit() {
  const { session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:edit");
  if (denied) return { error: denied as string, session: null };
  return { error: null, session };
}

async function requireProjectView() {
  const { session } = await getTenantDb();
  const denied = assertPermission(session.user.role, "project:view");
  if (denied) return { error: denied as string, session: null };
  return { error: null, session };
}

export type LinkedProjectSummary = {
  id: string;
  name: string;
  status: string;
};

export type ProjectVtigerLinkInfo = {
  vtigerAccountId: string | null;
  vtigerAccountName: string | null;
  contacts: { id: string; vtigerContactId: string; name: string }[];
};

export async function getProjectsByVtigerAccount(
  vtigerAccountId: string
): Promise<{ projects: LinkedProjectSummary[] } | { error: string }> {
  const gate = await requireProjectView();
  if (gate.error) return { error: gate.error };

  const idResult = validateVtigerRecordId(vtigerAccountId);
  if (!idResult.valid) return { error: idResult.error };

  const { db, tenantId } = await getTenantDb();
  const projects = await db.project.findMany({
    where: { tenantId, deletedAt: null, vtigerAccountId: idResult.id },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });
  return { projects };
}

export async function getProjectsByVtigerContact(
  vtigerContactId: string
): Promise<{ projects: LinkedProjectSummary[] } | { error: string }> {
  const gate = await requireProjectView();
  if (gate.error) return { error: gate.error };

  const idResult = validateVtigerRecordId(vtigerContactId);
  if (!idResult.valid) return { error: idResult.error };

  const { db, tenantId } = await getTenantDb();
  const links = await db.projectVtigerContact.findMany({
    where: { tenantId, vtigerContactId: idResult.id },
    select: {
      project: {
        select: { id: true, name: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return { projects: links.map((link) => link.project) };
}

export async function getProjectVtigerLinks(
  projectId: string
): Promise<ProjectVtigerLinkInfo | { error: string }> {
  const gate = await requireProjectView();
  if (gate.error) return { error: gate.error };

  const { db, tenantId } = await getTenantDb();
  const vtigerReady = await isVtigerConfiguredForTenant(tenantId);
  const project = await db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: {
      vtigerAccountId: true,
      vtigerContacts: {
        select: { id: true, vtigerContactId: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!project) return { error: "Project not found" };

  let vtigerAccountName: string | null = null;
  if (project.vtigerAccountId && vtigerReady) {
    try {
      const record = await vtigerRetrieve(tenantId, project.vtigerAccountId);
      vtigerAccountName = mapVtigerAccount(record).name;
    } catch {
      vtigerAccountName = null;
    }
  }

  const contacts: ProjectVtigerLinkInfo["contacts"] = [];
  if (project.vtigerContacts.length > 0 && vtigerReady) {
    for (const link of project.vtigerContacts) {
      let name = link.vtigerContactId;
      try {
        const record = await vtigerRetrieve(tenantId, link.vtigerContactId);
        const mapped = mapVtigerContact(record);
        name = `${mapped.firstName} ${mapped.lastName}`.trim();
      } catch {
        // keep vtiger id as fallback label
      }
      contacts.push({ id: link.id, vtigerContactId: link.vtigerContactId, name });
    }
  } else {
    for (const link of project.vtigerContacts) {
      contacts.push({ id: link.id, vtigerContactId: link.vtigerContactId, name: link.vtigerContactId });
    }
  }

  return {
    vtigerAccountId: project.vtigerAccountId,
    vtigerAccountName,
    contacts,
  };
}

export async function setProjectVtigerAccount(
  projectId: string,
  vtigerAccountId: string | null
): Promise<{ success: true } | { error: string }> {
  const gate = await requireProjectEdit();
  if (gate.error) return { error: gate.error };

  const { db, tenantId, userId } = await getTenantDb();
  const vtigerReady = await isVtigerConfiguredForTenant(tenantId);
  const project = await db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true, vtigerAccountId: true },
  });
  if (!project) return { error: "Project not found" };

  const normalizedId = vtigerAccountId?.trim() || null;
  let resolvedAccountId: string | null = null;
  if (normalizedId) {
    const idResult = validateVtigerRecordId(normalizedId);
    if (!idResult.valid) return { error: idResult.error };
    resolvedAccountId = idResult.id;
  }
  if (resolvedAccountId && vtigerReady) {
    try {
      await vtigerRetrieve(tenantId, resolvedAccountId);
    } catch (error) {
      if (isVtigerRecordNotFound(error)) {
        return { error: "Vtiger account not found" };
      }
      throw error;
    }
  }

  await db.project.update({
    where: { id: projectId },
    data: { vtigerAccountId: resolvedAccountId },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Project",
    entityId: projectId,
    metadata: {
      vtigerAccountId: resolvedAccountId,
      previousVtigerAccountId: project.vtigerAccountId,
    },
  });

  revalidateProjectLinks(projectId, resolvedAccountId, null);
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function linkProjectVtigerContact(
  projectId: string,
  vtigerContactId: string
): Promise<{ success: true } | { error: string }> {
  const gate = await requireProjectEdit();
  if (gate.error) return { error: gate.error };

  const normalizedId = vtigerContactId.trim();
  if (!normalizedId) return { error: "Contact is required" };

  const idResult = validateVtigerRecordId(normalizedId);
  if (!idResult.valid) return { error: idResult.error };

  const { db, tenantId, userId } = await getTenantDb();
  const vtigerReady = await isVtigerConfiguredForTenant(tenantId);
  const project = await db.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return { error: "Project not found" };

  if (vtigerReady) {
    try {
      await vtigerRetrieve(tenantId, idResult.id);
    } catch (error) {
      if (isVtigerRecordNotFound(error)) {
        return { error: "Vtiger contact not found" };
      }
      throw error;
    }
  }

  await db.projectVtigerContact.upsert({
    where: {
      tenantId_projectId_vtigerContactId: {
        tenantId,
        projectId,
        vtigerContactId: idResult.id,
      },
    },
    create: { tenantId, projectId, vtigerContactId: idResult.id },
    update: {},
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Project",
    entityId: projectId,
    metadata: { linkedVtigerContactId: idResult.id },
  });

  revalidateProjectLinks(projectId, null, idResult.id);
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function unlinkProjectVtigerContact(
  projectId: string,
  vtigerContactId: string
): Promise<{ success: true } | { error: string }> {
  const gate = await requireProjectEdit();
  if (gate.error) return { error: gate.error };

  const { db, tenantId, userId } = await getTenantDb();
  const link = await db.projectVtigerContact.findFirst({
    where: { tenantId, projectId, vtigerContactId },
  });
  if (!link) return { error: "Contact link not found" };

  await db.projectVtigerContact.delete({ where: { id: link.id } });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Project",
    entityId: projectId,
    metadata: { unlinkedVtigerContactId: vtigerContactId },
  });

  revalidateProjectLinks(projectId, null, vtigerContactId);
  await invalidateProjectCache(tenantId, projectId);
  return { success: true };
}

export async function getLinkableProjects(): Promise<
  { projects: LinkedProjectSummary[] } | { error: string }
> {
  const gate = await requireProjectView();
  if (gate.error) return { error: gate.error };

  const { db, tenantId } = await getTenantDb();
  const projects = await db.project.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, status: true },
    orderBy: { name: "asc" },
  });
  return { projects };
}
