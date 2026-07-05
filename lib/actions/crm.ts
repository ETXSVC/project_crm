"use server";

import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { createAuditLog } from "@/lib/audit";
import { cacheGetOrSet } from "@/lib/cache/redis";
import { cacheKeys, CACHE_TTL } from "@/lib/cache/keys";
import { invalidateCrmCache } from "@/lib/cache/invalidate";
import { fetchCrmStats, fetchPipelineStages } from "@/lib/cache/crm-stats";
import { checkPlanLimit } from "@/lib/billing/limits";
import {
  crmAccountSchema,
  contactSchema,
  leadSchema,
  opportunitySchema,
  activitySchema,
} from "@/lib/validations/schemas";

export async function getCrmAccounts() {
  const { db, tenantId } = await getTenantDb();
  return db.crmAccount.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      _count: { select: { contacts: true, opportunities: true, projects: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getCrmAccount(id: string) {
  const { db, tenantId } = await getTenantDb();
  return db.crmAccount.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: {
      contacts: { where: { deletedAt: null } },
      opportunities: {
        where: { deletedAt: null },
        include: { stage: true },
      },
      projects: { where: { deletedAt: null } },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createCrmAccount(formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = crmAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    website: formData.get("website") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) return { error: "Invalid account data" };

  const limitError = await checkPlanLimit(tenantId, "crmAccounts");
  if (limitError) return { error: limitError };

  const account = await db.crmAccount.create({
    data: { tenantId, ...parsed.data },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "CrmAccount",
    entityId: account.id,
    metadata: { name: account.name },
  });

  revalidatePath("/crm/accounts");
  await invalidateCrmCache(tenantId);
  return { success: true, accountId: account.id };
}

export async function updateCrmAccount(id: string, formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = crmAccountSchema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry") || undefined,
    website: formData.get("website") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) return { error: "Invalid account data" };

  await db.crmAccount.update({
    where: { id, tenantId },
    data: parsed.data,
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "CrmAccount",
    entityId: id,
  });

  revalidatePath(`/crm/accounts/${id}`);
  revalidatePath("/crm/accounts");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function deleteCrmAccount(id: string) {
  const { db, tenantId, userId } = await getTenantDb();
  const account = await db.crmAccount.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!account) return { error: "Account not found" };

  await db.crmAccount.update({
    where: { id, tenantId },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "DELETE",
    entityType: "CrmAccount",
    entityId: id,
    metadata: { name: account.name },
  });

  revalidatePath("/crm/accounts");
  revalidatePath(`/crm/accounts/${id}`);
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function getContacts() {
  const { db, tenantId } = await getTenantDb();
  return db.contact.findMany({
    where: { tenantId, deletedAt: null },
    include: { crmAccount: { select: { id: true, name: true } } },
    orderBy: { lastName: "asc" },
  });
}

export async function createContact(formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    title: formData.get("title") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid contact data" };

  const contact = await db.contact.create({
    data: { tenantId, ...parsed.data },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Contact",
    entityId: contact.id,
  });

  revalidatePath("/crm/contacts");
  await invalidateCrmCache(tenantId);
  return { success: true, contactId: contact.id };
}

export async function getLeads() {
  const { db, tenantId } = await getTenantDb();
  return db.lead.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function createLead(formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = leadSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    company: formData.get("company") || undefined,
    source: formData.get("source") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: "Invalid lead data" };

  let score = 0;
  if (parsed.data.email) score += 10;
  if (parsed.data.phone) score += 10;
  if (parsed.data.company) score += 15;

  const lead = await db.lead.create({
    data: { tenantId, ...parsed.data, score },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Lead",
    entityId: lead.id,
  });

  revalidatePath("/crm/leads");
  await invalidateCrmCache(tenantId);
  return { success: true, leadId: lead.id };
}

export async function updateLeadStatus(leadId: string, status: string) {
  const { db, tenantId } = await getTenantDb();
  await db.lead.update({
    where: { id: leadId, tenantId },
    data: { status: status as "NEW" | "CONTACTED" | "QUALIFIED" | "UNQUALIFIED" | "CONVERTED" },
  });
  revalidatePath("/crm/leads");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function convertLeadToOpportunity(leadId: string) {
  const { db, tenantId, userId } = await getTenantDb();
  const lead = await db.lead.findFirst({
    where: { id: leadId, tenantId },
  });
  if (!lead) return { error: "Lead not found" };

  const stage = await db.pipelineStage.findFirst({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
  });

  const opportunity = await db.opportunity.create({
    data: {
      tenantId,
      name: `${lead.firstName} ${lead.lastName} - ${lead.company ?? "Deal"}`,
      crmAccountId: lead.crmAccountId ?? undefined,
      stageId: stage?.id,
      value: 0,
    },
  });

  await db.lead.update({
    where: { id: leadId },
    data: { status: "CONVERTED" },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
    metadata: { convertedFromLead: leadId },
  });

  revalidatePath("/crm/leads");
  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true, opportunityId: opportunity.id };
}

export async function getOpportunities() {
  const { db, tenantId } = await getTenantDb();
  return db.opportunity.findMany({
    where: { tenantId, deletedAt: null, status: "OPEN" },
    include: {
      crmAccount: { select: { id: true, name: true } },
      stage: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPipelineStages() {
  const { db, tenantId } = await getTenantDb();
  return cacheGetOrSet(
    cacheKeys.tenantPipelineStages(tenantId),
    CACHE_TTL.pipelineStages,
    () => fetchPipelineStages(tenantId)
  );
}

export async function createOpportunity(formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = opportunitySchema.safeParse({
    name: formData.get("name"),
    value: formData.get("value") ? Number(formData.get("value")) : undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
    stageId: formData.get("stageId") || undefined,
    closeDate: formData.get("closeDate") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) return { error: "Invalid opportunity data" };

  const opportunity = await db.opportunity.create({
    data: {
      tenantId,
      name: parsed.data.name,
      value: parsed.data.value ?? 0,
      crmAccountId: parsed.data.crmAccountId,
      stageId: parsed.data.stageId,
      closeDate: parsed.data.closeDate ? new Date(parsed.data.closeDate) : undefined,
      description: parsed.data.description,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Opportunity",
    entityId: opportunity.id,
  });

  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true, opportunityId: opportunity.id };
}

export async function updateOpportunityStage(opportunityId: string, stageId: string) {
  const { db, tenantId, userId } = await getTenantDb();
  await db.opportunity.update({
    where: { id: opportunityId, tenantId },
    data: { stageId },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "UPDATE",
    entityType: "Opportunity",
    entityId: opportunityId,
    metadata: { stageId },
  });

  revalidatePath("/crm/opportunities");
  await invalidateCrmCache(tenantId);
  return { success: true };
}

export async function getActivities(filters?: {
  crmAccountId?: string;
  contactId?: string;
  leadId?: string;
  opportunityId?: string;
}) {
  const { db, tenantId } = await getTenantDb();
  return db.activity.findMany({
    where: { tenantId, ...filters },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function createActivity(formData: FormData) {
  const { db, tenantId, userId } = await getTenantDb();
  const parsed = activitySchema.safeParse({
    type: formData.get("type"),
    subject: formData.get("subject"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate") || undefined,
    crmAccountId: formData.get("crmAccountId") || undefined,
    contactId: formData.get("contactId") || undefined,
    leadId: formData.get("leadId") || undefined,
    opportunityId: formData.get("opportunityId") || undefined,
  });

  if (!parsed.success) return { error: "Invalid activity data" };

  const activity = await db.activity.create({
    data: {
      tenantId,
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
  });

  await createAuditLog({
    tenantId,
    userId,
    action: "CREATE",
    entityType: "Activity",
    entityId: activity.id,
  });

  revalidatePath("/crm/activities");
  await invalidateCrmCache(tenantId);
  return { success: true, activityId: activity.id };
}

export async function getCrmStats() {
  const { db, tenantId } = await getTenantDb();
  return cacheGetOrSet(
    cacheKeys.tenantCrmStats(tenantId),
    CACHE_TTL.crmStats,
    () => fetchCrmStats(tenantId)
  );
}
