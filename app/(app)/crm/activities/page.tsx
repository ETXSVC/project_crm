import { getActivities } from "@/lib/actions/crm";
import { CreateActivityDialog } from "@/components/crm/create-activity-dialog";
import { getCrmAccounts } from "@/lib/actions/crm";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function ActivitiesPage() {
  const [activities, accounts] = await Promise.all([getActivities(), getCrmAccounts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground">Calls, meetings, emails, and notes</p>
        </div>
        <CreateActivityDialog accounts={accounts} />
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-muted-foreground">
            No activities yet
          </div>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="flex items-start gap-4 rounded-lg border p-4">
              <Badge variant="secondary">{a.type}</Badge>
              <div className="flex-1">
                <p className="font-medium">{a.subject}</p>
                {a.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
