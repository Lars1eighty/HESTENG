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
 * Read-only UI snapshot. Players/Tilmelding/DC_Matches/Live Aktiv column layouts
 * checked against the active ELO - Torsdagslisten workbook on 2026-10-26.
 * Pools, total AVG and other statistics remain pending verification.
 */
function hestengLegacyReadOnlySnapshot(options) {
  const includeMatches = !options || options.includeMatches !== false;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("HESTENG Legacy: Intet aktivt regneark.");

  const warnings = [];
  const playersSheet = ss.getSheetByName("Players");
  const matchesSheet = ss.getSheetByName("DC_Matches");

  if (!playersSheet) warnings.push("Mangler Players; ingen spillere kan vises.");
  if (!matchesSheet) warnings.push("Mangler DC_Matches; ingen kampresultater kan vises.");

  // Confirmed active headers: Players = Navn / ELO / Sidst Spillet / Aktiv.
  const byName = Object.create(null);
  hestengLegacyReadObjectRows_(playersSheet, ["Navn", "ELO"], 5000, warnings)
    .forEach(function (row) {
      const name = String(row.Navn || "").trim();
      const key = hestengLegacyNameKey_(name);
      if (!name || !key) return;
      const rating = hestengLegacyNumber_(row.ELO);
      if (rating === null) warnings.push("Ugyldig ELO for " + name + " i Players.");
      if (byName[key]) {
        warnings.push("Dubletnavn i Players: " + name);
        return;
      }
      byName[key] = { name: name, elo: rating, registered: false };
    });

  // Confirmed active signup headers: Med / Navn / ELO.
  // ELO in these two sheets may be displayed, but Players is authoritative.
  ["Tilmelding", "Øvrige spillere"].forEach(function (sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      warnings.push("Mangler " + sheetName + ".");
      return;
    }
    hestengLegacyReadObjectRows_(sheet, ["Med", "Navn", "ELO"], 5000, warnings)
      .forEach(function (row) {
        const name = String(row.Navn || "").trim();
        if (!name) return;
        const key = hestengLegacyNameKey_(name);
        if (!byName[key]) {
          warnings.push("Ukendt spiller i " + sheetName + ": " + name + " (udeladt).");
          return;
        }
        if (row.Med === true) byName[key].registered = true;
      });
  });

  const players = Object.keys(byName).map(function (key) { return byName[key]; });
  players.sort(function (a, b) {
    return (b.elo === null ? -Infinity : b.elo)
      - (a.elo === null ? -Infinity : a.elo)
      || a.name.localeCompare(b.name, "da");
  });

  // V42 can show the confirmed Live Aktiv ranking, but its ELO values
  // are taken from Players to keep every HESTENG screen consistent.
  const liveElo = [];
  const liveSheet = ss.getSheetByName("Live Aktiv");
  if (!liveSheet) warnings.push("Mangler Live Aktiv; ELO-visning er ikke tilgængelig.");
  hestengLegacyReadObjectRows_(liveSheet, ["Rank", "Name", "ELO", "Rank Δ", "ELO Δ"], 1000, warnings)
    .forEach(function (row) {
      const key = hestengLegacyNameKey_(row.Name);
      const rank = hestengLegacyNumber_(row.Rank);
      if (!key) return;
      if (!byName[key]) {
        warnings.push("Ukendt spiller i Live Aktiv: " + String(row.Name) + " (udeladt).");
        return;
      }
      if (rank === null || !Number.isInteger(rank) || rank < 1) {
        warnings.push("Ugyldig rangering i Live Aktiv for " + byName[key].name + ".");
        return;
      }
      const liveRating = hestengLegacyNumber_(row.ELO);
      if (liveRating !== byName[key].elo) {
        warnings.push("ELO-forskel i Live Aktiv for " + byName[key].name + "; Players anvendes.");
      }
      liveElo.push({
        rank: rank,
        name: byName[key].name,
        elo: byName[key].elo,
        rankDelta: hestengLegacyOptionalNumber_(row["Rank Δ"]),
        eloDelta: hestengLegacyOptionalNumber_(row["ELO Δ"]),
      });
    });
  liveElo.sort(function (a, b) { return a.rank - b.rank; });

  const matches = [];
  if (includeMatches && matchesSheet && matchesSheet.getLastRow() > 1 && matchesSheet.getLastColumn() > 0) {
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
    liveElo: liveElo,
    matches: matches,
    warnings: warnings,
    // Intentionally missing: live pool standings, other stats, all-time AVG.
    // Never fabricate these from sample data.
  };
}

/**
 * Header-aware sheet reader. A changed schema fails closed instead of
 * accidentally treating unrelated columns as names, ELO or checkboxes.
 */
/**
 * Compatibility with the existing Leaderboard.html, which calls
 * google.script.run.getELOData(). This is only staged in GitHub:
 * the Apps Script project and its doGet have NOT been changed.
 */
function getELOData() {
  return hestengLegacyReadOnlySnapshot({ includeMatches: false }).liveElo;
}

function hestengLegacyOptionalNumber_(value) {
  const n = hestengLegacyNumber_(value);
  return n === null ? "" : n;
}

function hestengLegacyReadObjectRows_(sheet, requiredHeaders, limit, warnings) {
  if (!sheet) return [];
  const total = sheet.getLastRow();
  const width = sheet.getLastColumn();
  if (total < 1 || width < 1) {
    warnings.push(sheet.getName() + " er tomt.");
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, width).getDisplayValues()[0]
    .map(function (value) { return String(value || "").trim(); });
  const missing = requiredHeaders.filter(function (name) {
    return headers.indexOf(name) < 0;
  });
  if (missing.length) {
    warnings.push(sheet.getName() + " mangler kolonner: " + missing.join(", "));
    return [];
  }
  if (total <= 1) return [];

  const count = Math.min(total - 1, limit);
  if (total - 1 > limit) {
    warnings.push(sheet.getName() + ": viser kun de første " + count + " rækker.");
  }
  return sheet.getRange(2, 1, count, width).getValues().map(function (cells) {
    const obj = {};
    requiredHeaders.forEach(function (name) {
      obj[name] = cells[headers.indexOf(name)];
    });
    return obj;
  });
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
