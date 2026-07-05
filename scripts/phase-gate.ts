/**
 * Phase gate — blocks progression until health, unit, and E2E tests all pass.
 *
 * Usage:
 *   pnpm phase:gate -- --phase=1    # Run full suite and mark Phase 1 complete
 *   pnpm phase:status               # Show which phases passed the gate
 *
 * Policy: do not start Phase N+1 until Phase N gate passes.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getPhase, parsePhaseArg, PHASES } from "./phases";
import { runSystemTest } from "./system-test-core";

const STATUS_FILE = join(process.cwd(), ".phase-status.json");

type PhaseCompletion = {
  passedAt: string;
  e2ePassed: true;
  unitTestsPassed: true;
  healthOk: true;
};

type PhaseStatusFile = {
  completedPhases: Record<string, PhaseCompletion>;
};

function loadStatus(): PhaseStatusFile {
  if (!existsSync(STATUS_FILE)) {
    return { completedPhases: {} };
  }
  return JSON.parse(readFileSync(STATUS_FILE, "utf8")) as PhaseStatusFile;
}

function saveStatus(status: PhaseStatusFile) {
  writeFileSync(STATUS_FILE, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

export function isPhaseComplete(phaseId: number, status = loadStatus()): boolean {
  return Boolean(status.completedPhases[String(phaseId)]?.e2ePassed);
}

export function assertPreviousPhasesComplete(phaseId: number) {
  if (phaseId <= 1) return;

  const status = loadStatus();
  const blockers = PHASES.filter((p) => p.id < phaseId && !isPhaseComplete(p.id, status));

  if (blockers.length === 0) return;

  const names = blockers.map((p) => `Phase ${p.id} (${p.name})`).join(", ");
  throw new Error(
    `Cannot gate Phase ${phaseId} yet. Previous phase gate(s) not passed: ${names}.\n` +
      `Run: pnpm phase:gate -- --phase=${blockers[0].id}`
  );
}

export function printPhaseStatus() {
  const status = loadStatus();

  console.log("\nPhase gate status (E2E required for each):\n");
  for (const phase of PHASES) {
    const entry = status.completedPhases[String(phase.id)];
    const mark = entry?.e2ePassed ? "PASS" : "PENDING";
    const when = entry?.passedAt ? ` — ${entry.passedAt}` : "";
    console.log(`  [${mark}] Phase ${phase.id}: ${phase.name}${when}`);
    console.log(`         ${phase.summary}`);
  }

  const next = PHASES.find((p) => !isPhaseComplete(p.id, status));
  if (next) {
    console.log(`\nNext action: implement Phase ${next.id}, then run pnpm phase:gate -- --phase=${next.id}\n`);
  } else {
    console.log("\nAll phases passed the gate.\n");
  }
}

function markPhaseComplete(phaseId: number) {
  const status = loadStatus();
  status.completedPhases[String(phaseId)] = {
    passedAt: new Date().toISOString(),
    e2ePassed: true,
    unitTestsPassed: true,
    healthOk: true,
  };
  saveStatus(status);
}

async function main() {
  const statusOnly = process.argv.includes("--status");
  if (statusOnly) {
    printPhaseStatus();
    return;
  }

  const phaseId = parsePhaseArg(process.argv);
  const phase = getPhase(phaseId);

  assertPreviousPhasesComplete(phaseId);

  if (isPhaseComplete(phaseId)) {
    console.log(`Phase ${phaseId} (${phase.name}) already passed the gate. Re-running tests...\n`);
  } else {
    console.log(`Running Phase ${phaseId} gate: ${phase.name}\n`);
  }

  runSystemTest(phaseId);
  markPhaseComplete(phaseId);

  const next = PHASES.find((p) => p.id === phaseId + 1);
  console.log(`Phase ${phaseId} gate PASSED and recorded in .phase-status.json`);
  if (next) {
    console.log(`You may begin Phase ${next.id}: ${next.name}`);
    console.log(`When done, run: pnpm phase:gate -- --phase=${next.id}`);
  } else {
    console.log("Roadmap complete — all phases passed E2E.");
  }
}

main().catch((error) => {
  console.error("\nPhase gate FAILED:", error instanceof Error ? error.message : error);
  console.error("\nDo not start the next phase until this gate passes (health + unit + E2E).\n");
  process.exit(1);
});
