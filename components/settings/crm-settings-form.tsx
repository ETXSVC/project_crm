import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VtigerSetupPanel } from "@/components/settings/vtiger-setup-panel";
import type { VtigerSetupInfo } from "@/lib/vtiger/setup";

type CrmSettingsFormProps = {
  vtigerSetup: VtigerSetupInfo;
  canEdit: boolean;
};

export function CrmSettingsForm({ vtigerSetup, canEdit }: CrmSettingsFormProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>CRM (Vtiger)</CardTitle>
        <CardDescription>
          Connect this company to its own Vtiger open source instance for accounts, contacts,
          leads, and opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VtigerSetupPanel setup={vtigerSetup} canEdit={canEdit} />
      </CardContent>
    </Card>
  );
}
