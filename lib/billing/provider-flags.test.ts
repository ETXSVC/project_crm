import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getBillingProviderFlags } from "@/lib/billing/provider-flags";

describe("billing provider flags", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("reports stripe disabled when secret key is missing", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_WEBHOOK_SECRET;

    expect(getBillingProviderFlags()).toEqual({
      stripe: false,
      proPriceConfigured: false,
      webhookConfigured: false,
    });
  });

  it("reports configured flags when env is present", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

    expect(getBillingProviderFlags()).toEqual({
      stripe: true,
      proPriceConfigured: true,
      webhookConfigured: true,
    });
  });
});
