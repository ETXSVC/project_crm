import { prisma } from "@/lib/db/prisma";
import {
  getPlanLimits,
  type BillingResource,
  type PlanLimits,
} from "@/lib/billing/plans";
import type { SubscriptionPlan } from "@prisma/client";

export type TenantUsage = {
  projects: number;
  crmAccounts: number;
  members: number;
};

const resourceKeys: Record<BillingResource, keyof PlanLimits> = {
  projects: "maxProjects",
  crmAccounts: "maxCrmAccounts",
  members: "maxMembers",
};

export async function getTenantUsage(tenantId: string): Promise<TenantUsage> {
  const [projects, crmAccounts, members] = await Promise.all([
    prisma.project.count({ where: { tenantId, deletedAt: null } }),
    prisma.crmAccount.count({ where: { tenantId, deletedAt: null } }),
    prisma.tenantMembership.count({ where: { tenantId } }),
  ]);

  return { projects, crmAccounts, members };
}

export async function checkPlanLimit(
  tenantId: string,
  resource: BillingResource
): Promise<string | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, subscriptionStatus: true },
  });

  if (!tenant) {
    return "Company not found";
  }

  if (tenant.subscriptionStatus === "PAST_DUE") {
    return "Your subscription is past due. Update billing to continue.";
  }

  const limits = getPlanLimits(tenant.plan);
  const limitKey = resourceKeys[resource];
  const max = limits[limitKey];

  if (max == null) {
    return null;
  }

  const usage = await getTenantUsage(tenantId);
  const current = usage[resource];

  if (current >= max) {
    return `${resourceLabel(resource)} limit reached (${max} on ${tenant.plan} plan). Upgrade to Pro for unlimited access.`;
  }

  return null;
}

function resourceLabel(resource: BillingResource): string {
  switch (resource) {
    case "projects":
      return "Project";
    case "crmAccounts":
      return "CRM account";
    case "members":
      return "Member";
  }
}

export function formatLimit(value: number | null): string {
  return value == null ? "Unlimited" : String(value);
}

export type BillingSummary = {
  plan: SubscriptionPlan;
  subscriptionStatus: string;
  limits: PlanLimits;
  usage: TenantUsage;
  currentPeriodEnd: Date | null;
  stripeConfigured: boolean;
  hasStripeCustomer: boolean;
};
