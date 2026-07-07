"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getLinkableProjects,
  linkProjectVtigerContact,
  setProjectVtigerAccount,
  unlinkProjectVtigerContact,
  type LinkedProjectSummary,
} from "@/lib/actions/project-vtiger-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link2, Unlink } from "lucide-react";

type CrmProjectLinksProps = {
  linkedProjects: LinkedProjectSummary[];
  canEdit: boolean;
  linkType: "account" | "contact";
  vtigerId: string;
};

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  PLANNING: "secondary",
  ACTIVE: "default",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

export function CrmProjectLinks({
  linkedProjects,
  canEdit,
  linkType,
  vtigerId,
}: CrmProjectLinksProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<LinkedProjectSummary[] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const linkableProjects = (projects ?? []).filter(
    (project) => !linkedProjects.some((linked) => linked.id === project.id)
  );

  async function loadProjects() {
    if (projects) return;
    const result = await getLinkableProjects();
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setProjects(result.projects);
  }

  async function handleLink() {
    if (!selectedProjectId) return;
    setPending(true);
    setError(null);

    const result =
      linkType === "account"
        ? await setProjectVtigerAccount(selectedProjectId, vtigerId)
        : await linkProjectVtigerContact(selectedProjectId, vtigerId);

    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    setSelectedProjectId("");
    router.refresh();
  }

  async function handleUnlink(projectId: string) {
    setPending(true);
    setError(null);

    const result =
      linkType === "account"
        ? await setProjectVtigerAccount(projectId, null)
        : await unlinkProjectVtigerContact(projectId, vtigerId);

    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Linked projects ({linkedProjects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects linked yet.</p>
        ) : (
          <ul className="space-y-2">
            {linkedProjects.map((project) => (
              <li
                key={project.id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Link href={`/projects/${project.id}`} className="truncate font-medium hover:underline">
                    {project.name}
                  </Link>
                  <Badge variant={statusColors[project.status] ?? "secondary"}>
                    {project.status.replace("_", " ")}
                  </Badge>
                </div>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleUnlink(project.id)}
                    aria-label={`Unlink ${project.name}`}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canEdit && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Link a project</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                onOpenChange={(open) => {
                  if (open) void loadProjects();
                }}
              >
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {linkableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                disabled={pending || !selectedProjectId}
                onClick={handleLink}
              >
                Link
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
