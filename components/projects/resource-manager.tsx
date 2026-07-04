"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateResource, deleteResource, syncResourceAssignments } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pencil, Trash2 } from "lucide-react";
import { ResourceFormFields } from "@/components/projects/resource-form-fields";

interface TaskOption {
  id: string;
  name: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  email: string | null;
  capacityHrs: number;
  costRate: number;
  assignments: { taskId: string; task: { name: string } }[];
}

interface ResourceManagerProps {
  resources: Resource[];
  tasks: TaskOption[];
}

export function ResourceManager({ resources, tasks }: ResourceManagerProps) {
  const router = useRouter();
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [editType, setEditType] = useState("PERSON");
  const [editTaskIds, setEditTaskIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(resource: Resource) {
    setEditResource(resource);
    setEditType(resource.type);
    setEditTaskIds(resource.assignments.map((assignment) => assignment.taskId));
    setError(null);
  }

  function closeEdit() {
    setEditResource(null);
    setError(null);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editResource) return;
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", editType);

    const result = await updateResource(editResource.id, formData);
    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }

    const assignResult = await syncResourceAssignments(editResource.id, editTaskIds);
    setPending(false);
    if (assignResult.error) {
      setError(assignResult.error);
      return;
    }

    closeEdit();
    router.refresh();
  }

  async function handleDelete(resourceId: string) {
    if (!confirm("Delete this resource?")) return;
    setError(null);
    const result = await deleteResource(resourceId);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No resources yet. Add your first resource to get started.
      </div>
    );
  }

  return (
    <>
      {error && !editResource && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-5">Name</div>
          <div className="col-span-5">Assigned Tasks</div>
          <div className="col-span-2"></div>
        </div>
        {resources.map((resource) => (
          <div
            key={resource.id}
            className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0"
          >
            <div className="col-span-5 flex items-center gap-2">
              <span className="font-medium">{resource.name}</span>
              <Badge variant="secondary">{resource.type}</Badge>
            </div>
            <div className="col-span-5 flex items-center text-muted-foreground">
              {resource.assignments.length > 0
                ? resource.assignments.map((assignment) => assignment.task.name).join(", ")
                : "None"}
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(resource)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(resource.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editResource} onClose={closeEdit} title="Edit Resource">
        {editResource ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <ResourceFormFields
              idPrefix="edit-resource"
              type={editType}
              onTypeChange={setEditType}
              defaultValues={editResource}
              tasks={tasks}
              selectedTaskIds={editTaskIds}
              onTaskToggle={(taskId, checked) =>
                setEditTaskIds((current) =>
                  checked ? [...current, taskId] : current.filter((id) => id !== taskId)
                )
              }
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving..." : "Save Resource"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
