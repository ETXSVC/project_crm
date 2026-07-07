import { loadGanttData } from "@/lib/projects/queries";
import { ProjectGanttLazy } from "@/components/gantt/project-gantt-lazy";

export default async function ProjectGanttPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { tasks, dependencies } = await loadGanttData(projectId);

  return (
    <ProjectGanttLazy projectId={projectId} tasks={tasks} dependencies={dependencies} />
  );
}
