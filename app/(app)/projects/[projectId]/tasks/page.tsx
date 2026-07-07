import { loadProjectTasks } from "@/lib/projects/queries";
import { TaskList } from "@/components/projects/task-list";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const tasks = await loadProjectTasks(projectId);
  const taskOptions = tasks.map((task) => ({ id: task.id, name: task.name }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateTaskDialog projectId={projectId} tasks={taskOptions} />
      </div>
      <TaskList projectId={projectId} tasks={tasks} />
    </div>
  );
}
