/**
 * Full system test suite — run after each implementation phase.
 *
 * Usage:
 *   pnpm test:system -- --phase=1
 *
 * Requires Docker dev stack: docker compose --profile dev up -d
 *
 * To record phase completion (required before next phase):
 *   pnpm phase:gate -- --phase=1
 */
import { parsePhaseArg } from "./phases";
import { runSystemTest } from "./system-test-core";

async function main() {
  const phaseId = process.argv.find((arg) => arg.startsWith("--phase="))
    ? parsePhaseArg(process.argv)
    : 0;

  if (phaseId === 0) {
    console.error("Specify --phase=N (e.g. pnpm test:system -- --phase=1)");
    process.exit(1);
  }

  runSystemTest(phaseId);
  console.log(`Tests passed. Record completion with: pnpm phase:gate -- --phase=${phaseId}`);
}

main().catch((error) => {
  console.error("\nSystem test FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
