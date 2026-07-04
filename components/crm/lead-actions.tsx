"use client";

import { useRouter } from "next/navigation";
import { updateLeadStatus, convertLeadToOpportunity } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";

interface LeadActionsProps {
  leadId: string;
  status: string;
}

export function LeadActions({ leadId, status }: LeadActionsProps) {
  const router = useRouter();

  async function handleQualify() {
    await updateLeadStatus(leadId, "QUALIFIED");
    router.refresh();
  }

  async function handleConvert() {
    await convertLeadToOpportunity(leadId);
    router.refresh();
  }

  if (status === "CONVERTED") return null;

  return (
    <div className="flex gap-1">
      {status !== "QUALIFIED" && (
        <Button variant="outline" size="sm" onClick={handleQualify}>
          Qualify
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleConvert}>
        Convert
      </Button>
    </div>
  );
}
