import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getProject,
  getProjectTasks,
  getProjectDependencies,
} from "@/lib/actions/projects";
import { ProjectGantt } from "@/components/gantt/project-gantt";
import { Badge } from "@/components/ui/badge";

export default async function ProjectGanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, tasks, dependencies] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId),
    getProjectDependencies(projectId),
  ]);
  if (!project) notFound();

  return (
    <div className="space-y-6">
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
          <Link href={`/projects/${projectId}/gantt`} className="font-medium text-primary">
            Gantt
          </Link>
          <Link href={`/projects/${projectId}/resources`} className="text-muted-foreground hover:text-foreground">
            Resources
          </Link>
        </div>
      </div>

      <ProjectGantt
        projectId={projectId}
        tasks={tasks}
        dependencies={dependencies}
      />
    </div>
  );
}
