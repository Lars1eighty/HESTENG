const { test, expect } = require("@playwright/test");

test("new user can reach the club-night entry point", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften");
  await expect(page).toHaveURL(/\/klubaften|\/login|\/auth/);
  await expect(page.locator("body")).toBeVisible();

  if (page.url().includes("/klubaften")) {
    await expect(page.getByRole("heading", { name: "Klubaften" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start klubaften" })).toBeVisible();
  }
});

test("start club night is one clear action when accessible", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften");

  if (page.url().includes("/klubaften")) {
    await page.getByRole("link", { name: "Start klubaften" }).click();
    await expect(page).toHaveURL(/\/klubaften\/ny/);
    await expect(page.locator("body")).toBeVisible();
  }
});
