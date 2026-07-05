export type PhaseDefinition = {
  id: number;
  slug: string;
  name: string;
  summary: string;
};

/** SaaS hardening roadmap — each phase must pass E2E before the next begins. */
export const PHASES: PhaseDefinition[] = [
  {
    id: 1,
    slug: "rls",
    name: "PostgreSQL RLS",
    summary: "DB-level tenant isolation (proj_app role, RLS policies, tenant context)",
  },
  {
    id: 2,
    slug: "tenant-queries",
    name: "Tenant query hardening",
    summary: "getTenantDb() everywhere, safe ID lookups, tenant switcher",
  },
  {
    id: 3,
    slug: "auth",
    name: "Production auth",
    summary: "OAuth providers, magic link, session hardening (Clerk/Better Auth eval)",
  },
  {
    id: 4,
    slug: "billing",
    name: "Stripe billing",
    summary: "Checkout, subscriptions, webhooks, plan limits",
  },
  {
    id: 5,
    slug: "cicd",
    name: "CI/CD",
    summary: "GitHub Actions: lint, unit tests, E2E gate on every PR",
  },
];

export function getPhase(id: number): PhaseDefinition {
  const phase = PHASES.find((entry) => entry.id === id);
  if (!phase) {
    throw new Error(`Unknown phase ${id}. Valid phases: ${PHASES.map((p) => p.id).join(", ")}`);
  }
  return phase;
}

export function parsePhaseArg(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith("--phase="))?.split("=")[1];
  if (!raw) {
    throw new Error("Missing required --phase=N (e.g. --phase=1)");
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > PHASES.length) {
    throw new Error(`Invalid --phase=${raw}. Valid phases: 1–${PHASES.length}`);
  }
  return id;
}
