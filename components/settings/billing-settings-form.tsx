"use client";

import { useTransition } from "react";
import { createBillingPortalSession, createCheckoutSession } from "@/lib/actions/billing";
import { StripeSetupPanel } from "@/components/settings/stripe-setup-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BillingSummary } from "@/lib/billing/limits";
import type { StripeSetupInfo } from "@/lib/billing/stripe-setup";
import { PLAN_LABELS } from "@/lib/billing/plans";

type BillingSettingsFormProps = {
  billing: BillingSummary;
  canEdit: boolean;
  stripeSetup: StripeSetupInfo;
};

function usagePercent(used: number, max: number | null): number {
  if (max == null || max === 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export function BillingSettingsForm({ billing, canEdit, stripeSetup }: BillingSettingsFormProps) {
  const [pending, startTransition] = useTransition();

  function onUpgrade() {
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (result?.error) alert(result.error);
    });
  }

  function onManage() {
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (result?.error) alert(result.error);
    });
  }

  const isPro = billing.plan === "PRO";

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>Billing & plan</CardTitle>
            <CardDescription>Subscription, usage limits, and Stripe checkout</CardDescription>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>{PLAN_LABELS[billing.plan]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <UsageMeter
            label="Projects"
            used={billing.usage.projects}
            max={billing.limits.maxProjects}
          />
          <UsageMeter
            label="CRM accounts"
            used={billing.usage.crmAccounts}
            max={billing.limits.maxCrmAccounts}
          />
          <UsageMeter
            label="Members"
            used={billing.usage.members}
            max={billing.limits.maxMembers}
          />
        </div>

        <div className="rounded-md border p-4 text-sm text-muted-foreground">
          <p>Status: {billing.subscriptionStatus}</p>
          {billing.currentPeriodEnd && (
            <p>Current period ends: {billing.currentPeriodEnd.toLocaleDateString()}</p>
          )}
        </div>

        <StripeSetupPanel setup={stripeSetup} canEdit={canEdit} />

        {canEdit && (
          <div className="flex flex-wrap gap-3">
            {!isPro && (
              <Button type="button" disabled={pending || !billing.stripeConfigured} onClick={onUpgrade}>
                Upgrade to Pro
              </Button>
            )}
            {billing.hasStripeCustomer && billing.stripeConfigured && (
              <Button type="button" variant="outline" disabled={pending} onClick={onManage}>
                Manage subscription
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const percent = usagePercent(used, max);
  const limitLabel = max == null ? "Unlimited" : String(max);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used} / {limitLabel}
        </span>
      </div>
      {max != null && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
