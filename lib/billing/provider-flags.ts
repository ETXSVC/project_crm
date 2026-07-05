import { isStripeConfigured, getProPriceId, getStripeWebhookSecret } from "@/lib/billing/stripe";

export function getBillingProviderFlags() {
  return {
    stripe: isStripeConfigured(),
    proPriceConfigured: Boolean(getProPriceId()),
    webhookConfigured: Boolean(getStripeWebhookSecret()),
  };
}
