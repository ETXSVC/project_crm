import { loadResourcesPageData } from "@/lib/projects/queries";
import { ResourceManager } from "@/components/projects/resource-manager";
import { CreateResourceDialog } from "@/components/projects/create-resource-dialog";

export default async function ProjectResourcesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { resources, tasks } = await loadResourcesPageData(projectId);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CreateResourceDialog projectId={projectId} tasks={tasks} />
      </div>
      <ResourceManager resources={resources} tasks={tasks} />
    </div>
  );
}
