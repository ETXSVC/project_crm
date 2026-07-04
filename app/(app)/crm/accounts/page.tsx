import { getCrmAccounts } from "@/lib/actions/crm";
import { CreateAccountDialog } from "@/components/crm/create-account-dialog";
import { AccountList } from "@/components/crm/account-list";

export default async function CrmAccountsPage() {
  const accounts = await getCrmAccounts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">Manage your customer accounts</p>
        </div>
        <CreateAccountDialog />
      </div>

      <AccountList accounts={accounts} />
    </div>
  );
}
