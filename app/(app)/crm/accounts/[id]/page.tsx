import Link from "next/link";

import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";

import { getVtigerSetup } from "@/lib/actions/vtiger";

import { getVtigerAccount } from "@/lib/actions/vtiger-crm";

import { getProjectsByVtigerAccount } from "@/lib/actions/project-vtiger-links";

import { hasPermission } from "@/lib/auth/permissions";

import { CrmProjectLinks } from "@/components/crm/crm-project-links";

import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



export default async function CrmAccountDetailPage({

  params,

}: {

  params: Promise<{ id: string }>;

}) {

  const { id } = await params;

  const session = await auth();

  const setup = await getVtigerSetup();

  const canEditProjects = hasPermission(session?.user.role, "project:edit");

  const canViewProjects = hasPermission(session?.user.role, "project:view");



  if (!setup.ready) {

    return <VtigerSetupPrompt setup={setup} />;

  }



  const [result, projectsResult] = await Promise.all([

    getVtigerAccount(id),

    canViewProjects ? getProjectsByVtigerAccount(id) : Promise.resolve({ projects: [] }),

  ]);



  if ("error" in result) {

    if (result.error === "RECORD_NOT_FOUND" || result.error === "Invalid Vtiger record ID") {

      notFound();

    }

    return <VtigerSetupPrompt setup={setup} message={result.error} />;

  }



  const { account, contacts } = result;

  const linkedProjects = "projects" in projectsResult ? projectsResult.projects : [];



  return (

    <div className="space-y-6">

      <div>

        <Link href="/crm/accounts" className="text-sm text-muted-foreground hover:text-primary">

          ← Back to accounts

        </Link>

        <h2 className="mt-2 text-2xl font-bold">{account.name}</h2>

        {account.industry && (

          <Badge variant="secondary" className="mt-2">

            {account.industry}

          </Badge>

        )}

      </div>



      <div className="grid gap-4 md:grid-cols-2">

        <Card>

          <CardHeader>

            <CardTitle className="text-base">Details</CardTitle>

          </CardHeader>

          <CardContent className="space-y-2 text-sm">

            <p>

              <span className="text-muted-foreground">Phone:</span> {account.phone ?? "—"}

            </p>

            <p>

              <span className="text-muted-foreground">Website:</span>{" "}

              {account.website ? (

                <a href={account.website} target="_blank" rel="noreferrer" className="hover:underline">

                  {account.website}

                </a>

              ) : (

                "—"

              )}

            </p>

            <p>

              <span className="text-muted-foreground">Address:</span> {account.address ?? "—"}

            </p>

            {account.description && (

              <p className="pt-2 text-muted-foreground">{account.description}</p>

            )}

          </CardContent>

        </Card>



        <Card>

          <CardHeader>

            <CardTitle className="text-base">Contacts ({contacts.length})</CardTitle>

          </CardHeader>

          <CardContent>

            {contacts.length === 0 ? (

              <p className="text-sm text-muted-foreground">No contacts linked to this account.</p>

            ) : (

              <ul className="space-y-2 text-sm">

                {contacts.map((contact) => (

                  <li key={contact.id}>

                    <Link href={`/crm/contacts/${contact.id}`} className="font-medium hover:underline">

                      {contact.firstName} {contact.lastName}

                    </Link>

                    {contact.email && (

                      <span className="text-muted-foreground"> · {contact.email}</span>

                    )}

                  </li>

                ))}

              </ul>

            )}

          </CardContent>

        </Card>

      </div>



      {canViewProjects && (

        <CrmProjectLinks

          linkedProjects={linkedProjects}

          canEdit={canEditProjects}

          linkType="account"

          vtigerId={id}

        />

      )}

    </div>

  );

}

