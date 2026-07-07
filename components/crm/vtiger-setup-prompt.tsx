import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VtigerSetupInfo } from "@/lib/vtiger/setup";

type VtigerSetupPromptProps = {
  setup: VtigerSetupInfo;
  message?: string;
};

export function VtigerSetupPrompt({ setup, message }: VtigerSetupPromptProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vtiger CRM not configured</CardTitle>
        <CardDescription>
          {message ??
            "An administrator must configure Vtiger API credentials before CRM data is available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>Base URL: {setup.baseUrlConfigured ? setup.baseUrl : "Not set"}</li>
          <li>API user: {setup.usernameConfigured ? setup.username : "Not set"}</li>
          <li>Access key: {setup.accessKeyConfigured ? setup.maskedAccessKey : "Not set"}</li>
        </ul>
        <Button asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Open Settings
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
