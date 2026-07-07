"use client";

import { useState, useTransition } from "react";
import { createBaseline, deleteBaseline } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type BaselineSummary = {
  id: string;
  name: string;
  createdAt: Date;
  taskCount: number;
};

type BaselinesPanelProps = {
  projectId: string;
  baselines: BaselineSummary[];
  canManage: boolean;
};

export function BaselinesPanel({ projectId, baselines, canManage }: BaselinesPanelProps) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      setError(null);
      const result = await createBaseline(projectId, name.trim());
      if (result?.error) {
        setError(result.error);
        return;
      }
      setName("");
    });
  }

  function onDelete(baselineId: string, baselineName: string) {
    if (!confirm(`Delete baseline "${baselineName}"?`)) return;
    startTransition(async () => {
      const result = await deleteBaseline(projectId, baselineId);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baselines</CardTitle>
        <CardDescription>
          Capture schedule snapshots to compare planned vs. actual progress over time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <form onSubmit={onCreate} className="flex flex-wrap gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Baseline name (e.g. Q3 plan)"
              className="max-w-sm"
            />
            <Button type="submit" disabled={pending || !name.trim()}>
              Create baseline
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {baselines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No baselines yet. Create one to snapshot current task dates and progress.
          </p>
        ) : (
          <div className="divide-y rounded-md border">
            {baselines.map((baseline) => (
              <div
                key={baseline.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-medium">{baseline.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(baseline.createdAt)} · {baseline.taskCount} tasks captured
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Snapshot</Badge>
                  {canManage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => onDelete(baseline.id, baseline.name)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
