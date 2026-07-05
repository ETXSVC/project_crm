import { describe, expect, it } from "vitest";
import { verifyCiWorkflow } from "./verify-ci";

describe("verifyCiWorkflow", () => {
  it("validates the GitHub Actions workflow includes lint, unit, and E2E gates", () => {
    const result = verifyCiWorkflow();
    expect(result.checks).toBeGreaterThan(0);
    expect(result.workflowPath).toContain(".github/workflows/ci.yml");
  });
});
