import test from "node:test";
import assert from "node:assert/strict";

import {
  knownMatchBelongsToClub,
  scopeClubNightState,
  validClubNightSnapshot,
} from "../../lib/clubNightAccess.mjs";

const state = {
  version: 1,
  currentClubNightId: "b-night",
  updatedAt: "2026-10-26T18:00:00Z",
  clubNights: [
    { id: "a-night", clubId: "club-a", status: "active", matches: [{ id: "match-a", clubId: "club-a", clubNightId: "a-night" }] },
    { id: "b-night", clubId: "club-b", status: "active", matches: [{ id: "match-b", clubId: "club-b", clubNightId: "b-night" }] },
  ],
  completedMatches: [
    { id: "match-a", clubId: "club-a", clubNightId: "a-night" },
    { id: "match-b", clubId: "club-b", clubNightId: "b-night" },
    { id: "historical-a", clubId: "club-a", clubNightId: "removed-a-night" },
  ],
};

test("club-night response contains only authorized club data", () => {
  const scoped = scopeClubNightState(state, new Set(["club-a"]));
  assert.deepEqual(scoped.clubNights.map((night) => night.id), ["a-night"]);
  assert.deepEqual(scoped.completedMatches.map((match) => match.id), ["match-a", "historical-a"]);
  assert.equal(scoped.currentClubNightId, "a-night");
  assert.equal(state.clubNights.length, 2, "read scoping must not mutate the shared state");
});

test("no club membership returns no shared club-night data", () => {
  const scoped = scopeClubNightState(state, new Set());
  assert.deepEqual(scoped.clubNights, []);
  assert.deepEqual(scoped.completedMatches, []);
  assert.equal(scoped.currentClubNightId, null);
});

test("match updates must target an existing match in the same club", () => {
  assert.equal(knownMatchBelongsToClub(state, "club-a", "a-night", "match-a"), true);
  assert.equal(knownMatchBelongsToClub(state, "club-a", "b-night", "match-b"), false);
  assert.equal(knownMatchBelongsToClub(state, "club-b", "a-night", "match-a"), false);
  assert.equal(knownMatchBelongsToClub(state, "club-a", "a-night", "missing"), false);
});

test("club-night snapshot rejects duplicate nights and forged nested clubs", () => {
  const valid = state.clubNights[0];
  assert.equal(validClubNightSnapshot([valid], "club-a"), true);
  assert.equal(validClubNightSnapshot([valid, valid], "club-a"), false);
  assert.equal(validClubNightSnapshot([state.clubNights[1]], "club-a"), false);
  assert.equal(validClubNightSnapshot([{
    ...valid,
    matches: [{ id: "match-a", clubId: "club-b" }],
  }], "club-a"), false);
  assert.equal(validClubNightSnapshot([{
    ...valid,
    matches: [{ id: "match-a", clubNightId: "b-night" }],
  }], "club-a"), false);
});
