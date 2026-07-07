import Link from "next/link";

import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";

import { getVtigerSetup } from "@/lib/actions/vtiger";

import { getVtigerContact } from "@/lib/actions/vtiger-crm";

import { getProjectsByVtigerContact } from "@/lib/actions/project-vtiger-links";

import { hasPermission } from "@/lib/auth/permissions";

import { CrmProjectLinks } from "@/components/crm/crm-project-links";

import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";



export default async function CrmContactDetailPage({

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

    getVtigerContact(id),

    canViewProjects ? getProjectsByVtigerContact(id) : Promise.resolve({ projects: [] }),

  ]);



  if ("error" in result) {

    if (result.error === "RECORD_NOT_FOUND" || result.error === "Invalid Vtiger record ID") {

      notFound();

    }

    return <VtigerSetupPrompt setup={setup} message={result.error} />;

  }



  const { contact } = result;

  const linkedProjects = "projects" in projectsResult ? projectsResult.projects : [];



  return (

    <div className="space-y-6">

      <div>

        <Link href="/crm/contacts" className="text-sm text-muted-foreground hover:text-primary">

          ← Back to contacts

        </Link>

        <h2 className="mt-2 text-2xl font-bold">

          {contact.firstName} {contact.lastName}

        </h2>

        {contact.title && (

          <Badge variant="secondary" className="mt-2">

            {contact.title}

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

              <span className="text-muted-foreground">Email:</span> {contact.email ?? "—"}

            </p>

            <p>

              <span className="text-muted-foreground">Phone:</span> {contact.phone ?? "—"}

            </p>

            <p>

              <span className="text-muted-foreground">Account:</span>{" "}

              {contact.accountId ? (

                <Link href={`/crm/accounts/${contact.accountId}`} className="hover:underline">

                  {contact.accountName ?? "View account"}

                </Link>

              ) : (

                "—"

              )}

            </p>

          </CardContent>

        </Card>

      </div>



      {canViewProjects && (

        <CrmProjectLinks

          linkedProjects={linkedProjects}

          canEdit={canEditProjects}

          linkType="contact"

          vtigerId={id}

        />

      )}

    </div>

  );

}

