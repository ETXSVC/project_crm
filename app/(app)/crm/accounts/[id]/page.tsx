import { notFound } from "next/navigation";
import Link from "next/link";
import { getCrmAccount } from "@/lib/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function CrmAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await getCrmAccount(id);
  if (!account) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/accounts" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Accounts
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{account.name}</h1>
        {account.industry && <Badge className="mt-2">{account.industry}</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {account.website && <p>Website: {account.website}</p>}
            {account.phone && <p>Phone: {account.phone}</p>}
            {account.address && <p>Address: {account.address}</p>}
            {account.description && <p className="text-muted-foreground">{account.description}</p>}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Contacts ({account.contacts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {account.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts</p>
              ) : (
                <div className="space-y-2">
                  {account.contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-muted-foreground">{c.title} · {c.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opportunities ({account.opportunities.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {account.opportunities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities</p>
              ) : (
                <div className="space-y-2">
                  {account.opportunities.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{o.name}</p>
                        <p className="text-xs text-muted-foreground">{o.stage?.name}</p>
                      </div>
                      <span className="font-medium">{formatCurrency(o.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Linked Projects ({account.projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {account.projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No linked projects</p>
              ) : (
                <div className="space-y-2">
                  {account.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                    >
                      <span className="font-medium">{p.name}</span>
                      <Badge>{p.status.replace("_", " ")}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {account.activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activities</p>
              ) : (
                <div className="space-y-3">
                  {account.activities.map((a) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.type} · {formatDate(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
