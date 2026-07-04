"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkspaceSettings } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkspaceSettingsFormProps {
  name: string;
  slug: string;
  logoUrl: string | null;
  memberCount: number;
  role: string;
  canEdit: boolean;
}

export function WorkspaceSettingsForm({
  name,
  slug,
  logoUrl,
  memberCount,
  role,
  canEdit,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();
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
      setMessage("Workspace updated");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace</CardTitle>
        <CardDescription>Organization name and branding</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={name}
              disabled={!canEdit}
              required
            />
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
            <p><span className="font-medium text-foreground">Slug:</span> {slug}</p>
            <p><span className="font-medium text-foreground">Members:</span> {memberCount}</p>
            <p><span className="font-medium text-foreground">Your role:</span> {role}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          {canEdit && (
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save workspace"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
