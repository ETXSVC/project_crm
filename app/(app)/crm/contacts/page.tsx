import { getContacts } from "@/lib/actions/crm";
import { Card, CardContent } from "@/components/ui/card";
import { CreateContactDialog } from "@/components/crm/create-contact-dialog";
import { getCrmAccounts } from "@/lib/actions/crm";

export default async function ContactsPage() {
  const [contacts, accounts] = await Promise.all([getContacts(), getCrmAccounts()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">People at your customer accounts</p>
        </div>
        <CreateContactDialog accounts={accounts} />
      </div>

      <div className="rounded-lg border">
        <div className="grid grid-cols-5 gap-4 border-b bg-muted/50 px-4 py-3 text-sm font-medium">
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Title</div>
          <div>Account</div>
        </div>
        {contacts.length === 0 ? (
          <CardContent className="py-8 text-center text-muted-foreground">
            No contacts yet
          </CardContent>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="grid grid-cols-5 gap-4 border-b px-4 py-3 text-sm last:border-0">
              <div className="font-medium">{c.firstName} {c.lastName}</div>
              <div className="text-muted-foreground">{c.email ?? "—"}</div>
              <div className="text-muted-foreground">{c.phone ?? "—"}</div>
              <div className="text-muted-foreground">{c.title ?? "—"}</div>
              <div className="text-muted-foreground">{c.crmAccount?.name ?? "—"}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
