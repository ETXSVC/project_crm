import { auth } from "@/lib/auth";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import { getVtigerAccounts } from "@/lib/actions/vtiger-crm";
import { hasPermission } from "@/lib/auth/permissions";
import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";
import { AccountList } from "@/components/crm/account-list";
import { CreateAccountDialog } from "@/components/crm/create-account-dialog";

export default async function CrmAccountsPage() {
  const session = await auth();
  const setup = await getVtigerSetup();
  const canCreate = hasPermission(session?.user.role, "crm:create");
  const canEdit = hasPermission(session?.user.role, "crm:edit");
  const canDelete = hasPermission(session?.user.role, "crm:delete");

  if (!setup.ready) {
    return <VtigerSetupPrompt setup={setup} />;
  }

  const result = await getVtigerAccounts();
  if ("error" in result) {
    return <VtigerSetupPrompt setup={setup} message={result.error} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{result.accounts.length} accounts</p>
        {canCreate && <CreateAccountDialog />}
      </div>
      <AccountList accounts={result.accounts} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
