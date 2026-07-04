"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask, deleteTask } from "@/lib/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

interface Task {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  duration: number;
  percentComplete: number;
  isCritical: boolean;
  version: number;
  assignments: { resource: { name: string } }[];
}

interface TaskListProps {
  projectId: string;
  tasks: Task[];
}

function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function TaskList({ projectId, tasks }: TaskListProps) {
  const router = useRouter();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("TASK");

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    setError(null);
    const result = await deleteTask(taskId);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingTask) return;
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", type);
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

  function openEdit(task: Task) {
    setEditingTask(task);
    setType(task.type);
    setError(null);
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No tasks yet. Add your first task to get started.
      </div>
    );
  }

  return (
    <>
      {error && !editingTask && (
        <p className="mb-2 text-sm text-destructive">{error}</p>
      )}
      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-4">Task Name</div>
          <div className="col-span-2">Start</div>
          <div className="col-span-2">End</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-1"></div>
        </div>
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0 ${
              task.isCritical ? "bg-red-50/50" : ""
            } ${task.parentId ? "pl-8" : ""}`}
          >
            <div className="col-span-4 flex items-center gap-2">
              <span className="font-medium">{task.name}</span>
              {task.type !== "TASK" && (
                <Badge variant="secondary" className="text-xs">
                  {task.type}
                </Badge>
              )}
              {task.isCritical && (
                <Badge variant="destructive" className="text-xs">
                  Critical
                </Badge>
              )}
            </div>
            <div className="col-span-2 flex items-center text-muted-foreground">
              {formatDate(task.startDate)}
            </div>
            <div className="col-span-2 flex items-center text-muted-foreground">
              {formatDate(task.endDate)}
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Progress value={task.percentComplete} className="h-2 flex-1" />
              <span className="w-8 text-xs">{task.percentComplete}%</span>
            </div>
            <div className="col-span-1 flex items-center text-muted-foreground">
              {task.duration}d
            </div>
            <div className="col-span-1 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(task)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Task Name</Label>
                <Input id="edit-name" name="name" defaultValue={editingTask.name} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <select
                    id="edit-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="TASK">Task</option>
                    <option value="MILESTONE">Milestone</option>
                    <option value="SUMMARY">Summary</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duration (days)</Label>
                  <Input
                    id="edit-duration"
                    name="duration"
                    type="number"
                    defaultValue={editingTask.duration}
                    min={0}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-start">Start Date</Label>
                  <Input
                    id="edit-start"
                    name="startDate"
                    type="date"
                    defaultValue={toDateInputValue(editingTask.startDate)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-end">End Date</Label>
                  <Input
                    id="edit-end"
                    name="endDate"
                    type="date"
                    defaultValue={toDateInputValue(editingTask.endDate)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-progress">% Complete</Label>
                <Input
                  id="edit-progress"
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
    </>
  );
}
