export type VtigerModule = "Accounts" | "Contacts" | "Leads" | "Potentials";

export type VtigerAccount = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
};

export type VtigerContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  accountId: string | null;
  accountName: string | null;
};

export type VtigerLead = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  description: string | null;
};

export type VtigerOpportunity = {
  id: string;
  name: string;
  amount: number | null;
  stage: string | null;
  closeDate: string | null;
  accountId: string | null;
  accountName: string | null;
  description: string | null;
};

export type VtigerCrmStats = {
  accounts: number;
  contacts: number;
  leads: number;
  opportunities: number;
};

export type VtigerRecord = Record<string, string | number | boolean | null | undefined>;
