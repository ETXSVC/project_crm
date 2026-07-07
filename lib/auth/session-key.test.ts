import { describe, expect, it } from "vitest";
import { generateAuthKey } from "@/lib/auth/session-key";

describe("auth session key", () => {
  it("generates unique high-entropy keys", () => {
    const a = generateAuthKey();
    const b = generateAuthKey();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});
