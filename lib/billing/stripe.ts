import Stripe from "stripe";

let stripeClient: Stripe | null | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (stripeClient === undefined) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

export function getProPriceId(): string | undefined {
  return process.env.STRIPE_PRICE_PRO;
}
