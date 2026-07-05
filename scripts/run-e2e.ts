import { execSync } from "node:child_process";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";

execSync("./node_modules/.bin/playwright test", {
  stdio: "inherit",
  env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
});
