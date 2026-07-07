"use server";

/**
 * CRM server actions — per-workspace Vtiger credentials.
 * See docs/VTIGER_INTEGRATION.md.
 */
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { assertPermission } from "@/lib/auth/guards";
import { isVtigerConfiguredForTenant } from "@/lib/vtiger/config";
import {
  vtigerCount,
  vtigerCreateWithOwner,
  vtigerDelete,
  vtigerDescribePicklist,
  vtigerQuery,
  vtigerQueryContactsByAccount,
  vtigerRetrieve,
  vtigerUpdate,
} from "@/lib/vtiger/client";
import { isVtigerRecordNotFound, VtigerApiError } from "@/lib/vtiger/errors";
import { getVtigerSession } from "@/lib/vtiger/session";
import { validateVtigerRecordId } from "@/lib/vtiger/validate";
import {
  mapVtigerAccount,
  mapVtigerContact,
  mapVtigerLead,
  mapVtigerOpportunity,
} from "@/lib/vtiger/mappers";
import type {
  VtigerAccount,
  VtigerContact,
  VtigerCrmStats,
  VtigerLead,
  VtigerOpportunity,
} from "@/lib/vtiger/types";

const CRM_PATHS = ["/crm", "/crm/accounts", "/crm/contacts", "/crm/leads", "/crm/opportunities"];

const VTIGER_NOT_FOUND = "RECORD_NOT_FOUND";

function notConfiguredError(): string {
  return "Vtiger is not configured for this company. An administrator can connect Vtiger in Settings → CRM.";
}

function vtigerError(error: unknown): string {
  if (error instanceof VtigerApiError) {
    return `Vtiger error: ${error.message}`;
  }
  const message = error instanceof Error ? error.message : "Unknown Vtiger error";
  return `Vtiger error: ${message}`;
}

function parseVtigerId(id: string): string | null {
  const result = validateVtigerRecordId(id);
  return result.valid ? result.id : null;
}

function handleVtigerActionError(error: unknown): { error: string } {
  if (isVtigerRecordNotFound(error)) {
    return { error: VTIGER_NOT_FOUND };
  }
  return { error: vtigerError(error) };
}

async function requireCrmView() {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:view");
  if (denied) return { error: denied as string, session: null, tenantId: null };
  if (!(await isVtigerConfiguredForTenant(tenantId))) {
    return { error: notConfiguredError(), session: null, tenantId: null };
  }
  return { error: null, session, tenantId };
}

function revalidateCrm() {
  for (const path of CRM_PATHS) {
    revalidatePath(path);
  }
}

export async function getVtigerAccounts(): Promise<
  { accounts: VtigerAccount[] } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const records = await vtigerQuery(
      gate.tenantId,
      "SELECT id, accountname, industry, website, phone, bill_street, description FROM Accounts ORDER BY accountname ASC LIMIT 100;"
    );
    return { accounts: records.map(mapVtigerAccount) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerAccount(id: string): Promise<
  { account: VtigerAccount; contacts: VtigerContact[] } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  const validId = parseVtigerId(id);
  if (!validId) return { error: "Invalid Vtiger record ID" };

  try {
    const [record, contactRecords] = await Promise.all([
      vtigerRetrieve(gate.tenantId, validId),
      vtigerQueryContactsByAccount(gate.tenantId, validId),
    ]);
    return {
      account: mapVtigerAccount(record),
      contacts: contactRecords.map(mapVtigerContact),
    };
  } catch (error) {
    return handleVtigerActionError(error);
  }
}

export async function createVtigerAccount(formData: FormData) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:create");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required" };

  try {
    const { userId } = await getVtigerSession(tenantId);
    const record = await vtigerCreateWithOwner(
      tenantId,
      "Accounts",
      {
        accountname: name,
        industry: String(formData.get("industry") ?? "").trim() || undefined,
        website: String(formData.get("website") ?? "").trim() || undefined,
        phone: String(formData.get("phone") ?? "").trim() || undefined,
        bill_street: String(formData.get("address") ?? "").trim() || undefined,
        description: String(formData.get("description") ?? "").trim() || undefined,
      },
      userId
    );
    revalidateCrm();
    return { success: true, accountId: String(record.id) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function updateVtigerAccount(id: string, formData: FormData) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:edit");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const validId = parseVtigerId(id);
  if (!validId) return { error: "Invalid Vtiger record ID" };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Company name is required" };

  try {
    await vtigerUpdate(tenantId, {
      id: validId,
      accountname: name,
      industry: String(formData.get("industry") ?? "").trim() || undefined,
      website: String(formData.get("website") ?? "").trim() || undefined,
      phone: String(formData.get("phone") ?? "").trim() || undefined,
      bill_street: String(formData.get("address") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
    });
    revalidateCrm();
    revalidatePath(`/crm/accounts/${validId}`);
    return { success: true };
  } catch (error) {
    return handleVtigerActionError(error);
  }
}

export async function deleteVtigerAccount(id: string) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:delete");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const validId = parseVtigerId(id);
  if (!validId) return { error: "Invalid Vtiger record ID" };

  try {
    await vtigerDelete(tenantId, validId);
    revalidateCrm();
    return { success: true };
  } catch (error) {
    return handleVtigerActionError(error);
  }
}

export async function getVtigerContacts(): Promise<
  { contacts: VtigerContact[] } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const records = await vtigerQuery(
      gate.tenantId,
      "SELECT id, firstname, lastname, email, phone, title, account_id FROM Contacts ORDER BY lastname ASC LIMIT 100;"
    );
    return { contacts: records.map(mapVtigerContact) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerContact(id: string): Promise<
  { contact: VtigerContact } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  const validId = parseVtigerId(id);
  if (!validId) return { error: "Invalid Vtiger record ID" };

  try {
    const record = await vtigerRetrieve(gate.tenantId, validId);
    return { contact: mapVtigerContact(record) };
  } catch (error) {
    return handleVtigerActionError(error);
  }
}

export async function getVtigerContactOptions(): Promise<
  { contacts: { id: string; name: string; accountId: string | null }[] } | { error: string }
> {
  const result = await getVtigerContacts();
  if ("error" in result) return result;
  return {
    contacts: result.contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      accountId: c.accountId,
    })),
  };
}

export async function createVtigerContact(formData: FormData) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:create");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) return { error: "First and last name are required" };

  const accountId = String(formData.get("crmAccountId") ?? "").trim();
  if (accountId && !parseVtigerId(accountId)) {
    return { error: "Invalid Vtiger account ID" };
  }

  try {
    const { userId } = await getVtigerSession(tenantId);
    const record = await vtigerCreateWithOwner(
      tenantId,
      "Contacts",
      {
        firstname: firstName,
        lastname: lastName,
        email: String(formData.get("email") ?? "").trim() || undefined,
        phone: String(formData.get("phone") ?? "").trim() || undefined,
        title: String(formData.get("title") ?? "").trim() || undefined,
        account_id: accountId || undefined,
      },
      userId
    );
    revalidateCrm();
    return { success: true, contactId: String(record.id) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerLeads(): Promise<{ leads: VtigerLead[] } | { error: string }> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const records = await vtigerQuery(
      gate.tenantId,
      "SELECT id, firstname, lastname, email, phone, company, leadsource, leadstatus, description FROM Leads ORDER BY modifiedtime DESC LIMIT 100;"
    );
    return { leads: records.map(mapVtigerLead) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function createVtigerLead(formData: FormData) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:create");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  if (!firstName || !lastName) return { error: "First and last name are required" };

  try {
    const { userId } = await getVtigerSession(tenantId);
    const record = await vtigerCreateWithOwner(
      tenantId,
      "Leads",
      {
        firstname: firstName,
        lastname: lastName,
        email: String(formData.get("email") ?? "").trim() || undefined,
        phone: String(formData.get("phone") ?? "").trim() || undefined,
        company: String(formData.get("company") ?? "").trim() || undefined,
        leadsource: String(formData.get("source") ?? "").trim() || undefined,
        description: String(formData.get("notes") ?? "").trim() || undefined,
      },
      userId
    );
    revalidateCrm();
    return { success: true, leadId: String(record.id) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerOpportunities(): Promise<
  { opportunities: VtigerOpportunity[] } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const records = await vtigerQuery(
      gate.tenantId,
      "SELECT id, potentialname, amount, sales_stage, closingdate, related_to, description FROM Potentials ORDER BY modifiedtime DESC LIMIT 100;"
    );
    return { opportunities: records.map(mapVtigerOpportunity) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerOpportunityStages(): Promise<
  { stages: string[] } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const stages = await vtigerDescribePicklist(gate.tenantId, "Potentials", "sales_stage");
    return { stages };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function createVtigerOpportunity(formData: FormData) {
  const { session, tenantId } = await getTenantDb();
  const denied = assertPermission(session.user.role, "crm:create");
  if (denied) return { error: denied };
  if (!(await isVtigerConfiguredForTenant(tenantId))) return { error: notConfiguredError() };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Deal name is required" };

  const valueRaw = String(formData.get("value") ?? "").trim();
  const accountId = String(formData.get("crmAccountId") ?? "").trim();
  const stage = String(formData.get("stageId") ?? "").trim();
  if (accountId && !parseVtigerId(accountId)) {
    return { error: "Invalid Vtiger account ID" };
  }

  try {
    const { userId } = await getVtigerSession(tenantId);
    const record = await vtigerCreateWithOwner(
      tenantId,
      "Potentials",
      {
        potentialname: name,
        amount: valueRaw ? Number(valueRaw) : undefined,
        sales_stage: stage || undefined,
        related_to: accountId || undefined,
        closingdate: String(formData.get("closeDate") ?? "").trim() || undefined,
        description: String(formData.get("description") ?? "").trim() || undefined,
      },
      userId
    );
    revalidateCrm();
    return { success: true, opportunityId: String(record.id) };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerCrmStats(): Promise<
  { stats: VtigerCrmStats } | { error: string }
> {
  const gate = await requireCrmView();
  if (gate.error || !gate.tenantId) return { error: gate.error! };

  try {
    const [accounts, contacts, leads, opportunities] = await Promise.all([
      vtigerCount(gate.tenantId, "Accounts"),
      vtigerCount(gate.tenantId, "Contacts"),
      vtigerCount(gate.tenantId, "Leads"),
      vtigerCount(gate.tenantId, "Potentials"),
    ]);
    return { stats: { accounts, contacts, leads, opportunities } };
  } catch (error) {
    return { error: vtigerError(error) };
  }
}

export async function getVtigerAccountOptions(): Promise<
  { accounts: { id: string; name: string }[] } | { error: string }
> {
  const result = await getVtigerAccounts();
  if ("error" in result) return result;
  return {
    accounts: result.accounts.map((a) => ({ id: a.id, name: a.name })),
  };
}
