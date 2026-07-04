import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getResources, getProjectTasks } from "@/lib/actions/projects";
import { Badge } from "@/components/ui/badge";
import { ResourceManager } from "@/components/projects/resource-manager";
import { CreateResourceDialog } from "@/components/projects/create-resource-dialog";

export default async function ProjectResourcesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, resources, tasks] = await Promise.all([
    getProject(projectId),
    getResources(projectId),
    getProjectTasks(projectId),
  ]);
  if (!project) notFound();

  const taskOptions = tasks.map((task) => ({ id: task.id, name: task.name }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
              ←
            </Link>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge>{project.status.replace("_", " ")}</Badge>
          </div>
          <div className="mt-1 flex gap-4 text-sm">
            <Link href={`/projects/${projectId}/tasks`} className="text-muted-foreground hover:text-foreground">
              Tasks
            </Link>
            <Link href={`/projects/${projectId}/gantt`} className="text-muted-foreground hover:text-foreground">
              Gantt
            </Link>
            <Link href={`/projects/${projectId}/resources`} className="font-medium text-primary">
              Resources
            </Link>
          </div>
        </div>
        <CreateResourceDialog projectId={projectId} tasks={taskOptions} />
      </div>

      <ResourceManager resources={resources} tasks={taskOptions} />
    </div>
  );
}
