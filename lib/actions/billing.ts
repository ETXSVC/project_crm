"use server";

import { redirect } from "next/navigation";
import { getTenantDb } from "@/lib/db/get-tenant-db";
import { prisma } from "@/lib/db/prisma";
import { getPlanLimits } from "@/lib/billing/plans";
import { getTenantUsage, type BillingSummary } from "@/lib/billing/limits";
import { assertPermission } from "@/lib/auth/guards";
import {
  getProPriceId,
  getStripeClient,
  isStripeConfigured,
} from "@/lib/billing/stripe";
import { getStripeSetupInfo, type StripeSetupInfo } from "@/lib/billing/stripe-setup";
import type { TenantRole } from "@prisma/client";

function billingAdminError(role?: TenantRole): string | null {
  return assertPermission(role, "billing:manage");
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
    return { error: "Company not found" };
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
    return { error: "No Stripe customer linked to this company" };
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings`,
  });

  redirect(portal.url);
}

export async function getStripeSetup(): Promise<StripeSetupInfo> {
  return getStripeSetupInfo();
}

export async function verifyStripeConnection(): Promise<
  | { success: true; mode: "test" | "live"; priceLabel?: string }
  | { error: string }
> {
  const { session } = await getTenantDb();
  const adminError = billingAdminError(session.user.role);
  if (adminError) return { error: adminError };

  const stripe = getStripeClient();
  const priceId = getProPriceId();

  if (!stripe) {
    return { error: "STRIPE_SECRET_KEY is not set. Add it to your .env file and restart the app." };
  }

  try {
    await stripe.balance.retrieve();

    let priceLabel: string | undefined;
    if (priceId) {
      const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
      const product = price.product;
      const productName =
        typeof product === "object" && product && "name" in product ? product.name : undefined;
      priceLabel = productName
        ? `${productName} (${price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : priceId})`
        : priceId;
    }

    const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
    return { success: true, mode, priceLabel };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe error";
    return { error: `Stripe connection failed: ${message}` };
  }
}
