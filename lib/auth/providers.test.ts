import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getAuthProviderFlags } from "@/lib/auth/provider-flags";
import { buildAuthProviders } from "@/lib/auth/providers";

describe("auth providers", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("enables magic link when SMTP is configured", () => {
    process.env.SMTP_HOST = "mailhog";
    process.env.SMTP_FROM = "noreply@projtest.local";
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GITHUB_ID;

    const flags = getAuthProviderFlags();
    expect(flags.credentials).toBe(true);
    expect(flags.magicLink).toBe(true);
    expect(flags.google).toBe(false);
    expect(flags.github).toBe(false);

    const providers = buildAuthProviders();
    expect(providers.map((p) => p.id)).toEqual(
      expect.arrayContaining(["credentials", "nodemailer"])
    );
  });

  it("adds OAuth providers only when env credentials exist", () => {
    process.env.SMTP_HOST = "mailhog";
    process.env.SMTP_FROM = "noreply@projtest.local";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.AUTH_GITHUB_ID = "github-id";
    process.env.AUTH_GITHUB_SECRET = "github-secret";

    const flags = getAuthProviderFlags();
    expect(flags.google).toBe(true);
    expect(flags.github).toBe(true);

    const ids = buildAuthProviders().map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(["credentials", "nodemailer", "google", "github"])
    );
  });
});
