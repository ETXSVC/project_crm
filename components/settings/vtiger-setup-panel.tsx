"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveVtigerSettings,
  verifyVtigerApiConnection,
  clearVtigerSettings,
} from "@/lib/actions/vtiger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VtigerSetupInfo } from "@/lib/vtiger/setup";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

type VtigerSetupPanelProps = {
  setup: VtigerSetupInfo;
  canEdit: boolean;
};

export function VtigerSetupPanel({ setup, canEdit }: VtigerSetupPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState(setup.baseUrl ?? "");
  const [publicUrl, setPublicUrl] = useState(setup.publicUrl ?? "");
  const [username, setUsername] = useState(setup.username ?? "");
  const [accessKey, setAccessKey] = useState("");

  function buildFormData(): FormData {
    const formData = new FormData();
    formData.set("baseUrl", baseUrl);
    formData.set("publicUrl", publicUrl);
    formData.set("username", username);
    if (accessKey) formData.set("accessKey", accessKey);
    return formData;
  }

  function onSave() {
    startTransition(async () => {
      setSaveMessage(null);
      setVerifyMessage(null);
      const result = await saveVtigerSettings(buildFormData());
      if ("error" in result && result.error) {
        setSaveMessage(result.error);
        return;
      }
      setAccessKey("");
      setSaveMessage("Vtiger settings saved for this company.");
      router.refresh();
    });
  }

  function onVerify() {
    startTransition(async () => {
      setVerifyMessage(null);
      const result = await verifyVtigerApiConnection(buildFormData());
      if ("error" in result && result.error) {
        setVerifyMessage(result.error);
        return;
      }
      if ("success" in result && result.success) {
        setVerifyMessage(
          `Connected to Vtiger ${result.vtigerVersion} (API v${result.version}).`
        );
      }
    });
  }

  function onClear() {
    if (!confirm("Remove Vtiger credentials for this company?")) return;
    startTransition(async () => {
      setSaveMessage(null);
      setVerifyMessage(null);
      const result = await clearVtigerSettings();
      if ("error" in result && result.error) {
        setSaveMessage(result.error);
        return;
      }
      setBaseUrl("");
      setPublicUrl("");
      setUsername("");
      setAccessKey("");
      setSaveMessage("Vtiger credentials removed for this company.");
      router.refresh();
    });
  }

  const checklist = [
    {
      label: "API base URL",
      done: setup.baseUrlConfigured,
      detail: setup.baseUrl ?? "Not configured",
    },
    {
      label: "API username",
      done: setup.usernameConfigured,
      detail: setup.username ?? "Not configured",
    },
    {
      label: "Access key",
      done: setup.accessKeyConfigured,
      detail: setup.maskedAccessKey ?? "Not configured",
    },
  ];

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Vtiger CRM setup</h3>
          <p className="text-sm text-muted-foreground">
            Each company connects to its own Vtiger instance. Credentials are stored server-side
            and never sent back to the browser after save.
          </p>
        </div>
        <Badge variant={setup.ready ? "default" : "secondary"}>
          CRM {setup.ready ? "connected" : "not configured"}
        </Badge>
      </div>

      {setup.usingEnvFallback && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
          <p className="font-medium">Using development env fallback</p>
          <p className="mt-1 text-blue-900/90 dark:text-blue-100/90">
            This company has no saved credentials; the app is using VTIGER_* environment variables
            because VTIGER_SINGLE_TENANT_MODE is enabled. Save company credentials below for
            production multi-tenant isolation.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {checklist.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-muted-foreground break-all">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      {setup.webUrl && (
        <div className="space-y-2">
          <p className="text-sm font-medium">CRM web URL</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">
              {setup.webUrl}
            </code>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={setup.webUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3 w-3" />
                Open Vtiger
              </a>
            </Button>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vtiger-base-url">API base URL</Label>
              <Input
                id="vtiger-base-url"
                name="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://crm.example.com/vtigercrm"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Webservice endpoint base (e.g. http://vtiger in Docker, public URL in production).
              </p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vtiger-public-url">Public URL (optional)</Label>
              <Input
                id="vtiger-public-url"
                name="publicUrl"
                value={publicUrl}
                onChange={(e) => setPublicUrl(e.target.value)}
                placeholder="https://crm.example.com/vtigercrm"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                Browser URL for embed and Open Vtiger when it differs from the API base URL.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vtiger-username">API username</Label>
              <Input
                id="vtiger-username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vtiger-access-key">Access key</Label>
              <Input
                id="vtiger-access-key"
                name="accessKey"
                type="password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder={
                  setup.accessKeyConfigured
                    ? setup.maskedAccessKey ?? "••••••"
                    : "From My Preferences in Vtiger"
                }
                disabled={pending}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to keep the existing key. The full key is never shown after save.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={pending} onClick={onSave}>
              {pending ? "Saving..." : "Save company credentials"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || (!setup.ready && !baseUrl)}
              onClick={onVerify}
            >
              {pending ? "Verifying..." : "Verify connection"}
            </Button>
            {setup.source === "tenant" && (
              <Button type="button" variant="ghost" disabled={pending} onClick={onClear}>
                Remove credentials
              </Button>
            )}
          </div>

          {(saveMessage || verifyMessage) && (
            <p
              className={`text-sm ${
                (saveMessage ?? verifyMessage)?.includes("failed") ||
                (saveMessage ?? verifyMessage)?.includes("error") ||
                (saveMessage ?? verifyMessage)?.includes("required") ||
                (saveMessage ?? verifyMessage)?.includes("Invalid")
                  ? "text-destructive"
                  : "text-green-700"
              }`}
            >
              {saveMessage ?? verifyMessage}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Find the access key under My Preferences in Vtiger. Whitelist this app&apos;s server IP
            on that user if API calls are rejected.
          </p>
        </div>
      )}
    </div>
  );
}
