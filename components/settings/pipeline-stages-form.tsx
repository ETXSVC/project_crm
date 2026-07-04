"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Stage {
  id: string;
  name: string;
  probability: number;
  sortOrder: number;
}

interface PipelineStagesFormProps {
  stages: Stage[];
  canEdit: boolean;
}

export function PipelineStagesForm({ stages, canEdit }: PipelineStagesFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setPending("create");
    setError(null);
    const result = await createPipelineStage(formData);
    setPending(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleUpdate(stageId: string, formData: FormData) {
    setPending(stageId);
    setError(null);
    formData.set("sortOrder", formData.get("sortOrder")?.toString() ?? "0");
    const result = await updatePipelineStage(stageId, formData);
    setPending(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleDelete(stageId: string) {
    if (!confirm("Delete this pipeline stage?")) return;
    setPending(stageId);
    setError(null);
    const result = await deletePipelineStage(stageId);
    setPending(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Stages</CardTitle>
        <CardDescription>CRM opportunity stages and win probabilities</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No stages configured</p>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => (
              <form
                key={stage.id}
                action={(fd) => handleUpdate(stage.id, fd)}
                className="flex flex-wrap items-end gap-2 rounded-md border p-3"
              >
                <input type="hidden" name="sortOrder" value={stage.sortOrder} />
                <div className="min-w-[140px] flex-1 space-y-1">
                  <Label className="text-xs">Stage name</Label>
                  <Input name="name" defaultValue={stage.name} disabled={!canEdit} required />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Win %</Label>
                  <Input
                    name="probability"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={stage.probability}
                    disabled={!canEdit}
                    required
                  />
                </div>
                {canEdit && (
                  <>
                    <Button type="submit" size="sm" variant="outline" disabled={pending === stage.id}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(stage.id)}
                      disabled={pending === stage.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </form>
            ))}
          </div>
        )}

        {canEdit && (
          <form action={handleCreate} className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div className="min-w-[140px] flex-1 space-y-1">
              <Label className="text-xs">New stage name</Label>
              <Input name="name" placeholder="e.g. Discovery" required />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-xs">Win %</Label>
              <Input name="probability" type="number" min={0} max={100} defaultValue={10} required />
            </div>
            <Button type="submit" size="sm" disabled={pending === "create"}>
              <Plus className="mr-1 h-4 w-4" />
              Add stage
            </Button>
          </form>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
