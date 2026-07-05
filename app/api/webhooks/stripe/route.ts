import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  applySubscriptionToTenant,
  downgradeTenantToFree,
  findTenantByStripeCustomerId,
  findTenantByStripeSubscriptionId,
} from "@/lib/billing/subscription";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

async function syncSubscription(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata.tenantId;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  let tenant =
    (tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId } }) : null) ??
    (await findTenantByStripeSubscriptionId(subscription.id)) ??
    (await findTenantByStripeCustomerId(customerId));

  if (!tenant) {
    console.error("Stripe webhook: tenant not found for subscription", subscription.id);
    return;
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    await downgradeTenantToFree(tenant.id);
    return;
  }

  await applySubscriptionToTenant({
    tenantId: tenant.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status,
    currentPeriodEnd,
  });
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler error", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
