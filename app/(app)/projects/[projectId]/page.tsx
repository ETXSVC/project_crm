import { getSession } from "@/lib/db/get-tenant-db";
import { hasPermission } from "@/lib/auth/permissions";
import { loadProjectBaselines } from "@/lib/projects/queries";
import { BaselinesPanel } from "@/components/projects/baselines-panel";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [session, baselines] = await Promise.all([getSession(), loadProjectBaselines(projectId)]);
  const canManageBaselines = hasPermission(session?.user?.role, "project:baseline");

  return (
    <BaselinesPanel
      projectId={projectId}
      baselines={baselines.map((baseline) => ({
        id: baseline.id,
        name: baseline.name,
        createdAt: baseline.createdAt,
        taskCount: baseline._count.tasks,
      }))}
      canManage={canManageBaselines}
    />
  );
}
