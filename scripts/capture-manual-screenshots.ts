/**
 * Capture screenshots for docs/USER_MANUAL.md
 *
 * Usage (Docker stack running on localhost:3001):
 *   docker compose --profile dev exec -T app ./node_modules/.bin/tsx scripts/capture-manual-screenshots.ts
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const outputDir = join(process.cwd(), "docs", "screenshots");

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("demo@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in with password" }).click();
  await page.waitForURL("**/dashboard");
}

async function capture(name: string, page: import("@playwright/test").Page) {
  const path = join(outputDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`Saved ${path}`);
}

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });
  context.setDefaultNavigationTimeout(60_000);
  const page = await context.newPage();

  await page.goto("/login");
  await capture("01-login", page);

  await page.goto("/signup");
  await capture("02-signup", page);

  await login(page);
  await capture("03-dashboard", page);

  await page.goto("/projects", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await capture("04-projects", page);

  const projectLink = page.getByRole("link", { name: /Website Redesign/i });
  if (await projectLink.count()) {
    const href = await projectLink.first().getAttribute("href");
    if (href) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);
      await capture("05-project-overview", page);

      await page.goto(`${href}/tasks`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      await capture("07-project-tasks", page);

      try {
        await page.goto(`${href}/gantt`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await page.getByRole("heading", { name: /Gantt/i }).waitFor({ timeout: 30_000 });
        await page.waitForTimeout(1500);
        await capture("06-project-gantt", page);
      } catch (error) {
        console.warn("Gantt screenshot skipped:", error instanceof Error ? error.message : error);
      }
    }
  } else {
    console.warn("No seeded project link found; skipping project detail screenshots.");
  }

  await page.goto("/crm", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await capture("08-crm-vtiger", page);

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);
  await capture("09-settings", page);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(500);
  await capture("12-global-search", page);

  await browser.close();
  console.log("Screenshot capture complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
