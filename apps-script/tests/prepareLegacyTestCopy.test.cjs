"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { digest, replaceVerifiedBlock, replaceVerifiedTail, prepareTestCopy, MERGED_ON_OPEN, SAFE_CLUB_IMPORT, VERIFIED_LIVE_OPEN_SHA, VERIFIED_MENU_OPEN_SHA, VERIFIED_MENU_IMPORT_SHA } =
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
    { name: "Live", type: "server_js", source: "function onOpen() {}" },
    { name: "Menu", type: "server_js", source: "function onOpen() {}" },
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


test("merge retains both original spreadsheet menus through a single onOpen", () => {
  const live = [
    "function onOpen() {", "",
    "  SpreadsheetApp.getUi()",
    '    .createMenu("🎯 Dart")', "",
    "    .addItem(",
    '      "Opdater turnering",',
    '      "runTournamentUpdate"',
    "    )", "",
    "    .addToUi();",
    "}", "",
    "function copyLiveFormatting() {}",
  ].join("\n");
  const menu = [
    "function onOpen() {",
    "  SpreadsheetApp.getUi()",
    '    .createMenu("🎯 DartConnect")',
    '    .addItem("Importer...", "chooseImportSource")',
    "    .addToUi();",
    "}", "",
    "function chooseImportSource() {}",
  ].join("\n");
  const resultLive = replaceVerifiedBlock(
    live, "function onOpen() {", "function copyLiveFormatting() {",
    VERIFIED_LIVE_OPEN_SHA, "// retired duplicate\n\n",
  );
  const resultMenu = replaceVerifiedBlock(
    menu, "function onOpen() {", "function chooseImportSource() {",
    VERIFIED_MENU_OPEN_SHA, MERGED_ON_OPEN,
  );
  const items = [];
  const ui = {
    createMenu(title) {
      const menu = { title, entries: [] };
      items.push(menu);
      return {
        addItem(label, action) {
          menu.entries.push([label, action]);
          return this;
        },
        addToUi() { return this; },
      };
    },
  };
  const context = vm.createContext({ SpreadsheetApp: { getUi() { return ui; } } });
  vm.runInContext(resultLive + "\n" + resultMenu, context);
  context.onOpen();
  assert.deepEqual(items, [
    { title: "🎯 Dart", entries: [["Opdater turnering", "runTournamentUpdate"]] },
    { title: "🎯 DartConnect", entries: [["Importer...", "chooseImportSource"]] },
  ]);
  assert.equal((resultLive + resultMenu).match(/function onOpen\s*\(/g).length, 1);
  assert.ok(resultLive.includes("function copyLiveFormatting()"));
  assert.ok(resultMenu.includes("function chooseImportSource()"));
});

test("unrecognized onOpen changes stop before any menu replacement", () => {
  assert.throws(() => replaceVerifiedBlock(
    "function onOpen() { custom() }\nfunction chooseImportSource() {}",
    "function onOpen() {", "function chooseImportSource() {",
    VERIFIED_MENU_OPEN_SHA, MERGED_ON_OPEN,
  ), /differs/);
});


test("club-only importer does nothing when user declines", () => {
  const imported = [];
  const alerts = [];
  let selection = "NO";
  const ui = {
    ButtonSet: { YES_NO: "YES_NO" },
    Button: { YES: "YES", NO: "NO" },
    alert(title, message, buttons) {
      alerts.push({ title, message, buttons });
      return ui.Button[selection];
    },
  };
  const context = vm.createContext({
    SpreadsheetApp: { getUi: () => ui },
    importRecapStats(...args) { imported.push(args); },
  });
  vm.runInContext(SAFE_CLUB_IMPORT, context);
  context.chooseImportSource();
  assert.equal(imported.length, 0);
  assert.equal(alerts[0].buttons, "YES_NO");
  assert.match(alerts[0].message, /klubbens DartConnect/);
  selection = "YES";
  context.chooseImportSource();
  assert.equal(imported.length, 1);
  assert.deepEqual(imported[0], []); // No ignored "Hjem" argument.
});

test("club-only menu rejects unfamiliar source and preserves neighbors", () => {
  const original = [
    "function onOpen() { return 1; }",
    "function chooseImportSource() {",
    "  importRecapStats('Hjem');",
    "}",
  ].join("\n");
  const start = "function chooseImportSource() {";
  assert.throws(
    () => replaceVerifiedTail(original, start, VERIFIED_MENU_IMPORT_SHA, SAFE_CLUB_IMPORT),
    /differs/,
  );
  const expectedHash = digest(original.slice(original.indexOf(start)));
  const fixed = replaceVerifiedTail(original, start, expectedHash, SAFE_CLUB_IMPORT);
  assert.match(fixed, /function onOpen/);
  assert.match(fixed, /function chooseImportSource/);
  assert.doesNotMatch(fixed, /'Hjem'/);
});

// Execute the related isolated recap-import regression suite in the same CI step.
require("./legacyRecapImportSafe.test.cjs");
