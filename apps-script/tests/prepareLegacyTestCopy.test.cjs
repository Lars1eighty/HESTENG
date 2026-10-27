"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { digest, replaceVerifiedBlock, prepareTestCopy } =
  require("../tools/prepareLegacyTestCopy.cjs");

test("removes only a checksum-verified function and preserves adjacent functions", () => {
  const start = "function buildDCMatches() {";
  const end = "function opdaterEloKlubaften() {";
  const block = start + "\n  clearHistoricalElo();\n}\n\n";
  const original = "function unrelated() {}\n" + block + end + "\n  return 1;\n}";
  const actual = replaceVerifiedBlock(original, start, end, digest(block), "// retired\n");
  assert.ok(actual.includes("function unrelated()"));
  assert.ok(actual.includes(end));
  assert.ok(!actual.includes("clearHistoricalElo"));
});

test("refuses changed destructive code rather than guessing", () => {
  assert.throws(() => replaceVerifiedBlock(
    "function buildDCMatches() { changed() }\nfunction opdaterEloKlubaften() {}",
    "function buildDCMatches() {", "function opdaterEloKlubaften() {",
    "unknown-hash", ""), /differs/);
});

test("refuses unreviewed additional global buildDCMatches", () => {
  assert.throws(() => prepareTestCopy({ files: [
    { name: "123", type: "server_js", source: "function buildDCMatches() {}" },
    { name: "dartconnectLegacyImport.", type: "server_js",
      source: "function buildDCMatches(options) {}" },
    { name: "third", type: "server_js", source: "function buildDCMatches() {}" },
  ] }), /number\/location/);
});

test("refuses missing files or unrecognized project format", () => {
  assert.throws(() => prepareTestCopy({ files: [] }), /exactly one/);
  assert.throws(() => prepareTestCopy({}), /containing files/);
});

test("refuses to remove function when its closing boundary is missing", () => {
  assert.throws(() => replaceVerifiedBlock(
    "function buildDCMatches() {}", "function buildDCMatches() {",
    "function opdaterEloKlubaften() {", "unused", ""), /following function boundary/);
});
