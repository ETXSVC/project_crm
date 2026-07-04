"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gantt,
  Task as GanttTask,
  ViewMode,
  type Dependency as GanttDependency,
  type TaskOrEmpty,
} from "@wamra/gantt-task-react";
import "@/styles/gantt-task-react.css";
import { updateTask, updateTaskDates, deleteTask } from "@/lib/actions/projects";
import { CreateTaskDialog } from "@/components/projects/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Task {
  id: string;
  name: string;
  type: string;
  startDate: Date | null;
  endDate: Date | null;
  duration: number;
  percentComplete: number;
  isCritical: boolean;
  parentId: string | null;
  version: number;
}

interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  type: string;
}

interface ProjectGanttProps {
  projectId: string;
  tasks: Task[];
  dependencies: Dependency[];
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function mapDependencyType(type: string): Pick<GanttDependency, "sourceTarget" | "ownTarget"> {
  switch (type) {
    case "SS":
      return { sourceTarget: "startOfTask", ownTarget: "startOfTask" };
    case "FF":
      return { sourceTarget: "endOfTask", ownTarget: "endOfTask" };
    case "SF":
      return { sourceTarget: "startOfTask", ownTarget: "endOfTask" };
    case "FS":
    default:
      return { sourceTarget: "endOfTask", ownTarget: "startOfTask" };
  }
}

function mapTaskType(type: string): GanttTask["type"] {
  if (type === "MILESTONE") return "milestone";
  if (type === "SUMMARY") return "project";
  return "task";
}

export function ProjectGantt({ projectId, tasks, dependencies }: ProjectGanttProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const [showCritical, setShowCritical] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editType, setEditType] = useState("TASK");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const ganttTasks = useMemo((): GanttTask[] => {
    return tasks
      .filter((t) => t.startDate && t.endDate)
      .map((t, index) => {
        const taskDeps: GanttDependency[] = dependencies
          .filter((d) => d.successorId === t.id)
          .map((d) => ({
            sourceId: d.predecessorId,
            ...mapDependencyType(d.type),
          }));

        const ganttTask: GanttTask = {
          id: t.id,
          name: t.name,
          type: mapTaskType(t.type),
          start: new Date(t.startDate!),
          end: new Date(t.endDate!),
          progress: t.percentComplete,
          displayOrder: index + 1,
          dependencies: taskDeps,
          ...(t.parentId ? { parent: t.parentId } : {}),
          ...(t.isCritical && showCritical
            ? {
                styles: {
                  barBackgroundColor: "#ef4444",
                  barBackgroundSelectedColor: "#dc2626",
                  barProgressColor: "#fca5a5",
                  barProgressSelectedColor: "#f87171",
                },
              }
            : {}),
        };

        return ganttTask;
      });
  }, [tasks, dependencies, showCritical]);

  const openEdit = useCallback(
    (ganttTask: TaskOrEmpty) => {
      if (ganttTask.type === "empty") return;
      const task = taskById.get(ganttTask.id);
      if (!task) return;
      setEditingTask(task);
      setEditType(task.type);
      setError(null);
    },
    [taskById]
  );

  const handleDateChange = useCallback(
    async (task: TaskOrEmpty) => {
      if (task.type === "empty" || !task.start || !task.end) return;
      setError(null);
      const result = await updateTaskDates(
        task.id,
        task.start.toISOString(),
        task.end.toISOString()
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    },
    [router]
  );

  const handleProgressChange = useCallback(
    async (task: GanttTask) => {
      setError(null);
      const formData = new FormData();
      formData.set("percentComplete", String(Math.round(task.progress)));
      const result = await updateTask(task.id, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    },
    [router]
  );

  const handleDelete = useCallback(
    async (tasksToDelete: readonly TaskOrEmpty[]) => {
      const realTasks = tasksToDelete.filter((t) => t.type !== "empty");
      if (realTasks.length === 0) return;
      if (!confirm(`Delete ${realTasks.length === 1 ? "this task" : `${realTasks.length} tasks`}?`)) {
        return;
      }
      setError(null);
      for (const task of realTasks) {
        const result = await deleteTask(task.id);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      router.refresh();
    },
    [router]
  );

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTask) return;
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", editType);
    formData.set("version", String(editingTask.version));

    const result = await updateTask(editingTask.id, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditingTask(null);
    router.refresh();
  }

  if (ganttTasks.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">0 tasks with dates</Badge>
          <CreateTaskDialog
            projectId={projectId}
            tasks={tasks.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No tasks with dates to display. Add tasks with start dates first.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={viewMode === ViewMode.Day ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode(ViewMode.Day)}
        >
          Day
        </Button>
        <Button
          variant={viewMode === ViewMode.Week ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode(ViewMode.Week)}
        >
          Week
        </Button>
        <Button
          variant={viewMode === ViewMode.Month ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode(ViewMode.Month)}
        >
          Month
        </Button>
        <Button
          variant={showCritical ? "default" : "outline"}
          size="sm"
          onClick={() => setShowCritical(!showCritical)}
        >
          Critical Path
        </Button>
        <Badge variant="secondary">{ganttTasks.length} tasks</Badge>
        <div className="ml-auto">
          <CreateTaskDialog
            projectId={projectId}
            tasks={tasks.map((t) => ({ id: t.id, name: t.name }))}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          onEditTaskClick={(task) => openEdit(task)}
          onDoubleClick={(task) => openEdit(task)}
          onDelete={handleDelete}
          distances={{
            columnWidth:
              viewMode === ViewMode.Month ? 120 : viewMode === ViewMode.Week ? 80 : 60,
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Double-click a bar or use the edit/delete buttons in the task list to manage tasks. Drag bars to reschedule.
      </p>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gantt-edit-name">Task Name</Label>
                <Input
                  id="gantt-edit-name"
                  name="name"
                  defaultValue={editingTask.name}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gantt-edit-type">Type</Label>
                  <select
                    id="gantt-edit-type"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="TASK">Task</option>
                    <option value="MILESTONE">Milestone</option>
                    <option value="SUMMARY">Summary</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gantt-edit-duration">Duration (days)</Label>
                  <Input
                    id="gantt-edit-duration"
                    name="duration"
                    type="number"
                    defaultValue={editingTask.duration}
                    min={0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gantt-edit-start">Start Date</Label>
                  <Input
                    id="gantt-edit-start"
                    name="startDate"
                    type="date"
                    defaultValue={toDateInputValue(editingTask.startDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gantt-edit-end">End Date</Label>
                  <Input
                    id="gantt-edit-end"
                    name="endDate"
                    type="date"
                    defaultValue={toDateInputValue(editingTask.endDate)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gantt-edit-progress">% Complete</Label>
                <Input
                  id="gantt-edit-progress"
                  name="percentComplete"
                  type="number"
                  defaultValue={editingTask.percentComplete}
                  min={0}
                  max={100}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Saving..." : "Save Task"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
