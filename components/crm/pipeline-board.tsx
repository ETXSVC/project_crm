"use client";

import { useRouter } from "next/navigation";
import { updateOpportunityStage } from "@/lib/actions/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Opportunity {
  id: string;
  name: string;
  value: number;
  stageId: string | null;
  crmAccount: { name: string } | null;
}

interface Stage {
  id: string;
  name: string;
  sortOrder: number;
}

interface PipelineBoardProps {
  opportunities: Opportunity[];
  stages: Stage[];
}

export function PipelineBoard({ opportunities, stages }: PipelineBoardProps) {
  const router = useRouter();

  async function handleDrop(opportunityId: string, stageId: string) {
    await updateOpportunityStage(opportunityId, stageId);
    router.refresh();
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => {
        const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
        const stageValue = stageOpps.reduce((sum, o) => sum + o.value, 0);

        return (
          <div key={stage.id} className="min-w-[280px] flex-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>{stage.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {stageOpps.length} · {formatCurrency(stageValue)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    className="cursor-pointer rounded-md border bg-background p-3 shadow-sm transition-shadow hover:shadow-md"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("opportunityId", opp.id)}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <p className="font-medium text-sm">{opp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {opp.crmAccount?.name ?? "No account"}
                    </p>
                    <p className="mt-1 text-sm font-semibold">{formatCurrency(opp.value)}</p>
                  </div>
                ))}
                <div
                  className="min-h-[60px] rounded-md border-2 border-dashed border-muted p-2"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const oppId = e.dataTransfer.getData("opportunityId");
                    if (oppId) handleDrop(oppId, stage.id);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
