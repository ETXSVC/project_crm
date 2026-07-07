import Link from "next/link";
import { auth } from "@/lib/auth";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import { getVtigerAccountOptions, getVtigerContacts } from "@/lib/actions/vtiger-crm";
import { hasPermission } from "@/lib/auth/permissions";
import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";
import { CreateContactDialog } from "@/components/crm/create-contact-dialog";
import { Badge } from "@/components/ui/badge";

export default async function CrmContactsPage() {
  const session = await auth();
  const setup = await getVtigerSetup();
  const canCreate = hasPermission(session?.user.role, "crm:create");

  if (!setup.ready) {
    return <VtigerSetupPrompt setup={setup} />;
  }

  const [contactsResult, accountsResult] = await Promise.all([
    getVtigerContacts(),
    getVtigerAccountOptions(),
  ]);

  if ("error" in contactsResult) {
    return <VtigerSetupPrompt setup={setup} message={contactsResult.error} />;
  }

  const accounts = "accounts" in accountsResult ? accountsResult.accounts : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{contactsResult.contacts.length} contacts</p>
        {canCreate && <CreateContactDialog accounts={accounts} />}
      </div>

      {contactsResult.contacts.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No contacts yet. Create your first contact to get started.
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-12 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Title</div>
            <div className="col-span-2">Phone</div>
            <div className="col-span-2">Account</div>
          </div>
          {contactsResult.contacts.map((contact) => (
            <Link
              key={contact.id}
              href={`/crm/contacts/${contact.id}`}
              className="grid grid-cols-12 gap-4 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/30"
            >
              <div className="col-span-3 font-medium">
                {contact.firstName} {contact.lastName}
              </div>
              <div className="col-span-3 text-muted-foreground">{contact.email ?? "—"}</div>
              <div className="col-span-2 text-muted-foreground">{contact.title ?? "—"}</div>
              <div className="col-span-2 text-muted-foreground">{contact.phone ?? "—"}</div>
              <div className="col-span-2">
                {contact.accountId ? (
                  <Badge variant="outline">{contact.accountName ?? "Linked"}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
