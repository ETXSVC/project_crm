import { getOpportunities, getPipelineStages } from "@/lib/actions/crm";
import { PipelineBoard } from "@/components/crm/pipeline-board";
import { CreateOpportunityDialog } from "@/components/crm/create-opportunity-dialog";
import { getCrmAccounts } from "@/lib/actions/crm";
import { formatCurrency } from "@/lib/utils";

export default async function OpportunitiesPage() {
  const [opportunities, stages, accounts] = await Promise.all([
    getOpportunities(),
    getPipelineStages(),
    getCrmAccounts(),
  ]);

  const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground">
            Pipeline value: {formatCurrency(totalValue)} · {opportunities.length} open deals
          </p>
        </div>
        <CreateOpportunityDialog accounts={accounts} stages={stages} />
      </div>

      <PipelineBoard
        opportunities={opportunities}
        stages={stages}
      />
    </div>
  );
}
