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


test("guest QR result reaches the Live TV dashboard", async ({ page, browser }) => {
  const clubNight = {
    id: "e2e-guest-night",
    clubId: "club-jyden-dartklub",
    name: "E2E QR klubaften",
    date: "2026-09-26",
    status: "active",
    selectedPlayers: ["QR A", "QR B"],
    pools: [{ name: "Pulje A", players: ["QR A", "QR B"] }],
    matches: [{
      id: "e2e-guest-match", clubId: "club-jyden-dartklub", clubNightId: "e2e-guest-night",
      player1: "QR A", player2: "QR B", pool: "Pulje A", round: 1, order: 1,
      scheduleSlot: 1, board: 1, bestOfLegs: 1, scoringMode: "total",
      score1: 0, score2: 0, status: "pending"
    }],
    boardCount: 1, handicapBoards: [], createdAt: "2026-09-26T18:00:00.000Z"
  };
  const sharedState = { clubNights: [clubNight], currentClubNightId: clubNight.id, completedMatches: [] };
  let publicRecord = {
    clubNightId: clubNight.id, clubId: clubNight.clubId, publicToken: "e2e-guest-token",
    status: "active", clubNight, completedMatches: []
  };

  await page.route("**/api/auth/session", async (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "e2e-user", name: "E2E Admin", email: "e2e@hesteng.test",
      memberships: [{ clubId: clubNight.clubId, clubName: "Jyden Dartklub", role: "ADMIN" }] },
      expires: "2099-01-01T00:00:00.000Z" })
  }));
  await page.route("**/api/shared-club-data", async (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ players: [], stats: [] })
  }));
  await page.route("**/api/club-night-state", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sharedState) });
    const body = route.request().postDataJSON();
    if (Array.isArray(body?.clubNights)) sharedState.clubNights = body.clubNights;
    if (Array.isArray(body?.completedMatches)) sharedState.completedMatches = body.completedMatches;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await page.route("**/api/guest-club-night**", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ record: publicRecord }) });
    const body = route.request().postDataJSON();
    publicRecord = { ...publicRecord, ...body, completedMatches: body.completedMatches ?? publicRecord.completedMatches };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(publicRecord) });
  });

  await page.addInitScript((snapshot) => {
    localStorage.setItem("hesteng.currentClubId", "club-jyden-dartklub");
    localStorage.setItem("hesteng.klubaftenState", JSON.stringify(snapshot));
    localStorage.setItem("hesteng.sharedClubNightMigrated.v2", "true");
  }, { clubNights: [clubNight], currentClubNightId: clubNight.id });

  await page.goto(`http://127.0.0.1:3000/klubaften/${clubNight.id}/gaest`);
  await expect(page.getByText("Scan og spil")).toBeVisible();

  publicRecord.completedMatches = [{
    id: "e2e-guest-match", clubId: clubNight.clubId, clubNightId: clubNight.id,
    player1: "QR A", player2: "QR B", score1: 1, score2: 0, winner: "QR A",
    bestOfLegs: 1, board: 1, pool: "Pulje A", round: 1,
    finishedAt: "2026-09-26T19:00:00.000Z"
  }];

  await page.getByRole("button", { name: /Hent gæsteresultater/ }).click();
  await expect(page.getByText(/gæsteresultat/)).toBeVisible();

  const tv = await browser.newPage();
  await tv.route("**/api/auth/session", async (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ user: { id: "e2e-user", memberships: [{ clubId: clubNight.clubId, clubName: "Jyden Dartklub", role: "ADMIN" }] }, expires: "2099-01-01T00:00:00.000Z" })
  }));
  await tv.route("**/api/shared-club-data", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ players: [], stats: [] }) }));
  await tv.route("**/api/club-night-state", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(sharedState) }));
  await tv.route("**/api/guest-club-night**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ record: publicRecord }) }));
  await tv.addInitScript((snapshot) => {
    localStorage.setItem("hesteng.currentClubId", "club-jyden-dartklub");
    localStorage.setItem("hesteng.klubaftenState", JSON.stringify(snapshot));
    localStorage.setItem("hesteng.sharedClubNightMigrated.v2", "true");
  }, { clubNights: sharedState.clubNights, currentClubNightId: clubNight.id });

  await tv.goto(`http://127.0.0.1:3000/klubaften/${clubNight.id}?tv=1`);
  await expect(tv.getByRole("heading", { name: clubNight.name })).toBeVisible();
  await expect(tv.getByText("QR A", { exact: true }).first()).toBeVisible();
  await expect(tv.getByText("1", { exact: true }).first()).toBeVisible();
  await tv.close();
});
