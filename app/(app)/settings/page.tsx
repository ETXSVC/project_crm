import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/actions/settings";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { PipelineStagesForm } from "@/components/settings/pipeline-stages-form";
import { CalendarSettingsForm } from "@/components/settings/calendar-settings-form";

const ADMIN_ROLES = ["OWNER", "ADMIN"];

export default async function SettingsPage() {
  const session = await auth();
  const tenant = await getSettings();
  const canEdit = ADMIN_ROLES.includes(session?.user.role ?? "");

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Workspace not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace configuration
          {!canEdit && " (read-only — contact an admin to make changes)"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceSettingsForm
          name={tenant.name}
          slug={tenant.slug}
          logoUrl={tenant.logoUrl}
          memberCount={tenant._count.memberships}
          role={session?.user.role ?? "—"}
          canEdit={canEdit}
        />

        <PipelineStagesForm
          stages={tenant.pipelineStages}
          canEdit={canEdit}
        />

        <CalendarSettingsForm
          calendars={tenant.projectCalendars.map((c) => ({
            id: c.id,
            name: c.name,
            workDays: c.workDays,
            hoursPerDay: c.hoursPerDay,
            holidays: c.holidays,
          }))}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
