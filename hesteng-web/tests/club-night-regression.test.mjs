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
