"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import {
  VtigerLinkFields,
  appendVtigerLinkFormData,
  type VtigerAccountOption,
  type VtigerContactOption,
} from "@/components/projects/vtiger-link-fields";
import type { ProjectFormData } from "@/lib/projects/project-form-data";

type EditProjectDialogProps = {
  projectId: string;
  project: ProjectFormData;
  accounts: { id: string; name: string }[];
  vtigerAccounts?: VtigerAccountOption[];
  vtigerContacts?: VtigerContactOption[];
  size?: "default" | "sm";
  iconOnly?: boolean;
};

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export function EditProjectDialog({
  projectId,
  project,
  accounts,
  vtigerAccounts = [],
  vtigerContacts = [],
  size = "default",
  iconOnly = false,
}: EditProjectDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(project.status);
  const [crmAccountId, setCrmAccountId] = useState(project.crmAccountId ?? "");
  const [vtigerAccountId, setVtigerAccountId] = useState(project.vtigerAccountId ?? "");
  const [vtigerContactIds, setVtigerContactIds] = useState(project.vtigerContactIds);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("status", status);
    formData.set("crmAccountId", crmAccountId);
    appendVtigerLinkFormData(formData, vtigerAccountId, vtigerContactIds);

    setPending(true);
    setError(null);
    const result = await updateProject(projectId, formData);
    setPending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={iconOnly ? "sm" : size}
          className={iconOnly ? "h-8 w-8 p-0" : undefined}
          aria-label="Edit project"
          title="Edit project"
        >
          <Pencil className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {iconOnly ? null : "Edit project"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Project name</Label>
            <Input id="edit-name" name="name" defaultValue={project.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              name="description"
              defaultValue={project.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start date</Label>
              <Input
                id="edit-startDate"
                name="startDate"
                type="date"
                defaultValue={toDateInputValue(project.startDate)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End date</Label>
              <Input
                id="edit-endDate"
                name="endDate"
                type="date"
                defaultValue={toDateInputValue(project.endDate)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="edit-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-crmAccountId">Local CRM account</Label>
              <Select value={crmAccountId || "none"} onValueChange={(value) => setCrmAccountId(value === "none" ? "" : value)}>
                <SelectTrigger id="edit-crmAccountId">
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <VtigerLinkFields
            vtigerAccounts={vtigerAccounts}
            vtigerContacts={vtigerContacts}
            vtigerAccountId={vtigerAccountId}
            vtigerContactIds={vtigerContactIds}
            onAccountChange={setVtigerAccountId}
            onContactsChange={setVtigerContactIds}
            accountFilterId={vtigerAccountId || null}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
