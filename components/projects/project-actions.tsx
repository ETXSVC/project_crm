"use client";

import { useRouter } from "next/navigation";
import { deleteProject } from "@/lib/actions/projects";
import { EditProjectDialog } from "@/components/projects/edit-project-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ProjectFormData } from "@/lib/projects/project-form-data";
import type { VtigerAccountOption, VtigerContactOption } from "@/components/projects/vtiger-link-fields";

type ProjectActionsProps = {
  projectId: string;
  project: ProjectFormData;
  accounts: { id: string; name: string }[];
  vtigerAccounts?: VtigerAccountOption[];
  vtigerContacts?: VtigerContactOption[];
  canEdit: boolean;
  canDelete: boolean;
  size?: "default" | "sm";
  showLabels?: boolean;
};

export function ProjectActions({
  projectId,
  project,
  accounts,
  vtigerAccounts = [],
  vtigerContacts = [],
  canEdit,
  canDelete,
  size = "default",
  showLabels = true,
}: ProjectActionsProps) {
  const router = useRouter();

  if (!canEdit && !canDelete) return null;

  async function handleDelete() {
    if (
      !confirm(
        `Delete project "${project.name}"? Tasks, resources, and schedules for this project will be removed.`
      )
    ) {
      return;
    }

    const result = await deleteProject(projectId);
    if (result?.error) {
      alert(result.error);
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="relative z-10 flex flex-wrap items-center gap-2">
      {canEdit && (
        <EditProjectDialog
          projectId={projectId}
          project={project}
          accounts={accounts}
          vtigerAccounts={vtigerAccounts}
          vtigerContacts={vtigerContacts}
          size={showLabels ? size : "sm"}
          iconOnly={!showLabels}
        />
      )}
      {canDelete && (
        <Button
          type="button"
          variant="outline"
          size={showLabels ? size : "sm"}
          className={showLabels ? "text-destructive hover:text-destructive" : "h-8 w-8 p-0 text-destructive hover:text-destructive"}
          onClick={handleDelete}
          aria-label={`Delete ${project.name}`}
          title="Delete project"
        >
          <Trash2 className={showLabels ? "mr-2 h-4 w-4" : "h-4 w-4"} />
          {showLabels ? "Delete" : null}
        </Button>
      )}
    </div>
  );
}
