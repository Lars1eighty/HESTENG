/**
 * HESTENG Legacy – puljeinddeling.
 * A/B følger ELO. Resten fordeles balanceret og varierer mellem spilledage.
 * Ingen ekstrakampe eller ændringer af baneplanlægning.
 *
 * Denne fil er en GitHub-kandidat. Den er IKKE automatisk installeret
 * i det eksisterende Apps Script-projekt.
 */

const HESTENG_PULJESTOERRELSER_ = {
  14:[7,7], 15:[5,5,5], 16:[6,5,5], 17:[6,6,5],
  18:[6,6,6], 19:[7,6,6], 20:[5,5,5,5],
  21:[6,5,5,5], 22:[6,6,5,5], 23:[6,6,6,5],
  24:[6,6,6,6], 25:[5,5,5,5,5], 26:[6,5,5,5,5],
  27:[6,6,5,5,5], 28:[6,6,6,5,5], 29:[6,6,6,6,5],
  30:[6,6,6,6,6], 31:[6,5,5,5,5,5],
  32:[6,6,5,5,5,5], 33:[6,6,6,5,5,5],
  34:[6,6,6,6,5,5], 35:[6,6,6,6,6,5]
};

function hestengPuljeSeed_(s) {
  let hash = 2166136261;
  for (const ch of String(s)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hestengPuljeRng_(seed) {
  let value = seed >>> 0;
  return function () {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hestengPuljeBland_(items, random) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hestengPuljeRunder_(names) {
  const arr = names.slice();
  if (arr.length % 2) arr.push(null);
  const rounds = [];
  for (let r = 0; r < arr.length - 1; r++) {
    const matches = [];
    for (let i = 0; i < arr.length / 2; i++) {
      if (arr[i] && arr[arr.length - 1 - i]) {
        matches.push([arr[i], arr[arr.length - 1 - i]]);
      }
    }
    rounds.push(matches);
    arr.splice(1, 0, arr.pop());
  }
  return rounds;
}

function hestengPuljeTid_(names, timeMap) {
  return hestengPuljeRunder_(names).reduce((sum, round) => {
    const longest = Math.max(0, ...round.map(([a,b]) =>
      ((timeMap[a] || 17.5) + (timeMap[b] || 17.5)) / 2
    ));
    return sum + longest + 2; // 2 min. skift pr. runde
  }, 0);
}

/** Ren beregning – skriver intet til arkene. */
function hestengPlanPuljer_(participants, timeMap, dayKey) {
  const total = participants.length;
  const sizes = HESTENG_PULJESTOERRELSER_[total];
  if (!sizes) throw new Error('Understøtter 14–35 spillere. Fundet: ' + total);
  const ranked = participants.slice().sort((a,b) =>
    b.elo - a.elo || a.name.localeCompare(b.name, 'da')
  );
  if (ranked.some(p => !p.name || !Number.isFinite(p.elo)) ||
      new Set(ranked.map(p => p.name)).size !== total) {
    throw new Error('Tilmelding indeholder tomme, ugyldige eller dublerede spillere');
  }

  const random = hestengPuljeRng_(hestengPuljeSeed_(dayKey));
  const makePools = (shuffled) => {
    const pools = [];
    let pos = 0;
    sizes.forEach((size, i) => {
      const section = i < 2 ? ranked.slice(pos, pos + size) :
        shuffled.slice(pos - sizes[0] - sizes[1],
                       pos - sizes[0] - sizes[1] + size);
      const names = section.map(p => p.name);
      const rounds = hestengPuljeRunder_(names);
      pools.push({
        letter: 'ABCDEF'[i], names, rounds,
        avgElo: section.reduce((n,p) => n + p.elo, 0) / size,
        minutes: hestengPuljeTid_(names, timeMap)
      });
      pos += size;
    });
    return pools;
  };
  const lower = ranked.slice((sizes[0] || 0) + (sizes[1] || 0));
  let best = null;
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 1000; attempt++) {
    const pools = makePools(hestengPuljeBland_(lower, random));
    const variable = pools.slice(2);
    const gap = values => values.length > 1 ?
      Math.max(...values) - Math.min(...values) : 0;
    let score = gap(variable.map(p => p.avgElo)) * 3 +
      gap(variable.map(p => p.minutes)) * 1.5 +
      (variable.length ? Math.max(...variable.map(p => p.minutes)) * 0.15 : 0);

    const broni = pools.find(p => p.names.includes('Ole Broni'));
    if (broni && broni.names.includes('Tom Petersen') &&
        broni.names.includes('Yrsa Petersen')) continue;
    if (broni && (broni.names.includes('Tom Petersen') ||
                  broni.names.includes('Yrsa Petersen'))) score += 150;

    const wheelchair = ['Jesper Andersen','Thomas Westh','Rikke Vestergaard'];
    for (const pool of variable) {
      const count = wheelchair.filter(name => pool.names.includes(name)).length;
      score += Math.max(0, count - 1) * 100;
      if (count && pool.names.length > 5) score += 20;
    }
    if (score < bestScore) {
      bestScore = score;
      best = pools;
    }
  }
  if (!best) throw new Error('Ingen puljefordeling opfylder de særlige hensyn');
  const assigned = best.flatMap(p => p.names);
  if (assigned.length !== total || new Set(assigned).size !== total) {
    throw new Error('Fejl i puljefordeling: spiller mangler eller er dubleret');
  }
  return {sizes, pools:best};
}

function hestengPuljeTiderFraArk_(ss) {
  const sheet = ss.getSheetByName('DC_SpillerTider');
  const result = {};
  if (!sheet || sheet.getLastRow() < 2) return result;
  const rows = sheet.getRange(2,1,sheet.getLastRow()-1,3).getValues();
  const byShortName = new Map();
  rows.forEach(row => {
    const samples = Number(row[1]), minutes = Number(row[2]);
    if (samples >= 10 && minutes > 0) {
      byShortName.set(String(row[0]).trim().toLowerCase(), minutes);
    }
  });
  const aliases = {
    'Jens Oli Jespersen':'Jens oli', 'Simon Halkjær':'Simon H',
    'William Nielsen':'William N', 'Bjarne Villadsen':'Bjarne V',
    'Jens Ole Thomsen':'Jens O', 'Jesper Sund':'Jesper S',
    'Hans Hedegaard':'Hans H', 'Johnny Hansen':'Johnny H',
    'Dan Dyhrberg':'Dan D', 'Lars Hesteng Jensen':'Lars H',
    'Michael Villadsen':'Michael V', 'Jesper Andersen':'Jesper A',
    'Allan Noergaard':'Allan N', 'Thomas Westh':'Thomas W',
    'Kim Thomassen':'Kim T', 'Betina Pedersen':'Betina P',
    'Jan Kjeldsen':'Jan K', 'Jens Kristian Villadsen':'Jens Kristian',
    'Pia Aggerholm':'Pia', 'Jannie Nielsen':'Jannie N',
    'Ole Broni':'Ole B', 'Philip Nielsen':'Philip N',
    'Tom Petersen':'Tom P', 'Yrsa Petersen':'Yrsa P'
  };
  Object.keys(aliases).forEach(name => {
    const measured = byShortName.get(aliases[name].toLowerCase());
    if (measured) result[name] = measured;
  });
  // Ukendte spillere får automatisk torsdagssnittet 17,5 min.
  return result;
}

/**
 * Erstat den eksisterende lavPuljer3 i Apps Script ved godkendt installation.
 * Bevarer puljearkets runder, placeringstabel og eksisterende printformat.
 */
function lavPuljer3() {
  const ss = SpreadsheetApp.getActive();
  const tilmelding = ss.getSheetByName('Tilmelding');
  const oevrige = ss.getSheetByName('Øvrige spillere');
  if (!tilmelding) throw new Error('Mangler arket Tilmelding');
  const deltagere = new Map();
  [tilmelding, oevrige].forEach(sheet => {
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.getRange(2,1,sheet.getLastRow()-1,3).getValues().forEach(row => {
      const name = String(row[1] || '').trim();
      const elo = Number(row[2]);
      if (row[0] === true && name && row[2] !== '' && Number.isFinite(elo)) {
        deltagere.set(name, {name,elo});
      }
    });
  });
  const timezone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const dayKey = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
  const plan = hestengPlanPuljer_([...deltagere.values()],
    hestengPuljeTiderFraArk_(ss), dayKey);

  // En gentagen kørsel må ikke overskrive igangværende kampe uden accept.
  const old = ss.getSheets().filter(sheet =>
    /^Pulje [A-F]$/.test(sheet.getName()) && sheet.getLastRow() > 1);
  if (old.length) {
    const ui = SpreadsheetApp.getUi();
    const accept = ui.alert('Overskriv puljer?',
      'Der ligger allerede puljer i arkene. Vil du erstatte dem?',
      ui.ButtonSet.YES_NO);
    if (accept !== ui.Button.YES) return;
  }

  const valid = new Set(plan.pools.map(p => 'Pulje ' + p.letter));
  ss.getSheets().filter(s => /^Pulje [A-F]$/.test(s.getName()) &&
    !valid.has(s.getName())).forEach(s => s.clear());

  plan.pools.forEach(pool => {
    const name = 'Pulje ' + pool.letter;
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    sheet.clear();
    sheet.getRange(2,1,pool.names.length,1)
      .setValues(pool.names.map(n => [n]));
    const rows = [];
    pool.rounds.forEach((round, index) => {
      rows.push(['Runde ' + (index + 1),'','']);
      round.forEach(match => rows.push(['', match[0], match[1]]));
      rows.push(['','','']);
    });
    if (rows.length) sheet.getRange(2,2,rows.length,3).setValues(rows);
    const start = rows.length + 4;
    sheet.getRange(start,2).setValue('PULJESTILLING – UDFYLDES PÅ PAPIR');
    sheet.getRange(start+1,2,1,5).setValues([
      ['Spiller','Vundne','Leg +','Leg -','Placering']
    ]);
    sheet.getRange(start+2,2,pool.names.length,5)
      .setValues(pool.names.map(n => [n,'','','','']));
    if (typeof formatPuljeArkPrint === 'function') formatPuljeArkPrint(sheet);
  });
  Logger.log(plan.pools.map(pool =>
    pool.letter + ': ' + pool.names.length + ' spillere, ca. ' +
    Math.round(pool.minutes) + ' min.').join(' | '));
}
