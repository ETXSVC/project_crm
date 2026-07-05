import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  PLAN_LIMITS,
  getPlanLimits,
  isPaidPlan,
  isSubscriptionActive,
  resolvePlanFromPriceId,
} from "@/lib/billing/plans";

describe("billing plans", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("defines tighter limits on FREE than PRO", () => {
    expect(PLAN_LIMITS.FREE.maxProjects).toBeLessThan(100);
    expect(PLAN_LIMITS.PRO.maxProjects).toBeNull();
    expect(getPlanLimits("FREE").maxCrmAccounts).toBe(25);
  });

  it("treats only PRO price id as paid plan", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro_test";
    expect(resolvePlanFromPriceId("price_pro_test")).toBe("PRO");
    expect(resolvePlanFromPriceId("price_other")).toBe("FREE");
    expect(isPaidPlan("PRO")).toBe(true);
    expect(isPaidPlan("FREE")).toBe(false);
  });

  it("considers ACTIVE and TRIALING subscriptions usable", () => {
    expect(isSubscriptionActive("ACTIVE")).toBe(true);
    expect(isSubscriptionActive("TRIALING")).toBe(true);
    expect(isSubscriptionActive("PAST_DUE")).toBe(false);
  });
});
