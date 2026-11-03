import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = readFileSync(new URL("../lib/solo501Engine.ts", import.meta.url), "utf8");
const engine = await import("data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64"));

function visit(history, score, darts = 3, doubleAttempts = 0, bust = false, targetLegs = 1) {
  return engine.record501Visit(history, { score, darts, doubleAttempts, bust }, targetLegs);
}

test("501: nine dart leg has exact darts, average and first-nine stats", () => {
  let visits = [];
  visits = visit(visits, 180);
  visits = visit(visits, 180);
  visits = visit(visits, 141, 3, 1);
  const result = engine.summarize501(visits, 1);
  assert.equal(result.metrics.darts, 9);
  assert.equal(result.metrics.threeDartAverage, 167);
  assert.equal(result.metrics.first9Average, 167);
  assert.equal(result.metrics.checkouts, 1);
  assert.equal(result.metrics.oneEighties, 2);
  assert.equal(result.metrics.checkout, 141);
  assert.equal(result.metrics.checkoutPercent, 100);
  assert.equal(result.details.legs[0].darts, 9);
});

test("501: three legs stay one session and reset the next leg to 501", () => {
  let visits = [];
  for (let leg = 0; leg < 3; leg += 1) {
    assert.equal(engine.remaining501(visits), 501);
    visits = visit(visits, 180, 3, 0, false, 3);
    visits = visit(visits, 180, 3, 0, false, 3);
    visits = visit(visits, 141, 3, 1, false, 3);
  }
  assert.equal(engine.finished501Legs(visits), 3);
  assert.equal(engine.summarize501(visits, 3).details.legs.length, 3);
  assert.throws(() => visit(visits, 60, 3, 0, false, 3), /afsluttet/);
});

test("501: checkout on first dart uses one dart, not three", () => {
  let visits = [];
  for (const score of [100, 100, 100, 100]) visits = visit(visits, score);
  visits = visit(visits, 101, 1, 1);
  const summary = engine.summarize501(visits, 1);
  assert.equal(summary.metrics.darts, 13);
  assert.equal(summary.metrics.threeDartAverage, 115.6);
  assert.equal(summary.details.legs[0].darts, 13);
});

test("501: bust scores zero while counting the selected number of darts", () => {
  let visits = [];
  visits = visit(visits, 100);
  visits = visit(visits, 0, 2, 1, true);
  assert.equal(engine.remaining501(visits), 401);
  assert.equal(visits.at(-1).after, 401);
  assert.equal(visits.at(-1).darts, 2);
  assert.equal(visits.at(-1).doubleAttempts, 1);
});

test("501: impossible remaining, bust and invalid double attempt are rejected", () => {
  let visits = [];
  for (const score of [100, 100, 100, 100]) visits = visit(visits, score);
  assert.throws(() => visit(visits, 100), /Bust/); // Leaves one
  assert.throws(() => visit(visits, 101), /doubleforsøg/i);
  assert.throws(() => visit(visits, 101, 1, 2), /overstige/);
  assert.equal(engine.remaining501(visits), 101);
});

test("501: two missed doubles and one successful double yield 33.3 percent", () => {
  let visits = [];
  for (const score of [100, 100, 100, 100]) visits = visit(visits, score);
  visits = visit(visits, 0, 3, 2);
  visits = visit(visits, 101, 3, 1);
  const summary = engine.summarize501(visits, 1);
  assert.equal(summary.metrics.checkoutAttempts, 3);
  assert.equal(summary.metrics.checkoutPercent, 33.3);
  assert.equal(summary.metrics.busts, 0);
});

test("501: undo by dropping the last visit restores the earlier remainder", () => {
  let visits = visit([], 60);
  visits = visit(visits, 140);
  assert.equal(engine.remaining501(visits), 301);
  assert.equal(engine.remaining501(visits.slice(0, -1)), 441);
  assert.throws(() => engine.summarize501(visits, 1), /færdige/);
});
