"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTransition, useState } from "react";
import { createWorkspaceAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      setError(null);
      const result = await createWorkspaceAction(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.success) {
        await update({
          activeTenantId: result.tenantId,
          activeTenantSlug: result.tenantSlug,
          role: result.role,
        });
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create your company</CardTitle>
          <CardDescription>
            You&apos;re signed in. Name your company to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="tenantName">Company name</Label>
              <Input id="tenantName" name="tenantName" placeholder="Acme Corp" required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creating company..." : "Continue to dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
