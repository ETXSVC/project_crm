import { auth } from "@/lib/auth";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import {
  getVtigerAccountOptions,
  getVtigerOpportunities,
  getVtigerOpportunityStages,
} from "@/lib/actions/vtiger-crm";
import { hasPermission } from "@/lib/auth/permissions";
import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";
import { CreateOpportunityDialog } from "@/components/crm/create-opportunity-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function CrmOpportunitiesPage() {
  const session = await auth();
  const setup = await getVtigerSetup();
  const canCreate = hasPermission(session?.user.role, "crm:create");

  if (!setup.ready) {
    return <VtigerSetupPrompt setup={setup} />;
  }

  const [oppsResult, accountsResult, stagesResult] = await Promise.all([
    getVtigerOpportunities(),
    getVtigerAccountOptions(),
    getVtigerOpportunityStages(),
  ]);

  if ("error" in oppsResult) {
    return <VtigerSetupPrompt setup={setup} message={oppsResult.error} />;
  }

  const accounts = "accounts" in accountsResult ? accountsResult.accounts : [];
  const stages = "stages" in stagesResult ? stagesResult.stages : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {oppsResult.opportunities.length} opportunities
        </p>
        {canCreate && <CreateOpportunityDialog accounts={accounts} stages={stages} />}
      </div>

      {oppsResult.opportunities.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No opportunities yet. Create your first deal to get started.
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div className="col-span-3">Deal</div>
            <div className="col-span-2">Stage</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Close Date</div>
            <div className="col-span-3">Account</div>
          </div>
          {oppsResult.opportunities.map((opp) => (
            <div
              key={opp.id}
              className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0"
            >
              <div className="col-span-3 font-medium">{opp.name}</div>
              <div className="col-span-2">
                {opp.stage ? <Badge variant="secondary">{opp.stage}</Badge> : "—"}
              </div>
              <div className="col-span-2 text-muted-foreground">
                {opp.amount != null ? `$${opp.amount.toLocaleString()}` : "—"}
              </div>
              <div className="col-span-2 text-muted-foreground">
                {opp.closeDate ? formatDate(new Date(opp.closeDate)) : "—"}
              </div>
              <div className="col-span-3 text-muted-foreground">{opp.accountName ?? "—"}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
