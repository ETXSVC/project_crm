import { describe, expect, it } from "vitest";
import { getStripeSetupInfo, maskStripeSecretKey } from "@/lib/billing/stripe-setup";

describe("stripe setup", () => {
  it("masks secret keys safely", () => {
    expect(maskStripeSecretKey("sk_test_1234567890abcdef")).toBe("sk_test••••cdef");
    expect(maskStripeSecretKey(undefined)).toBeNull();
  });

  it("reports readiness from env flags", () => {
    const env = process.env;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_PRICE_PRO = "price_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    const setup = getStripeSetupInfo();
    expect(setup.readyForCheckout).toBe(true);
    expect(setup.readyForWebhooks).toBe(true);
    expect(setup.webhookUrl).toContain("/api/webhooks/stripe");

    process.env = env;
  });
});
