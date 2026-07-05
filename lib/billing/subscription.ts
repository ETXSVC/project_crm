import { prisma } from "@/lib/db/prisma";
import { resolvePlanFromPriceId } from "@/lib/billing/plans";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import type Stripe from "stripe";

function mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "unpaid":
      return "CANCELED";
    default:
      return "INCOMPLETE";
  }
}

export async function applySubscriptionToTenant(params: {
  tenantId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: Stripe.Subscription.Status;
  currentPeriodEnd: Date | null;
}) {
  const plan: SubscriptionPlan =
    params.status === "active" || params.status === "trialing"
      ? resolvePlanFromPriceId(params.stripePriceId)
      : "FREE";

  await prisma.tenant.update({
    where: { id: params.tenantId },
    data: {
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripePriceId: params.stripePriceId,
      subscriptionStatus: mapSubscriptionStatus(params.status),
      currentPeriodEnd: params.currentPeriodEnd,
      plan,
    },
  });
}

export async function downgradeTenantToFree(tenantId: string) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      plan: "FREE",
      subscriptionStatus: "CANCELED",
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    },
  });
}

export async function findTenantByStripeCustomerId(customerId: string) {
  return prisma.tenant.findUnique({
    where: { stripeCustomerId: customerId },
  });
}

export async function findTenantByStripeSubscriptionId(subscriptionId: string) {
  return prisma.tenant.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });
}
