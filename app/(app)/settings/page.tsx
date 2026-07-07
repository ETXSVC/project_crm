import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/actions/settings";
import { getBillingInfo, getStripeSetup } from "@/lib/actions/billing";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import { getMembersAndInvites } from "@/lib/actions/members";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { CalendarSettingsForm } from "@/components/settings/calendar-settings-form";
import { BillingSettingsForm } from "@/components/settings/billing-settings-form";
import { CrmSettingsForm } from "@/components/settings/crm-settings-form";
import { MembersSettingsForm } from "@/components/settings/members-settings-form";
import {
  hasPermission,
  type Permission,
} from "@/lib/auth/permissions";
import type { TenantRole } from "@prisma/client";

function can(role: TenantRole | undefined, permission: Permission) {
  return hasPermission(role, permission);
}

export default async function SettingsPage() {
  const session = await auth();
  const role = session?.user.role;
  const [tenant, billing, stripeSetup, vtigerSetup, membersData] = await Promise.all([
    getSettings(),
    getBillingInfo(),
    getStripeSetup(),
    getVtigerSetup(),
    getMembersAndInvites(),
  ]);

  const canEditWorkspace = can(role, "workspace:manage");
  const canEditBilling = can(role, "billing:manage");
  const canEditVtiger = canEditWorkspace || canEditBilling;
  const canViewMembers = !membersData?.error && can(role, "members:view");
  const canInvite = can(role, "members:invite");
  const canManageMembers = can(role, "members:manage");

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Company not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your company configuration
          {!canEditWorkspace && " (read-only — contact an admin to make changes)"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkspaceSettingsForm
          name={tenant.name}
          slug={tenant.slug}
          logoUrl={tenant.logoUrl}
          memberCount={tenant._count.memberships}
          plan={tenant.plan}
          role={session?.user.role ?? "—"}
          canEdit={canEditWorkspace}
        />

        {canViewMembers && membersData && !membersData.error && (
          <MembersSettingsForm
            members={membersData.members ?? []}
            invitations={(membersData.invitations ?? []).map((invite) => ({
              ...invite,
              expiresAt: new Date(invite.expiresAt),
            }))}
            assignableRoles={membersData.assignableRoles ?? []}
            canInvite={canInvite}
            canManage={canManageMembers}
          />
        )}

        <CrmSettingsForm vtigerSetup={vtigerSetup} canEdit={canEditVtiger} />

        <CalendarSettingsForm
          calendars={tenant.projectCalendars.map((c) => ({
            id: c.id,
            name: c.name,
            workDays: c.workDays,
            hoursPerDay: c.hoursPerDay,
            holidays: c.holidays,
          }))}
          canEdit={canEditWorkspace}
        />

        {billing && (
          <BillingSettingsForm
            billing={billing}
            canEdit={canEditBilling}
            stripeSetup={stripeSetup}
          />
        )}
      </div>
    </div>
  );
}
