import { execSync } from "node:child_process";
import { getPhase } from "./phases";

export type SystemTestResult = {
  phase: number;
  health: { status: string; redis?: string; rls?: string };
  unitTestsPassed: true;
  e2eTestsPassed: true;
};

function run(command: string) {
  console.log(`\n> ${command}\n`);
  execSync(command, { stdio: "inherit", env: process.env });
}

export function checkHealth(appUrl: string) {
  const healthUrl = `${appUrl}/api/health`;
  console.log(`\n--- Health check (${healthUrl}) ---\n`);

  const curlCmd =
    process.platform === "win32" ? `curl.exe -sf "${healthUrl}"` : `curl -sf "${healthUrl}"`;
  const raw = execSync(curlCmd, { encoding: "utf8" });
  const body = JSON.parse(raw) as { status: string; redis?: string; rls?: string };
  console.log(body);

  if (body.status !== "ok") {
    throw new Error(`Health check failed: ${JSON.stringify(body)}`);
  }
  if (body.rls !== "enabled") {
    throw new Error(`Expected RLS enabled, got: ${body.rls ?? "missing"}`);
  }
  console.log("Health check passed.");
  return body;
}

export function runUnitTests() {
  console.log("\n--- Unit & integration tests ---\n");
  run("docker compose --profile dev exec -T app ./node_modules/.bin/vitest run");
}

export function runE2eTests() {
  console.log("\n--- E2E smoke tests (required gate) ---\n");
  run("docker compose --profile dev exec -T app ./node_modules/.bin/tsx scripts/run-e2e.ts");
}

/**
 * Full system test: health → unit → E2E.
 * Throws on any failure — callers must not mark a phase complete unless this succeeds.
 */
export function runSystemTest(phaseId: number, appUrl = process.env.APP_URL ?? "http://localhost:3001"): SystemTestResult {
  const phase = getPhase(phaseId);

  console.log(`\n========================================`);
  console.log(`  System test — Phase ${phase.id}: ${phase.name}`);
  console.log(`========================================`);

  run("docker compose --profile dev ps");

  const health = checkHealth(appUrl);
  runUnitTests();
  runE2eTests();

  console.log(`\n========================================`);
  console.log(`  Phase ${phase.id} system test PASSED (incl. E2E)`);
  console.log(`========================================\n`);

  return {
    phase: phase.id,
    health,
    unitTestsPassed: true,
    e2eTestsPassed: true,
  };
}
