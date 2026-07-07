import Link from "next/link";

import { auth } from "@/lib/auth";

import { getProjects } from "@/lib/actions/projects";

import { getVtigerAccountOptions, getVtigerContactOptions } from "@/lib/actions/vtiger-crm";

import { loadCrmAccountOptions } from "@/lib/projects/queries";

import { isVtigerConfiguredForTenant } from "@/lib/vtiger/config";

import { hasPermission } from "@/lib/auth/permissions";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FolderKanban } from "lucide-react";

import { formatDate } from "@/lib/utils";

import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

import { ProjectActions } from "@/components/projects/project-actions";

import { toProjectFormData } from "@/lib/projects/project-form-data";



const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {

  PLANNING: "secondary",

  ACTIVE: "default",

  ON_HOLD: "warning",

  COMPLETED: "success",

  CANCELLED: "destructive",

};



export default async function ProjectsPage() {

  const session = await auth();

  const canCreateProject = hasPermission(session?.user.role, "project:create");

  const canEditProject = hasPermission(session?.user.role, "project:edit");

  const canDeleteProject = hasPermission(session?.user.role, "project:delete");

  const canViewCrm = hasPermission(session?.user.role, "crm:view");



  const [projects, accounts] = await Promise.all([getProjects(), loadCrmAccountOptions()]);

  const accountOptions = accounts.map((account) => ({ id: account.id, name: account.name }));



  let vtigerAccounts: { id: string; name: string }[] = [];

  let vtigerContacts: { id: string; name: string; accountId: string | null }[] = [];



  const tenantId = session?.user?.activeTenantId;
  const vtigerReady =
    tenantId && canViewCrm ? await isVtigerConfiguredForTenant(tenantId) : false;

  if (vtigerReady) {

    const [vtigerAccountsResult, vtigerContactsResult] = await Promise.all([

      getVtigerAccountOptions(),

      getVtigerContactOptions(),

    ]);

    if ("accounts" in vtigerAccountsResult) vtigerAccounts = vtigerAccountsResult.accounts;

    if ("contacts" in vtigerContactsResult) vtigerContacts = vtigerContactsResult.contacts;

  }



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>

          <p className="text-muted-foreground">Manage your projects and schedules</p>

        </div>

        {canCreateProject && (

          <CreateProjectDialog

            accounts={accounts}

            vtigerAccounts={vtigerAccounts}

            vtigerContacts={vtigerContacts}

          />

        )}

      </div>



      {projects.length === 0 ? (

        <Card>

          <CardContent className="flex flex-col items-center justify-center py-16">

            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />

            <h3 className="text-lg font-medium">No projects yet</h3>

            <p className="mb-4 text-sm text-muted-foreground">

              Create your first project to get started

            </p>

            {canCreateProject && (

              <CreateProjectDialog

                accounts={accounts}

                vtigerAccounts={vtigerAccounts}

                vtigerContacts={vtigerContacts}

              />

            )}

          </CardContent>

        </Card>

      ) : (

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {projects.map((project) => (

            <Card key={project.id} className="relative transition-shadow hover:shadow-md">

              <Link

                href={`/projects/${project.id}`}

                className="absolute inset-0 z-0 rounded-lg"

                aria-label={`Open ${project.name}`}

              />

              <CardHeader className="pb-2">

                <div className="flex items-start justify-between gap-2">

                  <CardTitle className="relative text-lg">{project.name}</CardTitle>

                  <div className="relative z-10 flex items-start gap-2">

                    <Badge variant={statusColors[project.status] ?? "secondary"}>

                      {project.status.replace("_", " ")}

                    </Badge>

                    {(canEditProject || canDeleteProject) && (

                      <ProjectActions

                        projectId={project.id}

                        project={toProjectFormData(project)}

                        accounts={accountOptions}

                        vtigerAccounts={vtigerAccounts}

                        vtigerContacts={vtigerContacts}

                        canEdit={canEditProject}

                        canDelete={canDeleteProject}

                        size="sm"

                        showLabels={false}

                      />

                    )}

                  </div>

                </div>

              </CardHeader>

              <CardContent className="relative">

                {project.description && (

                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">

                    {project.description}

                  </p>

                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">

                  <span>{project._count.tasks} tasks</span>

                  {project.endDate && <span>Due {formatDate(project.endDate)}</span>}

                </div>

                {project.crmAccount && (

                  <p className="mt-2 text-xs text-muted-foreground">

                    Local account: {project.crmAccount.name}

                  </p>

                )}

              </CardContent>

            </Card>

          ))}

        </div>

      )}

    </div>

  );

}

