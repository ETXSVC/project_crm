import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const WORKFLOW_PATH = join(process.cwd(), ".github/workflows/ci.yml");

const REQUIRED_SNIPPETS = [
  "pull_request",
  "pnpm lint",
  "vitest run",
  "run-e2e.ts",
  "docker compose --profile dev up --build -d",
] as const;

export function verifyCiWorkflow(workflowPath = WORKFLOW_PATH) {
  if (!existsSync(workflowPath)) {
    throw new Error(`Missing CI workflow at ${workflowPath}`);
  }

  const content = readFileSync(workflowPath, "utf8");

  for (const snippet of REQUIRED_SNIPPETS) {
    if (!content.includes(snippet)) {
      throw new Error(`CI workflow missing required content: ${snippet}`);
    }
  }

  return {
    workflowPath,
    checks: REQUIRED_SNIPPETS.length,
  };
}

async function main() {
  const result = verifyCiWorkflow();
  console.log(`CI workflow verified (${result.checks} checks): ${result.workflowPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
