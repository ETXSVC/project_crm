import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject, getProjectTasks } from "@/lib/actions/projects";
import { TaskList } from "@/components/projects/task-list";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [project, tasks] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId),
  ]);
  if (!project) notFound();

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
            <Link href={`/projects/${projectId}/tasks`} className="font-medium text-primary">
              Tasks
            </Link>
            <Link href={`/projects/${projectId}/gantt`} className="text-muted-foreground hover:text-foreground">
              Gantt
            </Link>
            <Link href={`/projects/${projectId}/resources`} className="text-muted-foreground hover:text-foreground">
              Resources
            </Link>
          </div>
        </div>
        <CreateTaskDialog projectId={projectId} tasks={tasks} />
      </div>

      <TaskList projectId={projectId} tasks={tasks} />
    </div>
  );
}
