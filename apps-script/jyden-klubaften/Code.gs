const JYDEN_BOARD_SETTINGS = 'JYDEN_BOARD_SETTINGS';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Jyden Klubaften')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getJydenNight() {
  return readJydenNight_();
}

function saveJydenBoardCount(poolName, boardCount, revision) {
  if (!jydenCanEdit_()) throw new Error('Kun klublederen kan ændre antal baner.');
  if (boardCount !== 2 && boardCount !== 3) throw new Error('Vælg 2 eller 3 baner.');

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const night = readJydenNight_();
    const pool = night.pools.find(item => item.name === poolName);
    if (!pool || night.revision !== revision) {
      throw new Error('Puljerne er ændret. Opdatér visningen og prøv igen.');
    }

    const properties = PropertiesService.getScriptProperties();
    const settings = jydenBoardSettings_(properties, revision);
    settings[poolName] = boardCount;
    properties.setProperty(JYDEN_BOARD_SETTINGS, JSON.stringify({ revision, settings }));
    return { ...pool, boardCount, rounds: jydenSchedule_(pool.sourceRounds, pool.players, boardCount) };
  } finally {
    lock.releaseLock();
  }
}

function jydenCanEdit_() {
  const admin = PropertiesService.getScriptProperties().getProperty('JYDEN_ADMIN_EMAIL');
  const current = Session.getActiveUser().getEmail();
  return Boolean(admin && current && admin.trim().toLowerCase() === current.toLowerCase());
}

function jydenBoardSettings_(properties, revision) {
  const saved = JSON.parse(properties.getProperty(JYDEN_BOARD_SETTINGS) || 'null');
  return saved && saved.revision === revision ? saved.settings : {};
}

function readJydenNight_() {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty('JYDEN_SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('Klubaften mangler forbindelse til Legacy.');

  const spreadsheet = Sheets.Spreadsheets.get(spreadsheetId, {
    fields: 'sheets(properties(title,hidden,gridProperties(rowCount)))',
  });
  const names = (spreadsheet.sheets || [])
    .map(sheet => sheet.properties)
    .filter(sheet => !sheet.hidden && /^Pulje [A-Z]\d?$/.test(sheet.title))
    .map(sheet => ({ title: sheet.title, lastRow: Math.min(64, sheet.gridProperties.rowCount) }))
    .sort((a, b) => a.title.localeCompare(b.title, 'da'));
  const valueRanges = names.length ? Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
    ranges: names.map(sheet => "'" + sheet.title + "'!A1:D" + sheet.lastRow),
    valueRenderOption: 'FORMATTED_VALUE',
  }).valueRanges : [];

  const sourcePools = [];
  const unavailable = [];
  names.forEach(({ title }, index) => {
    try {
      const pool = parseJydenPool_(title, valueRanges[index].values || []);
      if (pool) sourcePools.push(pool);
    } catch (error) {
      unavailable.push(title);
    }
  });

  const revision = Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(sourcePools))
  );
  const settings = jydenBoardSettings_(properties, revision);
  const pools = sourcePools.map(pool => {
    const defaultCount = Math.max(...pool.sourceRounds.map(round => round.length)) >= 3 ? 3 : 2;
    const boardCount = settings[pool.name] || defaultCount;
    return { ...pool, boardCount, rounds: jydenSchedule_(pool.sourceRounds, pool.players, boardCount) };
  });
  return { pools, unavailable, revision, canEdit: jydenCanEdit_() };
}

function parseJydenPool_(name, rows) {
  const players = [];
  const sourceRounds = [];
  let currentRound;
  for (const row of rows.slice(1)) {
    const [player = '', label = '', first = '', second = ''] = row.map(value => String(value).trim());
    if (/^puljestilling/i.test(label)) break;
    if (player) players.push(player);
    if (/^runde\s+\d+|^ekstra\s*kamp/i.test(label)) {
      currentRound = [];
      sourceRounds.push(currentRound);
    }
    if (!first && !second) continue;
    if (!currentRound || !first || !second || first === second) throw new Error('Ugyldig kamp');
    currentRound.push([first, second]);
  }
  if (!players.length && !sourceRounds.length) return null;

  const known = new Set(players);
  const rounds = sourceRounds.filter(round => round.length);
  const matches = rounds.flat();
  const scheduled = new Set(matches.flat());
  if (players.length < 2 || known.size !== players.length || !matches.length ||
      [...scheduled].some(player => !known.has(player)) || scheduled.size !== known.size) {
    throw new Error('Ufuldstændig pulje');
  }
  return { name, players, sourceRounds: rounds };
}

// En komplet seksspillerpulje kan afvikles på syv dobbeltrunder og én enkeltrunde.
// Tallene her identificerer spillere i puljen.
const JYDEN_SIX_ON_TWO = [
  [[1, 6], [2, 5]], [[3, 4], [1, 5]], [[4, 6], [2, 3]], [[3, 5], [1, 4]],
  [[2, 6], [1, 3]], [[4, 5], [3, 6]], [[1, 2], [5, 6]], [[2, 4]],
];

function jydenSchedule_(sourceRounds, players, boardCount) {
  const fits = round => round.length <= boardCount && new Set(round.flat()).size === round.length * 2;
  const games = sourceRounds.flat();
  if (players.length === 6 && games.length === 15) {
    const matchKey = (a, b) => JSON.stringify([a, b].sort());
    const byPair = new Map(games.map(match => [matchKey(...match), match]));
    if (byPair.size === games.length) {
      if (boardCount === 2) {
        return JYDEN_SIX_ON_TWO.map(round =>
          round.map(([a, b]) => byPair.get(matchKey(players[a - 1], players[b - 1])))
        );
      }
      if (sourceRounds.length === 5 && sourceRounds.every(fits)) return sourceRounds;
      const rotation = players.slice();
      return Array.from({ length: 5 }, () => {
        const round = rotation.slice(0, 3).map((player, index) =>
          byPair.get(matchKey(player, rotation[5 - index]))
        );
        rotation.splice(1, 0, rotation.pop());
        return round;
      });
    }
  }
  if (sourceRounds.every(fits)) return sourceRounds;

  // Pak øvrige Legacy-kampe i rækkefølge med plads til begge spillere.
  const rounds = [];
  for (const match of games) {
    const round = rounds.find(candidate =>
      candidate.length < boardCount && !candidate.some(game => game.some(player => match.includes(player)))
    );
    if (round) round.push(match);
    else rounds.push([match]);
  }
  return rounds;
}
