import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { cleanRoster, drawPools, examplePlayers, schedulePool } from "../web/engine.mjs";
import worker from "../dist/server/index.js";

const roster = size => Array.from({length: size}, (_, index) => "Spiller " + (index + 1));

test("the draw keeps every player and makes balanced pools of four to seven", () => {
  for (let total = 4; total <= 84; total++) {
    const names = roster(total);
    const pools = drawPools(names, () => .5);
    const sizes = pools.map(pool => pool.players.length);
    assert.ok(sizes.every(size => size >= 4 && size <= 7));
    assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
    assert.deepEqual(new Set(pools.flatMap(pool => pool.players)), new Set(names));
  }
  assert.throws(() => cleanRoster("Lars\nlars\nAnna\nMads"), /samme navn/);
});

test("per-pool capacity preserves all fixtures and no player has simultaneous matches", () => {
  for (let count = 4; count <= 7; count++) {
    const players = roster(count);
    const pairKey = game => [...game].sort().join("/");
    for (const boards of [2, 3]) {
      const rounds = schedulePool(players, boards);
      const pairs = rounds.flat();
      assert.equal(pairs.length, count * (count - 1) / 2);
      assert.equal(new Set(pairs.map(pairKey)).size, pairs.length);
      for (const round of rounds) {
        assert.ok(round.length <= boards);
        assert.equal(new Set(round.flat()).size, round.length * 2);
      }
      for (const player of players) {
        assert.equal(pairs.filter(pair => pair.includes(player)).length, count - 1);
      }
    }
  }
  const six = roster(6);
  const compact = schedulePool(six, 2);
  assert.equal(compact.length, 8);
  for (const player of six) {
    const games = compact.flatMap((round, index) => round.some(pair => pair.includes(player)) ? [index] : []);
    assert.ok(games.slice(1).every((index, i) => index - games[i] <= 2));
  }
  assert.equal(schedulePool(six, 3).length, 5);
});

function testDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of ["0000_club_nights", "0001_club_rosters"]) {
    sqlite.exec(readFileSync(new URL("../drizzle/" + migration + ".sql", import.meta.url), "utf8"));
  }
  const DB = {prepare: sql => ({bind: (...args) => ({first: () => sqlite.prepare(sql).get(...args)})})};
  return {sqlite, DB};
}

test("a club keeps the same player link across updates and other accounts cannot edit it", async () => {
  const {sqlite, DB} = testDatabase();
  const base = "https://club.example";
  const api = (path, options = {}) => worker.fetch(new Request(base + path, options), {DB});
  const admin = {Origin: base, "oai-authenticated-user-id": "owner"};
  const plan = {club: "Jyden", pools: drawPools(roster(12), () => .5)};
  plan.pools[0].boards = 3;
  const put = (value, headers = admin) =>
    api("/api/club", {method: "PUT", headers, body: JSON.stringify(value)});

  assert.equal((await put(plan, {Origin: base})).status, 401);
  assert.equal((await put(plan, {...admin, Origin: "https://other.example"})).status, 403);
  const first = await (await put(plan)).json();
  assert.deepEqual(first.plan, plan);
  const playerPath = "/api/program/" + first.shareId;
  assert.deepEqual(await (await api(playerPath)).json(), plan);
  const other = {...admin, "oai-authenticated-user-id": "another"};
  assert.equal(await (await api("/api/club", {headers: other})).json(), null);
  const secondClub = await (await put({...plan, club: "En anden klub"}, other)).json();
  assert.notEqual(secondClub.shareId, first.shareId);
  plan.pools[0].boards = 2;
  const update = await (await put(plan)).json();
  assert.equal(update.shareId, first.shareId);
  assert.deepEqual(await (await api(playerPath)).json(), plan);
  assert.equal((await put({...plan, pools: []})).status, 400);
  sqlite.close();
});

test("saved club names survive new attendance, imports and example programs", async () => {
  const {sqlite, DB} = testDatabase();
  const base = "https://club.example";
  const headers = {Origin: base, "oai-authenticated-user-id": "owner"};
  const oldPlan = {club: "Jyden", pools: drawPools(["Anna", "Jens", "Lars", "Yvonne"], () => .5)};
  sqlite.prepare("INSERT INTO club_nights VALUES (?, ?, ?, ?)")
    .run("owner", crypto.randomUUID(), JSON.stringify(oldPlan), new Date().toISOString());

  const api = (path, method = "GET", value, identity = headers) =>
    worker.fetch(new Request(base + path, {method, headers: identity, body: JSON.stringify(value)}), {DB});
  assert.deepEqual(await (await api("/api/roster")).json(), {players:["Anna", "Jens", "Lars", "Yvonne"]});
  assert.equal((await api("/api/roster", "POST", ["Pia"], {Origin: base})).status, 401);
  assert.equal((await api("/api/roster", "POST", ["Pia"], {...headers, Origin: "https://other.example"})).status, 403);

  await Promise.all([
    api("/api/roster", "POST", [" anna ", "Pia"]),
    api("/api/roster", "POST", ["Mads"]),
  ]);
  const newPlan = {club: "Jyden", pools: drawPools(["Anna", "Jens", "Lars", "Mads"], () => .5)};
  assert.equal((await api("/api/club", "PUT", newPlan)).status, 200);
  const expected = {players:["Anna", "Jens", "Lars", "Mads", "Pia", "Yvonne"]};
  assert.deepEqual(await (await api("/api/roster")).json(), expected);

  const example = {club: "Jyden", pools: drawPools(examplePlayers, () => .5)};
  assert.equal((await api("/api/club", "PUT", example)).status, 200);
  assert.deepEqual(await (await api("/api/roster")).json(), expected);
  const other = {...headers, "oai-authenticated-user-id": "another"};
  assert.deepEqual(await (await api("/api/roster", "GET", undefined, other)).json(), {players:[]});
  sqlite.close();
});
