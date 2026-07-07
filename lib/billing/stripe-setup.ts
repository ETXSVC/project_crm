import {
  getProPriceId,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/lib/billing/stripe";

export type StripeSetupInfo = {
  webhookUrl: string;
  secretKeyConfigured: boolean;
  maskedSecretKey: string | null;
  priceIdConfigured: boolean;
  priceId: string | null;
  webhookSecretConfigured: boolean;
  readyForCheckout: boolean;
  readyForWebhooks: boolean;
  envSnippet: string;
};

export function maskStripeSecretKey(secretKey: string | undefined): string | null {
  if (!secretKey) return null;
  if (secretKey.length <= 8) return "••••••••";
  return `${secretKey.slice(0, 7)}••••${secretKey.slice(-4)}`;
}

export function getStripeWebhookUrl(): string {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}/api/webhooks/stripe`;
}

export function getStripeSetupInfo(): StripeSetupInfo {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = getProPriceId();
  const webhookSecret = getStripeWebhookSecret();
  const secretKeyConfigured = isStripeConfigured();
  const priceIdConfigured = Boolean(priceId);
  const webhookSecretConfigured = Boolean(webhookSecret);

  return {
    webhookUrl: getStripeWebhookUrl(),
    secretKeyConfigured,
    maskedSecretKey: maskStripeSecretKey(secretKey),
    priceIdConfigured,
    priceId: priceId ?? null,
    webhookSecretConfigured,
    readyForCheckout: secretKeyConfigured && priceIdConfigured,
    readyForWebhooks: secretKeyConfigured && webhookSecretConfigured,
    envSnippet: [
      "STRIPE_SECRET_KEY=sk_test_...",
      "STRIPE_PRICE_PRO=price_...",
      `STRIPE_WEBHOOK_SECRET=whsec_...`,
    ].join("\n"),
  };
}
