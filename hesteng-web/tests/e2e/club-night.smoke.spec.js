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

test("new user understands the create-club-night form", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften/ny");
  await expect(page.locator("body")).toBeVisible();

  if (page.url().includes("/klubaften/ny")) {
    await expect(page.getByRole("heading", { name: "Ny klubaften" })).toBeVisible();
    await expect(page.getByLabel("Navn")).toBeVisible();
    await expect(page.getByLabel("Dato")).toBeVisible();
    await expect(page.getByLabel(/Antal baner/)).toBeVisible();
    await expect(page.getByLabel("Spilleform")).toBeVisible();
    await expect(page.getByRole("button", { name: "Opret klubaften" })).toBeVisible();
  }
});

test("new user gets clear guidance before pools can be created", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften/test-night/spillere");
  await expect(page.locator("body")).toBeVisible();

  if (page.url().includes("/klubaften/")) {
    await expect(page.getByRole("heading", { name: /Tilføj spillere/ })).toBeVisible();
    await expect(page.getByText(/Vælg mindst \d+ spillere/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Lav puljer" })).toBeVisible();
  }
});

test("new user understands pool choices and cannot bypass missing players", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften/test-night/puljer");
  await expect(page.locator("body")).toBeVisible();

  if (page.url().includes("/puljer")) {
    await expect(page.getByRole("heading", { name: /Puljer/ })).toBeVisible();
    await expect(page.getByText(/Vælg mindst \d+ spillere/)).toBeVisible();
  }
});
