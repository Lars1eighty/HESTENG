"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { inspect, topLevelNames, parseAppsScriptExport } = require("../tools/auditLegacySource.cjs");

test("finds competing global function names across files", () => {
  const report = inspect({
    "matches.gs": "function buildDCMatches() { return 1; }",
    "old.gs": "function buildDCMatches() { return 2; }",
    "other.gs": "function updateEloFromDCMatches() {}",
  });
  assert.deepEqual(report.duplicateDeclarations.map((item) => item.name), ["buildDCMatches"]);
  assert.equal(report.syntaxErrors.length, 0);
});

test("reports duplicated functions within one file as well", () => {
  const report = inspect({ "one.gs": "function shuffle() {}\nfunction shuffle() {}" });
  assert.deepEqual(report.duplicateDeclarations.map((item) => item.name), ["shuffle"]);
});

test("ignores function names in comments, strings and nested scopes", () => {
  const source = [
    '// function danger() {}',
    'const text = "function danger() {}";',
    'const tmpl = `function danger() {}`;',
    'function valid() {',
    '  function nested() { return true; }',
    '}',
  ].join("\n");
  const defs = topLevelNames(source).map((entry) => entry.name);
  assert.deepEqual(defs, ["text", "tmpl", "valid"]);
});

test("captures entrypoint and duplicate top-level bindings", () => {
  const report = inspect({
    "menu.gs": "function doGet() {}\nconst ACTIVE = 1;",
    "other.gs": "const ACTIVE = 2;",
  });
  assert.deepEqual(report.duplicateDeclarations.map((x) => x.name), ["ACTIVE"]);
  assert.deepEqual(report.entrypoints.map((x) => x.file), ["menu.gs"]);
});

test("does not execute Apps Script source during audit", () => {
  const report = inspect({
    "would-write.gs": 'SpreadsheetApp.getActive().getSheetByName("Players").clear();',
  });
  assert.equal(report.syntaxErrors.length, 0);
  assert.equal(report.scanned, 1);
});

test("invalid source is reported, not executed", () => {
  const report = inspect({ "broken.gs": "function nope( {" });
  assert.equal(report.syntaxErrors.length, 1);
});

test("a complete Apps Script JSON export reveals real top-level collisions", () => {
  const input = { files: [
    { name: "appsscript", type: "json", source: '{"timeZone":"Europe/Berlin"}' },
    { name: "Menu", type: "server_js", source: "function onOpen() {}" },
    { name: "Live", type: "server_js", source: "function onOpen() {}" },
    { name: "Index", type: "html", source: "<script>function onOpen() {}</script>" },
    { name: "New", type: "server_js", source: "function buildDCMatches() {}" },
    { name: "Old", type: "server_js", source: "function buildDCMatches() {}" },
  ] };
  const report = inspect(parseAppsScriptExport(input));
  assert.equal(report.scanned, 4);
  assert.deepEqual(report.duplicateDeclarations.map((x) => x.name), ["buildDCMatches", "onOpen"]);
});

test("source audit rejects malformed or duplicate entries safely", () => {
  assert.throws(() => parseAppsScriptExport({ files: null }), /mangler files/);
  assert.throws(() => parseAppsScriptExport({ files: [
    { name: "Menu", type: "server_js", source: "x" },
    { name: "Menu", type: "server_js", source: "y" },
  ] }), /Dubletfil/);
});
