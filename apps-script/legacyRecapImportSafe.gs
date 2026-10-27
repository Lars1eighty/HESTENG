/**
 * STAGED replacement for the active "Ny Torsdag.importRecapStats".
 * This file is not deployed. Use a copy of the script and spreadsheet.
 *
 * A thread must NEVER receive elo-processed until its eligible matches
 * have been successfully persisted to DC_Raw and flush() succeeds.
 */
function importRecapStats() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("DC_Raw");
  if (!sheet) throw new Error("Mangler arket DC_Raw");

  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const query =
    'label:DartConnect from:matchrecap@email.dartconnect.com ' +
    'after:' + Utilities.formatDate(now, tz, "yyyy/MM/dd") + ' ' +
    'before:' + Utilities.formatDate(tomorrow, tz, "yyyy/MM/dd") + ' ' +
    '-label:elo-processed';

  const existingIds = new Set(
    sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
          .getValues().flat().filter(String).map(String)
      : []
  );
  const threads = GmailApp.search(query, 0, 500);
  Logger.log("Threads fundet: " + threads.length);

  const rows = [];
  const threadsReadyToLabel = [];

  threads.forEach(function (thread) {
    let relevantMessages = 0;
    let threadComplete = true;

    thread.getMessages().forEach(function (msg) {
      const matchDate = msg.getDate();
      if (
        matchDate.getFullYear() !== now.getFullYear() ||
        matchDate.getMonth() !== now.getMonth() ||
        matchDate.getDate() !== now.getDate()
      ) return;

      const minutes = matchDate.getHours() * 60 + matchDate.getMinutes();
      if (minutes < 19 * 60 + 4 || minutes > 23 * 60 + 5) return;

      relevantMessages += 1;
      let matchId = "";

      try {
        const body = msg.getBody();
        const recapMatch = body.match(
          /https:%2F%2Frecap\.dartconnect\.com%2Fmatches%2F([a-z0-9]+)/i
        );
        if (!recapMatch) throw new Error("MatchID ikke fundet");
        matchId = recapMatch[1];

        // Already persisted? Do not append a duplicate. This also allows an
        // unlabeled thread to be labeled after a prior label-only failure.
        if (existingIds.has(matchId)) return;

        const html = UrlFetchApp.fetch(
          "https://recap.dartconnect.com/players/" + matchId
        ).getContentText();
        const dataMatch = html.match(/data-page="([^"]+)"/);
        if (!dataMatch) throw new Error("DartConnect data-page mangler");

        const data = JSON.parse(
          dataMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        );
        const info = data.props.matchInfo;
        const opponents = info.opponents || [];
        const winner = opponents[info.match_winner]?.name || "";
        const games = data.props.playersPerGame || [];
        const matchRows = [];

        games.forEach(function (game) {
          game.forEach(function (side) {
            side.forEach(function (player) {
              matchRows.push([
                matchId,
                matchDate,
                player.set_number + "." + player.set_game_number,
                player.name,
                player.is_starting ? "S" : "",
                player.ppr || "",
                player.ppd || "",
                player.turn_order || "",
                player.player_win || "",
                player.round_winning_turn || "",
                player.double_out_points || "",
                player.starting_points || "",
                player.ending_points || "",
                player.darts_thrown || "",
                player.points_scored || "",
                player.one_hundred_eighties || 0,
                player.hat_trick_cnt || 0,
                player.nine_marks || 0,
                winner,
                opponents[player.opponent_index]?.name || ""
              ]);
            });
          });
        });

        if (!matchRows.length) {
          throw new Error("DartConnect-kampen indeholder ingen spillerdata");
        }

        // Stage complete matches only; a parsing error must not write
        // partial rows for a match.
        rows.push(...matchRows);
        existingIds.add(matchId);
        Logger.log(
          "Klargjort: " + matchId + " - " +
          Utilities.formatDate(matchDate, tz, "dd/MM/yyyy HH:mm")
        );
      } catch (err) {
        threadComplete = false;
        Logger.log("Fejl på match " + (matchId || "ukendt") + ": " + err);
      }
    });

    // One bad eligible message prevents labeling the whole Gmail thread.
    // Successfully parsed messages can still be persisted and deduplicated.
    if (relevantMessages > 0 && threadComplete) {
      threadsReadyToLabel.push(thread);
    }
  });

  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length)
      .setValues(rows);
    // Never label on a failed write or failed flush.
    SpreadsheetApp.flush();
  }

  // If a previous run persisted data but the Gmail label failed, threads
  // containing those already-seen IDs can safely be labeled here.
  if (threadsReadyToLabel.length > 0) {
    const processedLabel =
      GmailApp.getUserLabelByName("elo-processed") ||
      GmailApp.createLabel("elo-processed");
    threadsReadyToLabel.forEach(function (thread) {
      thread.addLabel(processedLabel);
    });
  }

  Logger.log("Rækker skrevet til DC_Raw: " + rows.length);
}
