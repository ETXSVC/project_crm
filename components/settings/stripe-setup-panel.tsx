"use client";

import { useState, useTransition } from "react";
import { verifyStripeConnection } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StripeSetupInfo } from "@/lib/billing/stripe-setup";
import { CheckCircle2, Circle, Copy, ExternalLink } from "lucide-react";

type StripeSetupPanelProps = {
  setup: StripeSetupInfo;
  canEdit: boolean;
};

export function StripeSetupPanel({ setup, canEdit }: StripeSetupPanelProps) {
  const [pending, startTransition] = useTransition();
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(label: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  function onVerify() {
    startTransition(async () => {
      setVerifyMessage(null);
      const result = await verifyStripeConnection();
      if ("error" in result && result.error) {
        setVerifyMessage(result.error);
        return;
      }
      if ("success" in result && result.success) {
        const pricePart = result.priceLabel ? ` Pro price: ${result.priceLabel}.` : "";
        setVerifyMessage(`Connected to Stripe (${result.mode} mode).${pricePart}`);
      }
    });
  }

  const checklist = [
    {
      label: "Secret API key (STRIPE_SECRET_KEY)",
      done: setup.secretKeyConfigured,
      detail: setup.maskedSecretKey ?? "Not configured",
    },
    {
      label: "Pro plan price ID (STRIPE_PRICE_PRO)",
      done: setup.priceIdConfigured,
      detail: setup.priceId ?? "Not configured",
    },
    {
      label: "Webhook signing secret (STRIPE_WEBHOOK_SECRET)",
      done: setup.webhookSecretConfigured,
      detail: setup.webhookSecretConfigured ? "Configured" : "Not configured",
    },
  ];

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Stripe setup</h3>
          <p className="text-sm text-muted-foreground">
            Configure billing via environment variables, then verify the connection.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={setup.readyForCheckout ? "default" : "secondary"}>
            Checkout {setup.readyForCheckout ? "ready" : "inactive"}
          </Badge>
          <Badge variant={setup.readyForWebhooks ? "default" : "secondary"}>
            Webhooks {setup.readyForWebhooks ? "ready" : "inactive"}
          </Badge>
        </div>
      </div>

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
              <p className="text-muted-foreground">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <p className="text-sm font-medium">Webhook endpoint</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all">
            {setup.webhookUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyText("webhook", setup.webhookUrl)}
          >
            <Copy className="mr-1 h-3 w-3" />
            {copied === "webhook" ? "Copied" : "Copy"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          In Stripe Dashboard → Developers → Webhooks, add this URL and listen for{" "}
          <code>checkout.session.completed</code>, <code>customer.subscription.updated</code>, and{" "}
          <code>customer.subscription.deleted</code>.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Environment variables</p>
        <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">{setup.envSnippet}</pre>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copyText("env", setup.envSnippet)}
          >
            <Copy className="mr-1 h-3 w-3" />
            {copied === "env" ? "Copied" : "Copy .env lines"}
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" />
              Stripe Dashboard
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add these to <code>.env</code> (or <code>docker-compose.yml</code>), then restart the app
          container.
        </p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button type="button" disabled={pending || !setup.secretKeyConfigured} onClick={onVerify}>
            {pending ? "Verifying..." : "Verify Stripe connection"}
          </Button>
          {verifyMessage && (
            <p
              className={`text-sm ${verifyMessage.includes("failed") || verifyMessage.includes("not set") ? "text-destructive" : "text-green-700"}`}
            >
              {verifyMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
