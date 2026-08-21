const DC_RAW_SHEET_NAME = "DC_Raw";
const DC_MATCHES_SHEET_NAME = "DC_Matches";
const DARTCONNECT_RECAP_FROM_QUERY = "from:matchrecap@email.dartconnect.com in:inbox -label:elo-processed";

const DC_MATCHES_REQUIRED_HEADERS = [
  "MatchID",
  "Dato",
  "Vinder",
  "Taber",
  "VinderLegs",
  "TaberLegs",
  "ELO_Processed",
  "MatchLengthSeconds",
  "LegsPlayed",
  "AvgSecondsPerLeg",
];

const DC_MATCHES_ELO_HEADERS = [
  "ELO1_Før",
  "ELO1_Efter",
  "ΔELO1",
  "ELO2_Før",
  "ELO2_Efter",
  "ΔELO2",
];

const DC_RAW_DEFAULT_HEADERS = [
  "MatchID",
  "Dato",
  "Game",
  "Player",
  "Win",
  "MatchWinner",
  "Opponent",
  "Set",
  "GameName",
  "StartingPlayer",
  "TurnOrder",
  "StartingPoints",
  "EndingPoints",
  "PointsScored",
  "DartsThrown",
  "PPR",
  "PPD",
  "RoundWinningTurn",
  "DoubleOutPoints",
  "RecapUrl",
];

function backfillInbox183() {
  const query = "in:inbox from:matchrecap@email.dartconnect.com -label:elo-processed";
  const processedLabel = getOrCreateGmailLabel_("elo-processed");
  const threads = GmailApp.search(query, 0, 183);
  const results = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  threads.forEach(function (thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const result = importRecapMessage_(message, {
      writeRaw: true,
      markProcessed: false,
      ignoreImportWindow: true,
    });

    if (result.status === "imported" || result.status === "skipped") {
      thread.addLabel(processedLabel);
    }

    if (result.status === "imported") imported += 1;
    else if (result.status === "skipped") skipped += 1;
    else failed += 1;

    results.push({
      MatchID: result.matchId,
      Subject: message.getSubject(),
      Dato: message.getDate(),
      RowsWritten: result.rowsWritten,
      Status: result.status,
      Error: result.error,
    });
  });

  const summary = {
    scanned: threads.length,
    imported: imported,
    skipped: skipped,
    failed: failed,
    stoppedAfter: 183,
    results: results,
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function testBackfillInbox5() {
  const query = "in:inbox from:matchrecap@email.dartconnect.com -label:elo-processed";
  const threads = GmailApp.search(query, 0, 5);
  const results = [];

  threads.forEach(function (thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const result = importRecapMessage_(message, {
      writeRaw: false,
      markProcessed: false,
      ignoreImportWindow: true,
    });

    results.push({
      MatchID: result.matchId,
      Subject: message.getSubject(),
      Dato: message.getDate(),
      RowsWouldBeWritten: result.rawRows ? result.rawRows.length : 0,
      Status: result.status,
      Error: result.error,
    });
  });

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function backfillDartConnect25() {
  return backfillDartConnectBatch_(25, { testMode: false });
}

function testBackfillDartConnect25() {
  return backfillDartConnectBatch_(5, { testMode: true });
}

function backfillDartConnectBatch_(limit, options) {
  const settings = Object.assign({ testMode: true }, options || {});
  const maxMessages = Math.min(Math.max(Number(limit) || 25, 1), 25);
  const processedLabel = getOrCreateGmailLabel_("elo-processed");
  const threads = GmailApp.search(DARTCONNECT_RECAP_FROM_QUERY, 0, maxMessages);
  const results = [];
  let imported = 0;
  let failed = 0;
  let alreadyProcessed = 0;

  threads.forEach(function (thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const subject = message.getSubject();
    const body = subject + "\n" + message.getPlainBody() + "\n" + message.getBody();
    const recap = extractDartConnectRecapLink_(body);
    const parsedSubject = parseDartConnectSubject_(subject);

    if (!recap) {
      failed += 1;
      results.push(createBackfillResult_("", parsedSubject, subject, null, "failed", "missing recap link"));
      return;
    }

    const timing = fetchDartConnectTiming_(recap.matchId);
    const beforeRawCount = countDCRawRowsForMatchId_(recap.matchId);
    let importResult = null;
    let importError = "";

    try {
      importResult = importRecapMessageForBackfill_(message, recap, beforeRawCount, settings);
    } catch (error) {
      importError = String(error && error.message ? error.message : error);
    }

    const afterRawCount = settings.testMode ? beforeRawCount : countDCRawRowsForMatchId_(recap.matchId);
    const rawWasImported = settings.testMode
      ? true
      : Boolean(importResult && importResult.success) || afterRawCount > beforeRawCount || (beforeRawCount > 0 && importResult !== false);

    if (!rawWasImported || importError) {
      failed += 1;
      results.push(createBackfillResult_(
        recap.matchId,
        parsedSubject,
        subject,
        timing,
        "failed",
        importError || "importRecapStats did not report/import DC_Raw rows"
      ));
      return;
    }

    if (!settings.testMode) {
      try {
        if (timing) {
          writeDCTimingToDCMatches(recap.matchId, createTimingDataPageHtml_(timing));
        }
        buildDCMatches({ matchIds: [recap.matchId], fetchMissingTiming: true });
        message.getThread().addLabel(processedLabel);
      } catch (error) {
        failed += 1;
        results.push(createBackfillResult_(
          recap.matchId,
          parsedSubject,
          subject,
          timing,
          "failed",
          String(error && error.message ? error.message : error)
        ));
        return;
      }
    }

    imported += 1;
    if (beforeRawCount > 0) alreadyProcessed += 1;
    results.push(createBackfillResult_(
      recap.matchId,
      parsedSubject,
      subject,
      timing,
      settings.testMode ? "test" : "imported",
      beforeRawCount > 0
        ? "MatchID already existed in DC_Raw"
        : "rowsWritten=" + (importResult && importResult.rowsWritten ? importResult.rowsWritten : 0)
    ));
  });

  const summary = {
    testMode: settings.testMode,
    scanned: threads.length,
    imported: imported,
    failed: failed,
    alreadyProcessed: alreadyProcessed,
    stoppedAfter: maxMessages,
    results: results,
  };

  Logger.log(JSON.stringify(summary, null, 2));
  return summary;
}

function importRecapMessageForBackfill_(message, recap, existingRawRows, settings) {
  if (existingRawRows > 0) {
    return {
      success: true,
      skippedRawImport: true,
      reason: "MatchID already exists in DC_Raw",
      matchId: recap.matchId,
    };
  }

  return importRecapMessage_(message, {
    matchId: recap.matchId,
    recapUrl: recap.url,
    markProcessed: false,
    writeRaw: !settings.testMode,
    writeMatches: false,
    testMode: settings.testMode,
  });
}

function importRecapMessage_(msg, options) {
  const settings = Object.assign({
    writeRaw: true,
    markProcessed: false,
    matchId: "",
    recapUrl: "",
    testMode: false,
    ignoreImportWindow: false,
  }, options || {});

  const subject = msg.getSubject();
  const body = subject + "\n" + msg.getBody();
  const recap = settings.matchId && settings.recapUrl
    ? { matchId: settings.matchId, url: settings.recapUrl }
    : extractDartConnectRecapLink_(body);

  if (!recap || !recap.matchId) {
    return createImportStatus_("", 0, "error", "missing recap MatchID");
  }

  if (!settings.ignoreImportWindow && !isLegacyRecapImportWindow_(msg.getDate())) {
    return createImportStatus_(recap.matchId, 0, "skipped", "outside 19:04 Thursday import window");
  }

  const existingRows = countDCRawRowsForMatchId_(recap.matchId);
  if (existingRows > 0) {
    if (settings.markProcessed) msg.getThread().addLabel(getOrCreateGmailLabel_("elo-processed"));
    return createImportStatus_(recap.matchId, 0, "skipped", "MatchID already exists in DC_Raw");
  }

  let page;
  try {
    page = fetchDartConnectPlayersPage_(recap.matchId);
  } catch (error) {
    return createImportStatus_(recap.matchId, 0, "error", String(error && error.message ? error.message : error));
  }

  const rawRows = buildDCRawRowsFromPlayersPage_(page, recap);
  if (rawRows.length === 0) {
    return createImportStatus_(recap.matchId, 0, "error", "no playersPerGame rows found");
  }

  if (!settings.writeRaw) {
    return createImportStatus_(recap.matchId, 0, "dry-run", "", rawRows);
  }

  try {
    appendDCRawRows_(rawRows);
  } catch (error) {
    return createImportStatus_(recap.matchId, 0, "error", String(error && error.message ? error.message : error));
  }

  if (settings.markProcessed) msg.getThread().addLabel(getOrCreateGmailLabel_("elo-processed"));

  return createImportStatus_(recap.matchId, rawRows.length, "imported", "");
}

function buildDCMatches(options) {
  const buildOptions = Object.assign({ fetchMissingTiming: true, matchIds: null }, options || {});
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName(DC_RAW_SHEET_NAME);
  if (!rawSheet) throw new Error("Missing sheet: " + DC_RAW_SHEET_NAME);

  const rawValues = rawSheet.getDataRange().getValues();
  if (rawValues.length < 2) return { matches: 0, updated: 0, timingUpdated: 0 };

  const rawHeaders = rawValues[0].map(String);
  const rawHeaderMap = createHeaderMap_(rawHeaders);
  const matchGroups = groupDCRawByMatchId_(rawValues.slice(1), rawHeaderMap);
  const selectedMatchIds = buildOptions.matchIds
    ? buildOptions.matchIds.reduce(function (map, matchId) {
      map[String(matchId)] = true;
      return map;
    }, {})
    : null;

  const matchesSheet = getOrCreateSheet_(ss, DC_MATCHES_SHEET_NAME);
  const setup = ensureDCMatchesHeaders_(matchesSheet);
  const headers = setup.headers;
  const headerMap = createHeaderMap_(headers);
  const existing = readExistingDCMatches_(matchesSheet, headerMap);

  let updated = 0;
  let timingUpdated = 0;

  Object.keys(matchGroups).forEach(function (matchId) {
    if (selectedMatchIds && !selectedMatchIds[matchId]) return;
    const aggregate = aggregateDCRawMatch_(matchId, matchGroups[matchId], rawHeaderMap);
    const current = existing.byMatchId[matchId] || createEmptyRowObject_(headers);

    current.MatchID = matchId;
    current.Dato = current.Dato || aggregate.date || "";
    current.Vinder = aggregate.winner || current.Vinder || "";
    current.Taber = aggregate.loser || current.Taber || "";
    current.VinderLegs = aggregate.winnerLegs !== "" ? aggregate.winnerLegs : current.VinderLegs || "";
    current.TaberLegs = aggregate.loserLegs !== "" ? aggregate.loserLegs : current.TaberLegs || "";
    current.ELO_Processed = current.ELO_Processed || "";

    if (buildOptions.fetchMissingTiming && hasMissingTiming_(current)) {
      const timing = fetchDartConnectTiming_(matchId);
      if (timing) {
        applyTimingToRow_(current, timing);
        timingUpdated += 1;
      } else {
        Logger.log("Timing not found for MatchID " + matchId);
      }
    }

    existing.byMatchId[matchId] = current;
    updated += 1;
  });

  writeDCMatches_(matchesSheet, headers, existing.byMatchId, existing.order);
  return { matches: Object.keys(matchGroups).length, updated: updated, timingUpdated: timingUpdated };
}

function writeDCTimingToDCMatches(matchId, recapHtml) {
  const timing = parseDartConnectTimingFromHtml_(recapHtml, matchId);
  if (!timing) {
    Logger.log("Timing parse failed for MatchID " + matchId);
    return null;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, DC_MATCHES_SHEET_NAME);
  const setup = ensureDCMatchesHeaders_(sheet);
  const headers = setup.headers;
  const headerMap = createHeaderMap_(headers);
  const existing = readExistingDCMatches_(sheet, headerMap);
  const rowObject = existing.byMatchId[matchId] || createEmptyRowObject_(headers);

  rowObject.MatchID = matchId;
  applyTimingToRow_(rowObject, timing);
  existing.byMatchId[matchId] = rowObject;
  writeDCMatches_(sheet, headers, existing.byMatchId, existing.order);

  return timing;
}

function testDartConnectTiming5() {
  const threads = GmailApp.search(DARTCONNECT_RECAP_FROM_QUERY, 0, 5);
  const results = [];

  threads.forEach(function (thread) {
    const messages = thread.getMessages();
    const message = messages[messages.length - 1];
    const subject = message.getSubject();
    const body = subject + "\n" + message.getPlainBody() + "\n" + message.getBody();
    const recap = extractDartConnectRecapLink_(body);
    if (!recap) {
      results.push({
        MatchID: "",
        Spillere: subject,
        Resultat: "",
        Legs: "",
        MatchLength: "",
        MatchLengthSeconds: "",
        AvgSecondsPerLeg: "",
        Error: "missing recap link",
      });
      return;
    }

    const html = UrlFetchApp.fetch(recap.url, { muteHttpExceptions: true }).getContentText();
    const timing = parseDartConnectTimingFromHtml_(html, recap.matchId);
    const parsedSubject = parseDartConnectSubject_(subject);

    results.push({
      MatchID: recap.matchId,
      Spillere: parsedSubject.players,
      Resultat: parsedSubject.result,
      Legs: timing ? timing.legsPlayed : "",
      MatchLength: timing ? timing.matchLength : "",
      MatchLengthSeconds: timing ? timing.durationSeconds : "",
      AvgSecondsPerLeg: timing ? timing.avgSecondsPerLeg : "",
      Error: timing ? "" : "timing parse failed",
    });
  });

  Logger.log(JSON.stringify(results, null, 2));
  return results;
}

function fetchDartConnectPlayersPage_(matchId) {
  const url = "https://recap.dartconnect.com/players/" + encodeURIComponent(matchId);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("DartConnect players fetch failed: HTTP " + code);

  const html = response.getContentText();
  const dataPageMatch = html.match(/data-page="([\s\S]*?)"/);
  if (!dataPageMatch) throw new Error("missing data-page JSON");

  return JSON.parse(decodeHtmlEntities_(dataPageMatch[1]));
}

function buildDCRawRowsFromPlayersPage_(page, recap) {
  const matchInfo = page && page.props ? page.props.matchInfo || {} : {};
  const playersPerGame = page && page.props ? page.props.playersPerGame || [] : [];
  const opponents = matchInfo.opponents || [];
  const matchWinnerIndex = Number(matchInfo.match_winner);
  const matchWinner = opponents[matchWinnerIndex] ? opponents[matchWinnerIndex].name : "";
  const date = matchInfo.server_match_start_date || matchInfo.match_start_date || "";
  const rows = [];

  flattenPlayersPerGame_(playersPerGame).forEach(function (playerGame) {
    const player = playerGame.name || "";
    const opponent = getOpponentNameForPlayerGame_(playerGame, opponents, player);
    rows.push({
      MatchID: recap.matchId,
      match_id: recap.matchId,
      Dato: date,
      Date: date,
      Game: playerGame.set_game_number || playerGame.game_number || "",
      Leg: playerGame.set_game_number || playerGame.game_number || "",
      LegNr: playerGame.set_game_number || playerGame.game_number || "",
      Player: player,
      Spiller: player,
      Win: playerGame.player_win || "",
      player_win: playerGame.player_win || "",
      PlayerWin: playerGame.player_win || "",
      MatchWinner: matchWinner,
      "Match Winner": matchWinner,
      Opponent: opponent,
      Modstander: opponent,
      Set: playerGame.set_number || "",
      GameName: playerGame.game_name || "",
      StartingPlayer: playerGame.is_starting === true ? "Y" : "",
      TurnOrder: playerGame.turn_order || "",
      StartingPoints: valueOrEmpty_(playerGame.starting_points),
      EndingPoints: valueOrEmpty_(playerGame.ending_points),
      PointsScored: valueOrEmpty_(playerGame.points_scored),
      DartsThrown: valueOrEmpty_(playerGame.darts_thrown),
      PPR: valueOrEmpty_(playerGame.ppr),
      PPD: valueOrEmpty_(playerGame.ppd),
      RoundWinningTurn: valueOrEmpty_(playerGame.round_winning_turn),
      DoubleOutPoints: valueOrEmpty_(playerGame.double_out_points),
      RecapUrl: recap.url,
      match_start_date: matchInfo.match_start_date || "",
      match_end_date: matchInfo.match_end_date || "",
      match_length: matchInfo.match_length || matchInfo.game_time || "",
      total_games: valueOrEmpty_(matchInfo.total_games),
      opponent_index: valueOrEmpty_(playerGame.opponent_index),
      set_number: valueOrEmpty_(playerGame.set_number),
      set_game_number: valueOrEmpty_(playerGame.set_game_number),
      name: player,
      game_name: playerGame.game_name || "",
      cork_won: valueOrEmpty_(playerGame.cork_won),
      is_starting: valueOrEmpty_(playerGame.is_starting),
      partner_xpr: valueOrEmpty_(playerGame.partner_xpr),
      ppr: valueOrEmpty_(playerGame.ppr),
      ppd: valueOrEmpty_(playerGame.ppd),
      turn_order: valueOrEmpty_(playerGame.turn_order),
      round_winning_turn: valueOrEmpty_(playerGame.round_winning_turn),
      double_out_points: valueOrEmpty_(playerGame.double_out_points),
      ending_points: valueOrEmpty_(playerGame.ending_points),
      starting_points: valueOrEmpty_(playerGame.starting_points),
      darts_thrown: valueOrEmpty_(playerGame.darts_thrown),
      points_scored: valueOrEmpty_(playerGame.points_scored),
      marks_scored: valueOrEmpty_(playerGame.marks_scored),
      hat_trick_cnt: valueOrEmpty_(playerGame.hat_trick_cnt),
      one_hundred_eighties: valueOrEmpty_(playerGame.one_hundred_eighties),
      nine_marks: valueOrEmpty_(playerGame.nine_marks),
    });
  });

  return rows;
}

function appendDCRawRows_(rowObjects) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet_(ss, DC_RAW_SHEET_NAME);
  const headers = ensureDCRawHeaders_(sheet);
  const rows = rowObjects.map(function (rowObject) {
    return headers.map(function (header) {
      return rowObject[header] !== undefined ? rowObject[header] : "";
    });
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
  }
}

function ensureDCRawHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String)
    : [];

  if (headers.length === 1 && headers[0] === "") headers = [];
  if (headers.length === 0) {
    headers = DC_RAW_DEFAULT_HEADERS.slice();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return headers;
}

function flattenPlayersPerGame_(playersPerGame) {
  const rows = [];

  function visit(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object" && value.name) rows.push(value);
  }

  visit(playersPerGame);
  return rows;
}

function getOpponentNameForPlayerGame_(playerGame, opponents, playerName) {
  const opponent = opponents.filter(function (item, index) {
    if (index === Number(playerGame.opponent_index)) return false;
    return item && item.name && item.name !== playerName;
  })[0];

  return opponent ? opponent.name : "";
}

function createImportStatus_(matchId, rowsWritten, status, error, rawRows) {
  return {
    success: status === "imported" || status === "dry-run" || status === "skipped",
    matchId: matchId || "",
    rowsWritten: rowsWritten || 0,
    status: status,
    skipped: status === "skipped",
    error: error || "",
    rawRows: rawRows || undefined,
  };
}

function createBackfillResult_(matchId, parsedSubject, subject, timing, status, note) {
  return {
    MatchID: matchId || "",
    Spillere: parsedSubject.players || subject || "",
    Resultat: parsedSubject.result || "",
    Legs: timing ? timing.legsPlayed : "",
    MatchLength: timing ? timing.matchLength : "",
    MatchLengthSeconds: timing ? timing.durationSeconds : "",
    AvgSecondsPerLeg: timing ? timing.avgSecondsPerLeg : "",
    Status: status,
    Note: note || "",
  };
}

function countDCRawRowsForMatchId_(matchId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(DC_RAW_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return 0;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const headerMap = createHeaderMap_(headers);
  const matchIdIndex = getColumnIndex_(headerMap, ["MatchID", "match_id"]);
  if (matchIdIndex < 0) return 0;

  const values = sheet.getRange(2, matchIdIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  return values.reduce(function (count, row) {
    return String(row[0] || "").trim() === matchId ? count + 1 : count;
  }, 0);
}

function createTimingDataPageHtml_(timing) {
  const page = {
    props: {
      matchInfo: {
        id: timing.matchId,
        match_length: timing.matchLength,
        total_games: timing.legsPlayed,
      },
    },
  };

  return '<div data-page="' + encodeHtmlAttribute_(JSON.stringify(page)) + '"></div>';
}

function groupDCRawByMatchId_(rows, headerMap) {
  const matchIdIndex = getRequiredColumnIndex_(headerMap, ["MatchID", "match_id"]);
  const groups = {};

  rows.forEach(function (row) {
    const matchId = String(row[matchIdIndex] || "").trim();
    if (!matchId) return;
    if (!groups[matchId]) groups[matchId] = [];
    groups[matchId].push(row);
  });

  return groups;
}

function aggregateDCRawMatch_(matchId, rows, headerMap) {
  const dateIndex = getColumnIndex_(headerMap, ["Dato", "Date"]);
  const gameIndex = getColumnIndex_(headerMap, ["Game", "Leg", "LegNr"]);
  const playerIndex = getRequiredColumnIndex_(headerMap, ["Player", "Spiller"]);
  const winIndex = getColumnIndex_(headerMap, ["Win", "player_win", "PlayerWin"]);
  const matchWinnerIndex = getColumnIndex_(headerMap, ["MatchWinner", "Match Winner"]);
  const opponentIndex = getColumnIndex_(headerMap, ["Opponent", "Modstander"]);

  const winsByPlayer = {};
  const seenWinGames = {};
  const players = {};
  let date = "";
  let winner = "";

  rows.forEach(function (row, rowIndex) {
    if (!date && dateIndex >= 0) date = row[dateIndex] || "";

    const player = String(row[playerIndex] || "").trim();
    const opponent = opponentIndex >= 0 ? String(row[opponentIndex] || "").trim() : "";
    const matchWinner = matchWinnerIndex >= 0 ? String(row[matchWinnerIndex] || "").trim() : "";

    if (player) players[player] = true;
    if (opponent) players[opponent] = true;
    if (!winner && matchWinner) winner = matchWinner;

    if (winIndex >= 0 && player && isTruthyWin_(row[winIndex])) {
      const gameKey = gameIndex >= 0 && row[gameIndex] !== "" ? String(row[gameIndex]) : "row-" + rowIndex;
      const winKey = gameKey + "|" + player;
      if (!seenWinGames[winKey]) {
        winsByPlayer[player] = (winsByPlayer[player] || 0) + 1;
        seenWinGames[winKey] = true;
      }
    }
  });

  if (!winner) {
    winner = Object.keys(winsByPlayer).sort(function (a, b) {
      return (winsByPlayer[b] || 0) - (winsByPlayer[a] || 0) || a.localeCompare(b);
    })[0] || "";
  }

  const playerNames = Object.keys(players);
  let loser = playerNames.filter(function (name) { return name !== winner; })[0] || "";

  if (!loser && rows.length && opponentIndex >= 0 && playerIndex >= 0) {
    rows.some(function (row) {
      const player = String(row[playerIndex] || "").trim();
      const opponent = String(row[opponentIndex] || "").trim();
      if (player === winner && opponent) {
        loser = opponent;
        return true;
      }
      if (opponent === winner && player) {
        loser = player;
        return true;
      }
      return false;
    });
  }

  const winnerLegs = winner && winsByPlayer[winner] !== undefined ? winsByPlayer[winner] : "";
  const loserLegs = loser && winsByPlayer[loser] !== undefined ? winsByPlayer[loser] : "";

  if (winnerLegs === "" || loserLegs === "") {
    Logger.log("Could not safely calculate legs for MatchID " + matchId);
  }

  return {
    date: date,
    winner: winner,
    loser: loser,
    winnerLegs: winnerLegs,
    loserLegs: loserLegs,
  };
}

function ensureDCMatchesHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  let headers = sheet.getLastRow() > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String)
    : [];

  if (headers.length === 1 && headers[0] === "") headers = [];

  DC_MATCHES_REQUIRED_HEADERS.concat(DC_MATCHES_ELO_HEADERS).forEach(function (header) {
    if (headers.indexOf(header) === -1) headers.push(header);
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return { headers: headers };
}

function readExistingDCMatches_(sheet, headerMap) {
  const values = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues()
    : [];
  const matchIdIndex = getColumnIndex_(headerMap, ["MatchID"]);
  const byMatchId = {};
  const order = [];

  values.forEach(function (row) {
    const object = {};
    Object.keys(headerMap).forEach(function (key) {
      object[key] = row[headerMap[key]] !== undefined ? row[headerMap[key]] : "";
    });
    const matchId = matchIdIndex >= 0 ? String(row[matchIdIndex] || "").trim() : "";
    if (!matchId) return;
    byMatchId[matchId] = object;
    order.push(matchId);
  });

  return { byMatchId: byMatchId, order: order };
}

function writeDCMatches_(sheet, headers, byMatchId, existingOrder) {
  const seen = {};
  const order = [];

  existingOrder.forEach(function (matchId) {
    if (byMatchId[matchId] && !seen[matchId]) {
      order.push(matchId);
      seen[matchId] = true;
    }
  });

  Object.keys(byMatchId).sort().forEach(function (matchId) {
    if (!seen[matchId]) order.push(matchId);
  });

  const rows = order.map(function (matchId) {
    const object = byMatchId[matchId];
    return headers.map(function (header) {
      return object[header] !== undefined ? object[header] : "";
    });
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function fetchDartConnectTiming_(matchId) {
  try {
    const url = "https://recap.dartconnect.com/matches/" + encodeURIComponent(matchId);
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return null;
    return parseDartConnectTimingFromHtml_(response.getContentText(), matchId);
  } catch (error) {
    Logger.log("Timing fetch failed for MatchID " + matchId + ": " + error);
    return null;
  }
}

function parseDartConnectTimingFromHtml_(html, fallbackMatchId) {
  const dataPageMatch = html.match(/data-page="([\s\S]*?)"/);
  const source = dataPageMatch ? decodeHtmlEntities_(dataPageMatch[1]) : html;

  const idMatch = source.match(/"id":"([a-z0-9]+)"/i);
  const matchLengthMatch = source.match(/"match_length":"([0-9:]+)"/) || source.match(/"game_time":"([0-9:]+)"/);
  const legsMatch = source.match(/"total_games":(\d+)/) || source.match(/"games":(\d+)/);

  const matchId = idMatch ? idMatch[1] : fallbackMatchId;
  const matchLength = matchLengthMatch ? matchLengthMatch[1] : "";
  const durationSeconds = parseMatchLengthToSeconds_(matchLength);
  const legsPlayed = legsMatch ? Number(legsMatch[1]) : null;

  if (!matchId || !durationSeconds || !legsPlayed || legsPlayed <= 0) return null;

  return {
    matchId: matchId,
    matchLength: matchLength,
    durationSeconds: durationSeconds,
    legsPlayed: legsPlayed,
    avgSecondsPerLeg: durationSeconds / legsPlayed,
  };
}

function parseMatchLengthToSeconds_(value) {
  if (!value) return null;
  const parts = String(value).trim().split(":").map(function (part) { return Number(part); });
  if (parts.some(function (part) { return !isFinite(part); })) return null;
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function applyTimingToRow_(rowObject, timing) {
  rowObject.MatchLengthSeconds = timing.durationSeconds;
  rowObject.LegsPlayed = timing.legsPlayed;
  rowObject.AvgSecondsPerLeg = timing.avgSecondsPerLeg;
}

function hasMissingTiming_(rowObject) {
  return !rowObject.MatchLengthSeconds || !rowObject.LegsPlayed || !rowObject.AvgSecondsPerLeg;
}

function extractDartConnectRecapLink_(text) {
  const patterns = [
    /https?:\/\/[^\s"'<>]+recap\.dartconnect\.com[^\s"'<>]+/gi,
    /https?:\/\/[^\s"'<>]+recap\.dartconnect\.com%2Fmatches%2F[a-z0-9]+[^\s"'<>]*/gi,
    /recap\.dartconnect\.com\/matches\/([a-z0-9]+)/gi,
    /recap\.dartconnect\.com%2Fmatches%2F([a-z0-9]+)/gi,
  ];

  for (let i = 0; i < patterns.length; i += 1) {
    const match = patterns[i].exec(text);
    if (!match) continue;
    const decoded = decodeURIComponent(match[0].replace(/&amp;/g, "&"));
    const matchId = (decoded.match(/recap\.dartconnect\.com\/matches\/([a-z0-9]+)/i) || [])[1] || match[1];
    if (!matchId) continue;
    return { matchId: matchId, url: "https://recap.dartconnect.com/matches/" + matchId };
  }

  return null;
}

function parseDartConnectSubject_(subject) {
  const match = subject.match(/^(.*?) \((\d+)\) vs\. (.*?) \((\d+)\)$/);
  if (!match) return { players: subject, result: "" };
  return {
    players: match[1] + " vs. " + match[3],
    result: match[2] + "-" + match[4],
  };
}

function createHeaderMap_(headers) {
  const map = {};
  headers.forEach(function (header, index) {
    if (header) map[String(header).trim()] = index;
  });
  return map;
}

function getColumnIndex_(headerMap, names) {
  for (let i = 0; i < names.length; i += 1) {
    if (headerMap[names[i]] !== undefined) return headerMap[names[i]];
  }
  return -1;
}

function getRequiredColumnIndex_(headerMap, names) {
  const index = getColumnIndex_(headerMap, names);
  if (index < 0) throw new Error("Missing required column: " + names.join(" / "));
  return index;
}

function createEmptyRowObject_(headers) {
  const object = {};
  headers.forEach(function (header) {
    object[header] = "";
  });
  return object;
}

function getOrCreateSheet_(spreadsheet, name) {
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function getOrCreateGmailLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function valueOrEmpty_(value) {
  return value === null || value === undefined ? "" : value;
}

function isLegacyRecapImportWindow_(date) {
  if (!(date instanceof Date)) return false;
  if (date.getDay() !== 4) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 19 * 60 + 4;
}

function isTruthyWin_(value) {
  if (value === true) return true;
  if (typeof value === "number") return value === 1;
  const normalized = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "win", "winner", "vinder", "ja"].indexOf(normalized) !== -1;
}

function decodeHtmlEntities_(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function encodeHtmlAttribute_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
