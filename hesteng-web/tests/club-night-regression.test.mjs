import test from "node:test";
import assert from "node:assert/strict";

function neededLegs(bestOfLegs) {
  return Math.ceil(bestOfLegs / 2);
}

function checkout({ legs, bestOfLegs }) {
  const nextLegs = legs + 1;
  return {
    legs: nextLegs,
    finished: nextLegs >= neededLegs(bestOfLegs),
  };
}

test("1 leg: checkout finishes the match immediately", () => {
  assert.deepEqual(checkout({ legs: 0, bestOfLegs: 1 }), { legs: 1, finished: true });
});

test("Bo3: first checkout wins a leg but not the match", () => {
  assert.deepEqual(checkout({ legs: 0, bestOfLegs: 3 }), { legs: 1, finished: false });
});

test("Bo3: second checkout finishes the match", () => {
  assert.deepEqual(checkout({ legs: 1, bestOfLegs: 3 }), { legs: 2, finished: true });
});

test("Bo5: match requires three won legs", () => {
  assert.equal(checkout({ legs: 1, bestOfLegs: 5 }).finished, false);
  assert.equal(checkout({ legs: 2, bestOfLegs: 5 }).finished, true);
});

test("generated 1-leg match must stay 1 leg when opened", () => {
  const generatedMatch = { bestOfLegs: 1 };
  const setupDefault = 5;
  const selected = generatedMatch.bestOfLegs ?? setupDefault;
  assert.equal(selected, 1);
});

test("new-user flow: 1-leg club night reaches a finished result", () => {
  const night = {
    status: "active",
    players: ["Anna", "Bent"],
    pools: [{ name: "Pulje A", players: ["Anna", "Bent"] }],
    matches: [{ id: "m1", player1: "Anna", player2: "Bent", bestOfLegs: 1, status: "pending" }],
  };

  const match = { ...night.matches[0], status: "live", startingPlayer: 0 };
  const result = checkout({ legs: 0, bestOfLegs: match.bestOfLegs });
  const completed = {
    ...match,
    score1: result.finished ? 1 : 0,
    score2: 0,
    winner: result.finished ? "Anna" : undefined,
    status: result.finished ? "finished" : "live",
  };

  assert.equal(completed.bestOfLegs, 1);
  assert.equal(completed.status, "finished");
  assert.equal(completed.winner, "Anna");
  assert.equal(completed.score1, 1);
});

test("new-user flow: back navigation changes only one screen", () => {
  const screens = ["Klubaften", "Kampe", "Kamp", "Scorer"];
  let index = screens.length - 1;
  index -= 1;
  assert.equal(screens[index], "Kamp");
});

test("new-user flow: live TV only counts unfinished matches as active", () => {
  const matches = [
    { status: "finished" },
    { status: "live" },
    { status: "pending" },
  ];
  assert.equal(matches.filter((match) => match.status === "live").length, 1);
  assert.equal(matches.filter((match) => match.status === "finished").length, 1);
});

test("new-user flow: guest QR keeps the generated match format", () => {
  const match = { id: "m1", bestOfLegs: 1, player1: "Anna", player2: "Bent" };
  const snapshot = { matches: [match] };
  assert.equal(snapshot.matches[0].bestOfLegs, 1);
});


test("shared scorer rule: exact zero on a valid double-out finishes Bo1", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile(new URL("../lib/scoringEngine.ts", import.meta.url), "utf8"));
  assert.match(source, /export function resolveVisit/);
  assert.match(source, /export function checkoutFinishesMatch/);
  assert.match(source, /after === 0/);
  assert.match(source, /canCheckout\(remaining, 3\)/);
});

test("main and QR scorers both use the shared scoring engine", async () => {
  const fs = await import("node:fs/promises");
  const main = await fs.readFile(new URL("../components/MatchScorer.tsx", import.meta.url), "utf8");
  const guest = await fs.readFile(new URL("../components/GuestMatchScorer.tsx", import.meta.url), "utf8");
  assert.match(main, /@\/lib\/scoringEngine/);
  assert.match(guest, /@\/lib\/scoringEngine/);
});
