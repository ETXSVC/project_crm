"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createResource, syncResourceAssignments } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Plus } from "lucide-react";
import { ResourceFormFields } from "@/components/projects/resource-form-fields";

interface CreateResourceDialogProps {
  projectId: string;
  tasks: { id: string; name: string }[];
}

export function CreateResourceDialog({ projectId, tasks }: CreateResourceDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState("PERSON");
  const [taskIds, setTaskIds] = useState<string[]>([]);

  function resetForm() {
    setType("PERSON");
    setTaskIds([]);
    setError(null);
  }

  function closeModal() {
    setOpen(false);
    resetForm();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("projectId", projectId);
    formData.set("type", type);

    const result = await createResource(formData);
    if (result.error) {
      setPending(false);
      setError(result.error);
      return;
    }

    if (result.resourceId && taskIds.length > 0) {
      const assignResult = await syncResourceAssignments(result.resourceId, taskIds);
      if (assignResult.error) {
        setPending(false);
        setError(assignResult.error);
        return;
      }
    }

    setPending(false);
    closeModal();
    router.refresh();
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Resource
      </Button>

      <Modal open={open} onClose={closeModal} title="Add Resource">
        <form onSubmit={handleSubmit} className="space-y-4">
          <ResourceFormFields
            idPrefix="add-resource"
            type={type}
            onTypeChange={setType}
            tasks={tasks}
            selectedTaskIds={taskIds}
            onTaskToggle={(taskId, checked) =>
              setTaskIds((current) =>
                checked ? [...current, taskId] : current.filter((id) => id !== taskId)
              )
            }
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Adding..." : "Add Resource"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
