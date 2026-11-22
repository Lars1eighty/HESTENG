const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const code = readFileSync(join(__dirname, "../jyden-klubaften/Code.gs"), "utf8");
const html = readFileSync(join(__dirname, "../jyden-klubaften/Index.html"), "utf8");
const source = [
  ["Spillere", "", "Spiller 1", "Spiller 2"],
  ["A", "Runde 1"], ["B", "", "A", "F"], ["C", "", "B", "E"], ["D", "", "C", "D"], ["E"],
  ["F", "Runde 2"], ["", "", "A", "E"], ["", "", "D", "F"], ["", "", "B", "C"], [],
  ["", "Runde 3"], ["", "", "A", "D"], ["", "", "C", "E"], ["", "", "B", "F"], [],
  ["", "Runde 4"], ["", "", "A", "C"], ["", "", "B", "D"], ["", "", "E", "F"], [],
  ["", "Runde 5"], ["", "", "A", "B"], ["", "", "C", "F"], ["", "", "D", "E"], [],
  ["", "PULJESTILLING – UDFYLDES PÅ PAPIR"], ["", "Spiller", "Vundne", "Leg +"],
];

function setup() {
  const values = new Map([
    ["JYDEN_SPREADSHEET_ID", "legacy"],
    ["JYDEN_ADMIN_EMAIL", "admin@example.com"],
  ]);
  const state = { email: "admin@example.com", rows: source, locked: false };
  const context = vm.createContext({
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: key => values.get(key) ?? null,
        setProperty: (key, value) => values.set(key, value),
      }),
    },
    Session: { getActiveUser: () => ({ getEmail: () => state.email }) },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => { assert.equal(state.locked, false); state.locked = true; },
        releaseLock: () => { state.locked = false; },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      computeDigest: (algorithm, value) => createHash(algorithm).update(value).digest(),
      base64EncodeWebSafe: value => value.toString("base64url"),
    },
    Sheets: {
      Spreadsheets: {
        get: id => {
          assert.equal(id, "legacy");
          const gridProperties = { rowCount: 1000 };
          return { sheets: [
            { properties: { title: "Pulje A", gridProperties } },
            { properties: { title: "Pulje C1", hidden: true, gridProperties } },
            { properties: { title: "Players", gridProperties } },
          ] };
        },
        Values: {
          batchGet: (id, { ranges }) => {
            assert.equal(id, "legacy");
            assert.deepEqual(Array.from(ranges), ["'Pulje A'!A1:D64"]);
            return { valueRanges: [{ values: state.rows }] };
          },
        },
      },
    },
  });
  vm.runInContext(code, context);
  return { context, state };
}

function assertSchedule(pool, boardCount, roundCount) {
  assert.equal(pool.rounds.length, roundCount);
  const pairKeys = rounds => Array.from(rounds.flat(), game => [...game].sort().join("/")).sort();
  assert.deepEqual(pairKeys(pool.rounds), pairKeys(pool.sourceRounds));
  for (const round of pool.rounds) {
    assert.ok(round.length <= boardCount);
    assert.equal(new Set(round.flat()).size, round.length * 2);
  }
  for (const player of pool.players) {
    const rounds = Array.from(pool.rounds, (round, i) =>
      round.some(match => match.includes(player)) ? i : -1).filter(i => i >= 0);
    assert.equal(rounds.length, 5);
    assert.ok(rounds.slice(1).every((round, i) => round - rounds[i] <= 2));
  }
}

test("six Legacy players get five matches in five or eight rounds", () => {
  const { context, state } = setup();
  const night = context.getJydenNight();
  const [pool] = night.pools;
  assert.equal(night.pools.length, 1);
  assertSchedule(pool, 3, 5);
  assert.equal(pool.rounds, pool.sourceRounds);
  assertSchedule(context.saveJydenBoardCount("Pulje A", 2, night.revision), 2, 8);
  state.email = "player@example.com";
  const playerView = context.getJydenNight();
  assert.equal(playerView.canEdit, false);
  assertSchedule(playerView.pools[0], 2, 8);
  assert.throws(() => context.saveJydenBoardCount("Pulje A", 3, night.revision), /klublederen/);
});

test("a changed source cannot be overwritten by an old save", () => {
  const { context, state } = setup();
  const night = context.getJydenNight();
  context.saveJydenBoardCount("Pulje A", 2, night.revision);
  state.rows = source.map(row => row.map(cell => cell === "A" ? "Ny spiller" : cell));
  assert.throws(() => context.saveJydenBoardCount("Pulje A", 2, night.revision), /ændret/);
  assert.equal(state.locked, false);
  assertSchedule(context.getJydenNight().pools[0], 3, 5);
});

test("reports a missing opponent instead of inventing a game", () => {
  const { context, state } = setup();
  state.rows = source.map(row => row.map(cell => cell === "F" ? "" : cell));
  const night = context.getJydenNight();
  assert.equal(night.pools.length, 0);
  assert.deepEqual(Array.from(night.unavailable), ["Pulje A"]);
});

test("extra matches keep their multiplicity and never double-book players", () => {
  const { context } = setup();
  const extra = source.slice(0, -2).concat([
    ["", "Ekstrakampe"], ["", "", "A", "B"], ["", "", "A", "C"], ...source.slice(-2),
  ]);
  const pool = context.parseJydenPool_("Pulje A", extra);
  const rounds = context.jydenSchedule_(pool.sourceRounds, pool.players, 2);
  assert.equal(rounds.flat().length, 17);
  assert.equal(rounds.flat().filter(game => game.includes("A") && game.includes("B")).length, 2);
  for (const round of rounds) {
    assert.ok(round.length <= 2);
    assert.equal(new Set(round.flat()).size, 2 * round.length);
  }
});

test("the browser script parses", () => {
  const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(script));
});
