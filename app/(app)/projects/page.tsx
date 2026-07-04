import Link from "next/link";
import { getProjects } from "@/lib/actions/projects";
import { getCrmAccounts } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderKanban } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PLANNING: "secondary",
  ACTIVE: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export default async function ProjectsPage() {
  const [projects, accounts] = await Promise.all([getProjects(), getCrmAccounts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and schedules</p>
        </div>
        <CreateProjectDialog accounts={accounts} />
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No projects yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first project to get started
            </p>
            <CreateProjectDialog accounts={accounts} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant={statusColors[project.status] ?? "secondary"}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
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
                      Account: {project.crmAccount.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
