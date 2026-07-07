import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { getVtigerSetup } from "@/lib/actions/vtiger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VtigerSetupPrompt } from "@/components/crm/vtiger-setup-prompt";

export default async function CrmOverviewPage() {
  const session = await auth();
  const setup = await getVtigerSetup();

  if (!setup.ready || !setup.webUrl) {
    return <VtigerSetupPrompt setup={setup} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Open Vtiger CRM</CardTitle>
          <CardDescription>
            Use the embedded view below or open the full Vtiger interface in a new tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/crm/accounts">Browse accounts</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={setup.webUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Vtiger
              </a>
            </Button>
          </div>
          <iframe
            title="Vtiger CRM"
            src={setup.webUrl}
            className="h-[min(70vh,720px)] w-full rounded-md border bg-background"
          />
        </CardContent>
      </Card>
      {session?.user?.name ? (
        <p className="text-sm text-muted-foreground">Signed in as {session.user.name}</p>
      ) : null}
    </div>
  );
}
