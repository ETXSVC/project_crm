import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export type PlanLimits = {
  maxProjects: number | null;
  maxCrmAccounts: number | null;
  maxMembers: number | null;
};

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    maxProjects: 5,
    maxCrmAccounts: 25,
    maxMembers: 5,
  },
  PRO: {
    maxProjects: null,
    maxCrmAccounts: null,
    maxMembers: null,
  },
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  FREE: "Free",
  PRO: "Pro",
};

export type BillingResource = "projects" | "crmAccounts" | "members";

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function isPaidPlan(plan: SubscriptionPlan): boolean {
  return plan !== "FREE";
}

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === "ACTIVE" || status === "TRIALING";
}

export function resolvePlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return "FREE";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "PRO";
  return "FREE";
}
