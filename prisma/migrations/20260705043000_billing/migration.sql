-- Billing fields on Tenant (Stripe subscriptions + plan limits)
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

ALTER TABLE "Tenant"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "Tenant_stripeCustomerId_key" ON "Tenant"("stripeCustomerId");
CREATE UNIQUE INDEX "Tenant_stripeSubscriptionId_key" ON "Tenant"("stripeSubscriptionId");
