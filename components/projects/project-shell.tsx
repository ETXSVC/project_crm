import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ProjectActions } from "@/components/projects/project-actions";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { toProjectFormData } from "@/lib/projects/project-form-data";
import type { CrmAccountOption, ProjectShell } from "@/lib/projects/queries";
import type { VtigerAccountOption, VtigerContactOption } from "@/components/projects/vtiger-link-fields";

type ProjectShellProps = {
  projectId: string;
  project: ProjectShell;
  accounts: CrmAccountOption[];
  vtigerAccounts?: VtigerAccountOption[];
  vtigerContacts?: VtigerContactOption[];
  vtigerAccountName?: string | null;
  vtigerContactNames?: { id: string; name: string }[];
  canEdit: boolean;
  canDelete: boolean;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
};

export function ProjectShell({
  projectId,
  project,
  accounts,
  vtigerAccounts = [],
  vtigerContacts = [],
  vtigerAccountName,
  vtigerContactNames = [],
  canEdit,
  canDelete,
  children,
  headerActions,
}: ProjectShellProps) {
  const projectFormData = toProjectFormData(project);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge>{project.status.replace("_", " ")}</Badge>
            </div>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
              {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
              {project.crmAccount && <span>Local account: {project.crmAccount.name}</span>}
              {project.vtigerAccountId && (
                <span>
                  Vtiger account:{" "}
                  <Link
                    href={`/crm/accounts/${project.vtigerAccountId}`}
                    className="text-primary hover:underline"
                  >
                    {vtigerAccountName ?? "View account"}
                  </Link>
                </span>
              )}
            </div>
            {vtigerContactNames.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Vtiger contacts:</span>
                {vtigerContactNames.map((contact) => (
                  <Link key={contact.id} href={`/crm/contacts/${contact.id}`}>
                    <Badge variant="outline" className="hover:bg-muted">
                      {contact.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <ProjectActions
              projectId={projectId}
              project={projectFormData}
              accounts={accounts}
              vtigerAccounts={vtigerAccounts}
              vtigerContacts={vtigerContacts}
              canEdit={canEdit}
              canDelete={canDelete}
              size="sm"
            />
            {headerActions}
          </div>
        </div>
      </div>

      <ProjectTabs projectId={projectId} />
      {children}
    </div>
  );
}
