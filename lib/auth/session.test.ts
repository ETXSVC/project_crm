import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, SESSION_UPDATE_AGE_SECONDS } from "@/lib/auth/session";

describe("session hardening", () => {
  it("uses a 30-day max session age", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
  });

  it("refreshes session token every 24 hours", () => {
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
  });
});
