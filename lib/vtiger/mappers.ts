import type {
  VtigerAccount,
  VtigerContact,
  VtigerLead,
  VtigerOpportunity,
  VtigerRecord,
} from "@/lib/vtiger/types";

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function mapVtigerAccount(record: VtigerRecord): VtigerAccount {
  return {
    id: String(record.id),
    name: String(record.accountname ?? record.label ?? "Unnamed"),
    industry: str(record.industry),
    website: str(record.website),
    phone: str(record.phone),
    address: str(record.bill_street),
    description: str(record.description),
  };
}

export function mapVtigerContact(record: VtigerRecord): VtigerContact {
  return {
    id: String(record.id),
    firstName: String(record.firstname ?? ""),
    lastName: String(record.lastname ?? ""),
    email: str(record.email),
    phone: str(record.phone),
    title: str(record.title),
    accountId: str(record.account_id),
    accountName: str(record.account_name),
  };
}

export function mapVtigerLead(record: VtigerRecord): VtigerLead {
  return {
    id: String(record.id),
    firstName: String(record.firstname ?? ""),
    lastName: String(record.lastname ?? ""),
    email: str(record.email),
    phone: str(record.phone),
    company: str(record.company),
    source: str(record.leadsource),
    status: str(record.leadstatus),
    description: str(record.description),
  };
}

export function mapVtigerOpportunity(record: VtigerRecord): VtigerOpportunity {
  return {
    id: String(record.id),
    name: String(record.potentialname ?? record.label ?? "Unnamed"),
    amount: num(record.amount),
    stage: str(record.sales_stage),
    closeDate: str(record.closingdate),
    accountId: str(record.related_to),
    accountName: str(record.related_to_name),
    description: str(record.description),
  };
}
