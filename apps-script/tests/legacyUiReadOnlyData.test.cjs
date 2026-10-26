const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = readFileSync(
  join(__dirname, "..", "legacyUiReadOnlyData.gs"), "utf8",
);

function sheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0]?.length ?? 0,
    getRange: (start, column, count, width) => {
      const slice = rows.slice(start - 1, start - 1 + count)
        .map((row) => Array.from({ length: width }, (_, i) => row[column - 1 + i] ?? ""));
      return {
        getValues: () => slice,
        getDisplayValues: () => slice.map((row) => row.map(String)),
      };
    },
  };
}

function run(sheetRows) {
  const sheets = Object.fromEntries(
    Object.entries(sheetRows).map(([name, rows]) => [name, sheet(rows)]),
  );
  const workbook = {
    getName: () => "Jyden Test",
    getSpreadsheetTimeZone: () => "Europe/Copenhagen",
    getSheetByName: (name) => sheets[name] ?? null,
  };
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => workbook },
    Utilities: { formatDate: (date) => date.toISOString().slice(0, 19) },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

const header = ["MatchID", "Dato", "Vinder", "Taber", "VinderLegs", "TaberLegs", "ELO_Processed"];
const cases = {
  Players: [["Navn", "ELO"], ["Hanne", 1250], ["Lars", 1400], ["Anna", 1300]],
  Tilmelding: [["Tilmeldt", "Navn", "ELO"], [true, "Hanne", 100], [false, "Lars", 9999], [true, "Ukendt", 2500]],
  "Øvrige spillere": [["Tilmeldt", "Navn", "ELO"], [true, "Anna", 500]],
  DC_Matches: [header, ["match-1", new Date("2026-10-15T18:00:00Z"), "Lars", "Hanne", 3, 1, true]],
};

test("Players ELO is authoritative and results are sorted highest first", () => {
  const snapshot = run(cases).hestengLegacyReadOnlySnapshot();
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot.players)), [
    { name: "Lars", elo: 1400, registered: false },
    { name: "Anna", elo: 1300, registered: true },
    { name: "Hanne", elo: 1250, registered: true },
  ]);
  assert.equal(snapshot.warnings.some((s) => s.includes("Ukendt")), true);
  assert.equal(snapshot.readOnly, true);
});

test("DC_Matches is read by header name without recalculating ELO", () => {
  const snapshot = run(cases).hestengLegacyReadOnlySnapshot();
  assert.equal(snapshot.matches.length, 1);
  assert.equal(snapshot.matches[0].id, "match-1");
  assert.equal(snapshot.matches[0].winner, "Lars");
  assert.equal(snapshot.matches[0].loser, "Hanne");
  assert.equal(snapshot.matches[0].winnerLegs, 3);
  assert.equal(snapshot.matches[0].eloProcessed, "true");
});

test("unexpected DC_Matches schema fails closed with a warning", () => {
  const dataset = { ...cases, DC_Matches: [["Foo", "Dato"], ["match-1", "2026-10-15"]] };
  const snapshot = run(dataset).hestengLegacyReadOnlySnapshot();
  assert.equal(snapshot.matches.length, 0);
  assert.equal(snapshot.warnings.some((s) => s.includes("DC_Matches har andre kolonner")), true);
});

test("diagnosis reports columns without modifying the workbook", () => {
  const result = run(cases).hestengLegacyReadOnlyDiagnosis();
  const players = result.sheets.find((s) => s.name === "Players");
  assert.equal(players.rows, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(players.headers)), ["Navn", "ELO"]);
  assert.equal(result.sheets.find((s) => s.name === "Live Aktiv").exists, false);
});

test("large match histories are capped and explicitly marked incomplete", () => {
  const many = [header, ...Array.from({ length: 505 }, (_, i) => [
    "id-" + i, "2026-10-15", "Lars", "Hanne", 3, 1, true,
  ])];
  const snapshot = run({ ...cases, DC_Matches: many }).hestengLegacyReadOnlySnapshot();
  assert.equal(snapshot.matches.length, 500);
  assert.equal(snapshot.matches[0].id, "id-5");
  assert.equal(snapshot.warnings.some((s) => s.includes("historikken er ufuldstændig")), true);
});
