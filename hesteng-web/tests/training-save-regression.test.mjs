import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

// Run the actual store code with only its browser and alias dependencies mocked.
const source = readFileSync(new URL("../lib/trainingResultStore.ts", import.meta.url), "utf8")
  .replace('import { DEMO_CLUB_ID } from "@/data/clubs";', 'const DEMO_CLUB_ID = "demo";')
  .replace('import { getCurrentClubId } from "@/lib/currentClub";', 'const getCurrentClubId = () => "demo";');
const js = stripTypeScriptTypes(source);
const storeModule = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

function setup() {
  const entries = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, value),
    },
    dispatchEvent: () => undefined,
  };
  return entries;
}

function result(id = "result-1") {
  return {
    id,
    playerId: "test-player",
    exerciseId: "catch-40",
    completedAt: "2026-11-02T17:00:00.000Z",
    metrics: { score: 50 },
  };
}

test("successful server save is returned and cached", async () => {
  setup();
  const record = result();
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: [record] }),
  });
  const saved = await storeModule.saveTrainingResultToSharedStore(record);
  assert.equal(saved[0].id, record.id);
  assert.equal(storeModule.getTrainingResultsForPlayer(record.playerId)[0].id, record.id);
});

test("HTTP failure retains local result but rejects the save", async () => {
  setup();
  const record = result("http-failed");
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(storeModule.saveTrainingResultToSharedStore(record), /HTTP 503/);
  assert.equal(storeModule.getTrainingResultsForPlayer(record.playerId)[0].id, record.id);
});

test("a 200 response without the saved result is not accepted", async () => {
  setup();
  const record = result("missing-confirmation");
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ results: [] }),
  });
  await assert.rejects(storeModule.saveTrainingResultToSharedStore(record), /bekræftede ikke/);
  assert.equal(storeModule.getTrainingResultsForPlayer(record.playerId)[0].id, record.id);
});

test("network failure retains the result locally and rejects", async () => {
  setup();
  const record = result("network-failed");
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(storeModule.saveTrainingResultToSharedStore(record), /offline/);
  assert.equal(storeModule.getTrainingResultsForPlayer(record.playerId)[0].id, record.id);
});


test("pending offline result survives a later successful GET synchronization", async () => {
  setup();
  const pending = result("offline-retained");
  const remote = result("already-online");
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "POST") return { ok: false, status: 503 };
    return { ok: true, json: async () => ({ results: [remote] }) };
  };
  await assert.rejects(storeModule.saveTrainingResultToSharedStore(pending), /HTTP 503/);
  const refreshed = await storeModule.syncTrainingResultsFromSharedStore(pending.playerId);
  assert.deepEqual(new Set(refreshed.map((record) => record.id)), new Set([pending.id, remote.id]));
  assert.deepEqual(new Set(storeModule.getTrainingResultsForPlayer(pending.playerId).map((record) => record.id)), new Set([pending.id, remote.id]));
});

test("pending result is cleared after retry succeeds and is not restored by later GET", async () => {
  const entries = setup();
  const pending = result("offline-then-saved");
  let serverHasResult = false;
  globalThis.fetch = async (_url, options) => {
    if (options?.method === "POST") {
      if (!serverHasResult) return { ok: false, status: 503 };
      return { ok: true, json: async () => ({ results: [pending] }) };
    }
    return { ok: true, json: async () => ({ results: serverHasResult ? [pending] : [] }) };
  };
  await assert.rejects(storeModule.saveTrainingResultToSharedStore(pending), /HTTP 503/);
  serverHasResult = true;
  await storeModule.saveTrainingResultToSharedStore(pending);
  assert.deepEqual(JSON.parse(entries.get("hesteng.pendingTrainingResults.v1")), []);
  serverHasResult = false;
  const synced = await storeModule.syncTrainingResultsFromSharedStore(pending.playerId);
  assert.deepEqual(synced, []);
});
