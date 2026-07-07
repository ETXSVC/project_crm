import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "Create your company" })).toBeVisible();
  });
});

test.describe("Authenticated", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("demo@example.com");
    await page.getByLabel("Password").fill("password");
    await page.getByRole("button", { name: "Sign in with password" }).click();
    await page.waitForURL("**/dashboard");
  });

  test("dashboard loads", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("projects page loads", async ({ page }) => {
    await page.goto("/projects", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: "Projects" })).toBeVisible();
  });

  test("CRM page loads", async ({ page }) => {
    await page.goto("/crm");
    await expect(page.getByRole("heading", { level: 1, name: "CRM" })).toBeVisible();
  });
});
