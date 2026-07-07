"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateWorkspaceSettings } from "@/lib/actions/settings";
import { PLAN_LABELS } from "@/lib/billing/plans";
import type { SubscriptionPlan } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceSettingsFormProps {
  name: string;
  slug: string;
  logoUrl: string | null;
  memberCount: number;
  plan: SubscriptionPlan;
  role: string;
  canEdit: boolean;
}

export function WorkspaceSettingsForm({
  name,
  slug,
  logoUrl,
  memberCount,
  plan,
  role,
  canEdit,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setMessage(null);
    setError(null);
    const result = await updateWorkspaceSettings(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      const nextSlug = formData.get("slug")?.toString();
      if (nextSlug && nextSlug !== slug) {
        await update({ activeTenantSlug: nextSlug });
      }
      setMessage("Company updated");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Company</CardTitle>
            <CardDescription>Company name, URL slug, and branding</CardDescription>
          </div>
          <Badge variant={plan === "PRO" ? "default" : "secondary"}>
            {PLAN_LABELS[plan]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Company name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              disabled={!canEdit}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={slug}
              disabled={!canEdit}
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Lowercase letters, numbers, and hyphens"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs and the company switcher. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              defaultValue={logoUrl ?? ""}
              placeholder="https://..."
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Members:</span> {memberCount}</p>
            <p><span className="font-medium text-foreground">Your role:</span> {role}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          {canEdit && (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save company"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
