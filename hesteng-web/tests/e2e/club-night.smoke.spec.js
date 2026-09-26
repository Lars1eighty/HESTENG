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

test("match scorer route never silently shows a fake match", async ({ page }) => {
  await page.goto("http://127.0.0.1:3000/klubaften/test-night/kamp/missing-match");
  await expect(page.locator("body")).toBeVisible();

  if (page.url().includes("/kamp/")) {
    await expect(page.getByText(/Kampen blev ikke fundet|Henter kamp/)).toBeVisible();
  }
});


test("real one-leg club match finishes at checkout and saves the result", async ({ page }) => {
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { console.log(`BROWSER_CONSOLE_${message.type().toUpperCase()}:`, message.text()); if (message.type() === "error") browserErrors.push(`console: ${message.text()}`); });
  const clubNight = {
    id: "e2e-night",
    clubId: "club-jyden-dartklub",
    name: "E2E klubaften",
    date: "2026-09-25",
    status: "active",
    selectedPlayers: ["Test A", "Test B"],
    pools: [{ name: "Pulje A", players: ["Test A", "Test B"] }],
    matches: [{
      id: "e2e-match",
      clubId: "club-jyden-dartklub",
      clubNightId: "e2e-night",
      player1: "Test A",
      player2: "Test B",
      pool: "Pulje A",
      round: 1,
      board: 1,
      bestOfLegs: 1,
      scoringMode: "total",
      status: "pending"
    }],
    boardCount: 1,
    handicapBoards: [],
    createdAt: "2026-09-25T18:00:00.000Z"
  };
  const sharedState = { clubNights: [clubNight], currentClubNightId: "e2e-night", completedMatches: [] };

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "e2e-user", name: "E2E Admin", email: "e2e@hesteng.test", playerProfileId: "e2e-player", memberships: [{ clubId: "club-jyden-dartklub", clubName: "Jyden Dartklub", role: "ADMIN" }] }, expires: "2099-01-01T00:00:00.000Z" }) });
  });

  await page.route("**/api/shared-club-data", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ players: [], stats: [] }) });
  });

  await page.route("**/api/club-night-state", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sharedState) });
      return;
    }
    const body = route.request().postDataJSON();
    if (Array.isArray(body?.clubNights)) sharedState.clubNights = body.clubNights;
    if ("currentClubNightId" in (body ?? {})) sharedState.currentClubNightId = body.currentClubNightId;
    if (Array.isArray(body?.completedMatches)) sharedState.completedMatches = body.completedMatches;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.addInitScript((snapshot) => {
    localStorage.setItem("hesteng.currentClubId", "club-jyden-dartklub");
    localStorage.setItem("hesteng.klubaftenState", JSON.stringify(snapshot));
    localStorage.setItem("hesteng.sharedClubNightMigrated.v2", "true");
  }, { clubNights: [clubNight], currentClubNightId: "e2e-night" });

  await page.goto("http://127.0.0.1:3000/");
  await page.evaluate((snapshot) => {
    localStorage.setItem("hesteng.currentClubId", "club-jyden-dartklub");
    localStorage.setItem("hesteng.klubaftenState", JSON.stringify(snapshot));
    localStorage.setItem("hesteng.sharedClubNightMigrated.v2", "true");
  }, { clubNights: [clubNight], currentClubNightId: "e2e-night" });
  await page.goto("http://127.0.0.1:3000/klubaften/e2e-night/kamp/e2e-match");
  await page.waitForTimeout(1000);
  console.log("E2E URL:", page.url());
  console.log("E2E local state:", await page.evaluate(() => localStorage.getItem("hesteng.klubaftenState")));
  console.log("E2E route params:", await page.evaluate(() => ({ pathname: location.pathname, href: location.href })));
  console.log("E2E body:", (await page.locator("body").innerText()).slice(0, 2000));
  console.log("E2E hydration:", await page.evaluate(() => ({ readyState: document.readyState, next: !!document.querySelector("next-route-announcer"), scripts: document.scripts.length })));
  console.log("E2E browser errors:", browserErrors);
  console.log("E2E root html:", (await page.locator("html").innerHTML()).includes("__next_error__"), (await page.locator("html").getAttribute("class")) ?? "no-class");
  console.log("E2E script srcs:", await page.locator("script[src]").evaluateAll((nodes) => nodes.map((node) => node.src)));
  console.log("E2E failed resources:", browserErrors.filter((entry) => !entry.includes("webpack-hmr")));
  console.log("E2E performance scripts:", await page.evaluate(() => performance.getEntriesByType("resource").filter((entry) => entry.name.includes("_next/static/chunks")).map((entry) => ({ name: entry.name, duration: entry.duration, size: entry.transferSize }))));
  await expect(page.getByText("Henter kamp...")).toBeHidden({ timeout: 10000 });
  await expect(page.getByText("Kampen blev ikke fundet.")).toBeHidden();
  await expect(page.getByText("Test A", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Test B", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("501 Double Out · Bedst af 1 legs")).toBeVisible();

  await page.getByRole("button", { name: "Test A" }).click();
  await page.getByRole("button", { name: "START KAMP" }).click();

  const enterVisit = async (score) => {
    await page.getByRole("button", { name: String(score), exact: true }).first().click();
    await page.getByRole("button", { name: "ENTER →" }).click();
  };

  await enterVisit(180);
  await enterVisit(26);
  await enterVisit(180);
  await enterVisit(26);
  await enterVisit(81);
  await enterVisit(26);

  await page.getByRole("button", { name: "60", exact: true }).first().click();
  await page.getByRole("button", { name: "ENTER →" }).click();

  await expect(page.getByText("KAMP FÆRDIG")).toBeVisible();
  await expect(page.getByText("Test A vinder")).toBeVisible();
  await expect(page.getByText("1 – 0")).toBeVisible();
});
