/**
 * HESTENG Legacy: read-only adapter for a future UI.
 *
 * No doGet(), triggers, Gmail access, sheet writes or ELO calculations.
 * Designed to live alongside the existing DartConnect / Legacy scripts.
 * Do NOT expose these functions through a public, unauthenticated web app:
 * player names, attendance and match history are club data.
 *
 * The active production spreadsheet must be checked before deployment.
 */

/** Schema-only check: safe to run without changing a sheet. */
function hestengLegacyReadOnlyDiagnosis() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("HESTENG Legacy: Intet aktivt regneark.");

  const names = [
    "Players", "Tilmelding", "Øvrige spillere",
    "DC_Matches", "DC_Raw", "Live Aktiv",
  ];
  return {
    version: 1,
    spreadsheet: ss.getName(),
    sheets: names.map(function (name) {
      const sheet = ss.getSheetByName(name);
      if (!sheet) return { name: name, exists: false, rows: 0, headers: [] };
      const columns = sheet.getLastColumn();
      return {
        name: name,
        exists: true,
        rows: Math.max(0, sheet.getLastRow() - 1),
        headers: columns && sheet.getLastRow()
          ? sheet.getRange(1, 1, 1, columns).getDisplayValues()[0]
          : [],
      };
    }),
  };
}

/**
 * Initial read-only UI snapshot. Only fields confirmed in the saved Legacy
 * source files are mapped. Pools, total AVG and live rankings remain pending
 * until their actual sheet layouts have been verified.
 */
function hestengLegacyReadOnlySnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("HESTENG Legacy: Intet aktivt regneark.");

  const warnings = [];
  const playersSheet = ss.getSheetByName("Players");
  const matchesSheet = ss.getSheetByName("DC_Matches");

  if (!playersSheet) warnings.push("Mangler Players; ingen spillere kan vises.");
  if (!matchesSheet) warnings.push("Mangler DC_Matches; ingen kampresultater kan vises.");

  // Players: A = navn, B = ELO (confirmed in the existing Legacy scripts).
  const byName = {};
  hestengLegacyReadRows_(playersSheet, 2, 5000).forEach(function (row) {
    const name = String(row[0] || "").trim();
    const key = hestengLegacyNameKey_(name);
    if (!name || !key) return;
    const rating = hestengLegacyNumber_(row[1]);
    if (rating === null) warnings.push("Ugyldig ELO for " + name + " i Players.");
    if (byName[key]) {
      warnings.push("Dubletnavn i Players: " + name);
      return;
    }
    byName[key] = { name: name, elo: rating, registered: false };
  });

  // Tilmelding / Øvrige spillere: A = checkbox, B = navn, C = ELO.
  // ELO is ALWAYS read from Players, never from the signup list.
  ["Tilmelding", "Øvrige spillere"].forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      warnings.push("Mangler " + sheetName + ".");
      return;
    }
    hestengLegacyReadRows_(sheet, 3, 5000).forEach(function (row) {
      const name = String(row[1] || "").trim();
      if (!name) return;
      const key = hestengLegacyNameKey_(name);
      if (!byName[key]) {
        warnings.push("Ukendt spiller i " + sheetName + ": " + name + " (udeladt).");
        return;
      }
      if (row[0] === true) byName[key].registered = true;
    });
  });

  const players = Object.keys(byName).map(function (key) { return byName[key]; });
  players.sort(function (a, b) {
    return (b.elo === null ? -Infinity : b.elo)
      - (a.elo === null ? -Infinity : a.elo)
      || a.name.localeCompare(b.name, "da");
  });

  const matches = [];
  if (matchesSheet && matchesSheet.getLastRow() > 1 && matchesSheet.getLastColumn() > 0) {
    const headers = matchesSheet.getRange(1, 1, 1, matchesSheet.getLastColumn())
      .getDisplayValues()[0].map(function (h) { return String(h || "").trim(); });
    const names = ["MatchID", "Dato", "Vinder", "Taber", "VinderLegs", "TaberLegs"];
    const missing = names.filter(function (h) { return headers.indexOf(h) < 0; });
    if (missing.length) {
      warnings.push("DC_Matches har andre kolonner end forventet: " + missing.join(", "));
    } else {
      const rowLimit = 500;
      const totalRows = matchesSheet.getLastRow() - 1;
      const count = Math.min(rowLimit, totalRows);
      const firstRow = matchesSheet.getLastRow() - count + 1;
      if (totalRows > count) {
        warnings.push("Kun de sidste " + count + " rækker fra DC_Matches er læst; historikken er ufuldstændig.");
      }
      const rows = matchesSheet.getRange(firstRow, 1, count, headers.length).getValues();
      const column = function (row, name) {
        const i = headers.indexOf(name);
        return i < 0 ? "" : row[i];
      };
      rows.forEach(function (row) {
        const id = String(column(row, "MatchID") || "").trim();
        if (!id) return;
        matches.push({
          id: id,
          date: hestengLegacyDate_(column(row, "Dato"), ss.getSpreadsheetTimeZone()),
          winner: String(column(row, "Vinder") || "").trim(),
          loser: String(column(row, "Taber") || "").trim(),
          winnerLegs: hestengLegacyNumber_(column(row, "VinderLegs")),
          loserLegs: hestengLegacyNumber_(column(row, "TaberLegs")),
          eloProcessed: String(column(row, "ELO_Processed") || "").trim(),
        });
      });
    }
  }

  return {
    version: 1,
    readOnly: true,
    generatedAt: new Date().toISOString(),
    players: players,
    matches: matches,
    warnings: warnings,
    // Intentionally missing: pools, live TV stats, and all-time AVG.
    // Never fabricate these from sample data.
  };
}

function hestengLegacyReadRows_(sheet, columns, limit) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const count = Math.min(sheet.getLastRow() - 1, limit);
  return sheet.getRange(2, 1, count, columns).getValues();
}

function hestengLegacyNameKey_(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("da");
}

function hestengLegacyNumber_(value) {
  if (value === "" || value === null || typeof value === "undefined") return null;
  const n = Number(typeof value === "string" ? value.replace(",", ".") : value);
  return isFinite(n) ? n : null;
}

function hestengLegacyDate_(value, timezone) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value || "").trim();
}
