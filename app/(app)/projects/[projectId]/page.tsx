import { notFound } from "next/navigation";
import Link from "next/link";
import { getProject } from "@/lib/actions/projects";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  const tabs = [
    { href: `/projects/${projectId}/tasks`, label: "Tasks" },
    { href: `/projects/${projectId}/gantt`, label: "Gantt" },
    { href: `/projects/${projectId}/resources`, label: "Resources" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge>{project.status.replace("_", " ")}</Badge>
          </div>
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            {project.startDate && <span>Start: {formatDate(project.startDate)}</span>}
            {project.endDate && <span>End: {formatDate(project.endDate)}</span>}
            {project.crmAccount && <span>Account: {project.crmAccount.name}</span>}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border p-6 text-center text-muted-foreground">
        Select a tab above to view project details
      </div>
    </div>
  );
}
