"use server";

import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { getPlanLimits } from "@/lib/billing/plans";
import { getTenantUsage, type BillingSummary } from "@/lib/billing/limits";
import {
  getProPriceId,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import type { TenantRole } from "@prisma/client";

const ADMIN_ROLES: TenantRole[] = ["OWNER", "ADMIN"];

function billingAdminError(role?: TenantRole): string | null {
  if (!role || !ADMIN_ROLES.includes(role)) {
    return "Only workspace owners and admins can manage billing";
  }
  return null;
}

export async function getBillingInfo(): Promise<BillingSummary | null> {
  const { tenantId } = await getTenantDb();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      plan: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
    },
  });

  if (!tenant) return null;

  const usage = await getTenantUsage(tenantId);
  const limits = getPlanLimits(tenant.plan);

  return {
    plan: tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus,
    limits,
    usage,
    currentPeriodEnd: tenant.currentPeriodEnd,
    stripeConfigured: isStripeConfigured(),
    hasStripeCustomer: Boolean(tenant.stripeCustomerId),
  };
}

export async function createCheckoutSession() {
  const { tenantId, session } = await getTenantDb();
  const adminError = billingAdminError(session.user.role);
  if (adminError) return { error: adminError };

  const stripe = getStripeClient();
  const priceId = getProPriceId();

  if (!stripe || !priceId) {
    return { error: "Stripe billing is not configured for this environment" };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, stripeCustomerId: true },
  });

  if (!tenant) {
    return { error: "Workspace not found" };
  }

  let customerId = tenant.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId },
    });
    customerId = customer.id;
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/settings?billing=success`,
    cancel_url: `${process.env.NEXTAUTH_URL}/settings?billing=canceled`,
    subscription_data: {
      metadata: { tenantId },
    },
    metadata: { tenantId },
  });

  if (!checkout.url) {
    return { error: "Could not create checkout session" };
  }

  redirect(checkout.url);
}

export async function createBillingPortalSession() {
  const { tenantId, session } = await getTenantDb();
  const adminError = billingAdminError(session.user.role);
  if (adminError) return { error: adminError };

  const stripe = getStripeClient();
  if (!stripe) {
    return { error: "Stripe billing is not configured for this environment" };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeCustomerId: true },
  });

  if (!tenant?.stripeCustomerId) {
    return { error: "No Stripe customer linked to this workspace" };
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings`,
  });

  redirect(portal.url);
}
