export type ProjectFormData = {
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  crmAccountId: string | null;
  vtigerAccountId: string | null;
  vtigerContactIds: string[];
};

export function toProjectFormData(project: {
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  crmAccountId: string | null;
  vtigerAccountId?: string | null;
  vtigerContacts?: { vtigerContactId: string }[];
}): ProjectFormData {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    crmAccountId: project.crmAccountId,
    vtigerAccountId: project.vtigerAccountId ?? null,
    vtigerContactIds: project.vtigerContacts?.map((c) => c.vtigerContactId) ?? [],
  };
}
