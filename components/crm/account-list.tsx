"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateCrmAccount, deleteCrmAccount } from "@/lib/actions/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Pencil, Trash2 } from "lucide-react";
import { AccountFormFields, type AccountFormValues } from "@/components/crm/account-form-fields";

interface Account extends AccountFormValues {
  id: string;
  _count: {
    contacts: number;
    opportunities: number;
    projects: number;
  };
}

interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  const router = useRouter();
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEdit(account: Account) {
    setEditAccount(account);
    setError(null);
  }

  function closeEdit() {
    setEditAccount(null);
    setError(null);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editAccount) return;
    setPending(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await updateCrmAccount(editAccount.id, formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    closeEdit();
    router.refresh();
  }

  async function handleDelete(accountId: string, accountName: string) {
    if (!confirm(`Delete account "${accountName}"?`)) return;
    setError(null);
    const result = await deleteCrmAccount(accountId);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        No accounts yet. Create your first account to get started.
      </div>
    );
  }

  return (
    <>
      {error && !editAccount && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div className="col-span-3">Company</div>
          <div className="col-span-2">Industry</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-3">Summary</div>
          <div className="col-span-2"></div>
        </div>
        {accounts.map((account) => (
          <div
            key={account.id}
            className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0"
          >
            <div className="col-span-3">
              <Link
                href={`/crm/accounts/${account.id}`}
                className="font-medium hover:text-primary hover:underline"
              >
                {account.name}
              </Link>
              {account.website && (
                <p className="truncate text-xs text-muted-foreground">{account.website}</p>
              )}
            </div>
            <div className="col-span-2 flex items-center">
              {account.industry ? (
                <Badge variant="secondary">{account.industry}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <div className="col-span-2 flex items-center text-muted-foreground">
              {account.phone ?? "—"}
            </div>
            <div className="col-span-3 flex items-center gap-3 text-muted-foreground">
              <span>{account._count.contacts} contacts</span>
              <span>{account._count.opportunities} deals</span>
              <span>{account._count.projects} projects</span>
            </div>
            <div className="col-span-2 flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openEdit(account)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDelete(account.id, account.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!editAccount} onClose={closeEdit} title="Edit Account">
        {editAccount ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <AccountFormFields idPrefix="edit-account" defaultValues={editAccount} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving..." : "Save Account"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
