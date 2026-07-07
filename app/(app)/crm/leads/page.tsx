import { auth } from "@/lib/auth";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import { getVtigerLeads } from "@/lib/actions/vtiger-crm";
import { hasPermission } from "@/lib/auth/permissions";
import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";
import { CreateLeadDialog } from "@/components/crm/create-lead-dialog";
import { Badge } from "@/components/ui/badge";

export default async function CrmLeadsPage() {
  const session = await auth();
  const setup = await getVtigerSetup();
  const canCreate = hasPermission(session?.user.role, "crm:create");

  if (!setup.ready) {
    return <VtigerSetupPrompt setup={setup} />;
  }

  const result = await getVtigerLeads();
  if ("error" in result) {
    return <VtigerSetupPrompt setup={setup} message={result.error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{result.leads.length} leads</p>
        {canCreate && <CreateLeadDialog />}
      </div>

      {result.leads.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No leads yet. Create your first lead to get started.
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Company</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Source</div>
            <div className="col-span-2">Status</div>
          </div>
          {result.leads.map((lead) => (
            <div
              key={lead.id}
              className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0"
            >
              <div className="col-span-3 font-medium">
                {lead.firstName} {lead.lastName}
              </div>
              <div className="col-span-2 text-muted-foreground">{lead.company ?? "—"}</div>
              <div className="col-span-3 text-muted-foreground">{lead.email ?? "—"}</div>
              <div className="col-span-2 text-muted-foreground">{lead.source ?? "—"}</div>
              <div className="col-span-2">
                {lead.status ? <Badge variant="secondary">{lead.status}</Badge> : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
