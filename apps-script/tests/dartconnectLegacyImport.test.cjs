"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Run the committed Legacy importer with a fully isolated SpreadsheetApp
// fake. No Gmail, Google Sheets or DartConnect/network calls are permitted.
const source = fs.readFileSync(
  path.join(__dirname, "../dartconnectLegacyImport.gs"), "utf8",
);

const MATCH_HEADERS = [
  "MatchID", "Dato", "Vinder", "Taber", "VinderLegs", "TaberLegs",
  "ELO_Processed", "ELO1_Før", "ELO1_Efter", "ΔELO1", "ELO2_Før",
  "ELO2_Efter", "ΔELO2", "MatchLengthSeconds", "LegsPlayed",
  "AvgSecondsPerLeg",
];

const RAW_HEADERS = [
  "MatchID", "Dato", "Game", "Player", "Starter", "3DA", "PPD",
  "TurnOrder", "Win", "RD", "CO", "StartScore", "PointsRemaining",
  "DartsThrown", "PointsScored", "180", "HatTrick", "9M",
  "MatchWinner", "Opponent",
];

function legRow(id, game, name, winner, opponent, didWin) {
  return [id, "2026-10-15", game, name, "", 55, 18, 1,
    didWin ? "W" : "", 12, "", 501, 0, 36, 501, 0, 0, 0,
    winner, opponent];
}

function makeSheet(initialRows) {
  const cells = structuredClone(initialRows);
  const writes = [];

  const lastRow = () => {
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i].some((v) => v !== "" && v != null)) return i + 1;
    }
    return 0;
  };
  const lastColumn = () => Math.max(1, ...cells.map((row) => row.length));
  const getRange = (row, col, rowCount = 1, columnCount = 1) => ({
    getValues: () => Array.from({ length: rowCount }, (_, r) =>
      Array.from({ length: columnCount }, (_, c) =>
        cells[row + r - 1]?.[col + c - 1] ?? "")),
    clearContent() {
      for (let r = 0; r < rowCount; r++) {
        for (let c = 0; c < columnCount; c++) {
          const i = row + r - 1;
          cells[i] ||= [];
          cells[i][col + c - 1] = "";
        }
      }
      writes.push({ action: "clear", row, col, rowCount, columnCount });
      return this;
    },
    setValues(rows) {
      assert.equal(rows.length, rowCount);
      for (let r = 0; r < rowCount; r++) {
        assert.equal(rows[r].length, columnCount);
        const i = row + r - 1;
        cells[i] ||= [];
        for (let c = 0; c < columnCount; c++) {
          cells[i][col + c - 1] = rows[r][c];
        }
      }
      writes.push({ action: "set", row, col, rowCount, columnCount });
      return this;
    },
  });

  return {
    getLastRow: lastRow,
    getLastColumn: lastColumn,
    getDataRange: () => getRange(1, 1, lastRow(), lastColumn()),
    getRange,
    getRows: () => getRange(1, 1, lastRow(), lastColumn()).getValues(),
    writes,
  };
}

function harness() {
  const oldMatch = [
    "old-match", "2026-10-15", "Player A", "Player B", 3, 1,
    "X", 1210, 1220, 10, 1190, 1180, -10, 450, 4, 112.5,
  ];
  const raw = [RAW_HEADERS];
  [
    ["old-match", "Player A", "Player B", [true, true, true, false]],
    ["new-match", "Player C", "Player D", [true, true, true, false]],
  ].forEach(([id, winner, loser, results]) => {
    results.forEach((win, i) => {
      raw.push(legRow(id, "1." + (i + 1), winner, winner, loser, win));
      raw.push(legRow(id, "1." + (i + 1), loser, winner, winner, !win));
    });
  });
  const rawSheet = makeSheet(raw);
  const matchSheet = makeSheet([MATCH_HEADERS, oldMatch]);
  const sheets = new Map([
    ["DC_Raw", rawSheet], ["DC_Matches", matchSheet],
  ]);
  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => { throw new Error("Unexpected sheet creation: " + name); },
  };
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet },
    UrlFetchApp: { fetch: () => { throw new Error("Network must not be used"); } },
    GmailApp: { search: () => { throw new Error("Gmail must not be used"); } },
    Logger: { log() {} },
  });
  vm.runInContext(source, context, { filename: "dartconnectLegacyImport.gs", timeout: 2000 });

  function build() {
    return vm.runInContext("buildDCMatches({ fetchMissingTiming: false })",
      context, { timeout: 2000 });
  }
  function match(id) {
    const row = matchSheet.getRows().slice(1).find((r) => r[0] === id);
    return row && Object.fromEntries(MATCH_HEADERS.map((key, i) => [key, row[i]]));
  }
  return { build, match, matchSheet, oldMatch };
}

test("DartConnect W marks one leg win", () => {
  const sandbox = vm.createContext({});
  vm.runInContext(source, sandbox, { timeout: 2000 });
  assert.equal(vm.runInContext('isTruthyWin_("W")', sandbox), true);
  assert.equal(vm.runInContext('isTruthyWin_("w")', sandbox), true);
  assert.equal(vm.runInContext('isTruthyWin_("")', sandbox), false);
});

test("a new DartConnect match gets its exact 3-1 leg score", () => {
  const h = harness();
  h.build();
  const match = h.match("new-match");
  assert.equal(match.Vinder, "Player C");
  assert.equal(match.Taber, "Player D");
  assert.equal(match.VinderLegs, 3);
  assert.equal(match.TaberLegs, 1);
  assert.equal(match.ELO_Processed, "");
});

test("a processed match retains the X flag, ELO and timing", () => {
  const h = harness();
  h.build();
  const match = h.match("old-match");
  assert.equal(match.ELO_Processed, "X");
  assert.equal(match.ELO1_Før, 1210);
  assert.equal(match.ELO1_Efter, 1220);
  assert.equal(match["ΔELO1"], 10);
  assert.equal(match.ELO2_Efter, 1180);
  assert.equal(match.MatchLengthSeconds, 450);
  assert.equal(match.AvgSecondsPerLeg, 112.5);
});

test("running the same import twice does not reset ELO or add duplicate matches", () => {
  const h = harness();
  h.build();
  const first = h.matchSheet.getRows();
  h.build();
  assert.deepEqual(h.matchSheet.getRows(), first);
  assert.equal(h.matchSheet.getRows().length, 3);
  assert.equal(h.match("old-match").ELO_Processed, "X");
});

test("the importer does not write to the raw input sheet", () => {
  const h = harness();
  h.build();
  assert.ok(h.matchSheet.writes.length);
});
