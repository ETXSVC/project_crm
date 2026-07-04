import { getLeads } from "@/lib/actions/crm";
import { Badge } from "@/components/ui/badge";
import { CreateLeadDialog } from "@/components/crm/create-lead-dialog";
import { LeadActions } from "@/components/crm/lead-actions";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning"> = {
  NEW: "secondary",
  CONTACTED: "default",
  QUALIFIED: "success",
  UNQUALIFIED: "warning",
  CONVERTED: "success",
};

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Track and qualify incoming leads</p>
        </div>
        <CreateLeadDialog />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-7 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div>Name</div>
          <div>Company</div>
          <div>Email</div>
          <div>Source</div>
          <div>Score</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {leads.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No leads yet</div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="grid grid-cols-7 gap-4 border-b px-4 py-3 text-sm last:border-0">
              <div className="font-medium">{lead.firstName} {lead.lastName}</div>
              <div className="text-muted-foreground">{lead.company ?? "—"}</div>
              <div className="text-muted-foreground">{lead.email ?? "—"}</div>
              <div className="text-muted-foreground">{lead.source ?? "—"}</div>
              <div>
                <Badge variant={lead.score >= 50 ? "success" : "secondary"}>{lead.score}</Badge>
              </div>
              <div>
                <Badge variant={statusVariant[lead.status] ?? "secondary"}>{lead.status}</Badge>
              </div>
              <div>
                <LeadActions leadId={lead.id} status={lead.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
