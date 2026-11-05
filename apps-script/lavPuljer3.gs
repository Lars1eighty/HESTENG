/**
 * HESTENG Legacy – puljeinddeling.
 * A/B følger ELO. C og ned prioriterer færrest gentagne modstandere fra de seneste to deltagelser.
 * Præcis to kørestolsbrugere adskilles i forskellige puljer.
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


/** Navnevarianter fra DartConnect og Tilmelding får samme nøgle. */
function hestengPuljeNavnNoegle_(name) {
  const key = String(name || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const aliases = {
    'billiam nielsen': 'william nielsen',
    'simon halkjaer': 'simon halkjær',
    'ole brøni': 'ole broni',
    'yrsa ..': 'yrsa petersen',
    'rikke westergaard': 'rikke vestergaard',
    'tom prtersen': 'tom petersen'
  };
  return aliases[key] || key;
}

function hestengPuljeParNoegle_(a,b) {
  return [hestengPuljeNavnNoegle_(a), hestengPuljeNavnNoegle_(b)]
    .sort().join('|');
}

/** DartConnect har normalt MM/DD/YYYY; vi bruger ISO til sortering. */
function hestengPuljeDato_(value, timezone) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, timezone, 'yyyy-MM-dd');
  }
  const txt = String(value || '').trim();
  let match = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return match[1] + '-' + match[2].padStart(2,'0') +
    '-' + match[3].padStart(2,'0');
  match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return match[3] + '-' + match[1].padStart(2,'0') +
    '-' + match[2].padStart(2,'0');
  return '';
}

/**
 * Historiske modstandere, kun de seneste to *fremmøder pr. spiller*.
 * Ikke bare de seneste to torsdage i klubben.
 * Hver modstander tæller højst én gang pr. fremmøde.
 */
function hestengPuljeModstandereFraArk_(ss, names, dayKey) {
  const matchesSheet = ss.getSheetByName('DC_Matches');
  const weightByPair = new Map();
  if (!matchesSheet || matchesSheet.getLastRow() < 2) return weightByPair;
  const wanted = new Set(names.map(hestengPuljeNavnNoegle_));
  const timezone = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const rows = matchesSheet.getRange(2,2,matchesSheet.getLastRow()-1,3)
    .getValues(); // B: Dato, C: Vinder, D: Taber
  const history = [];
  const sessions = new Map(names.map(name => [hestengPuljeNavnNoegle_(name), new Set()]));
  for (const row of rows) {
    const date = hestengPuljeDato_(row[0], timezone);
    if (!date || date >= dayKey) continue; // aldrig dagens eller fremtidige kampe
    const a = hestengPuljeNavnNoegle_(row[1]);
    const b = hestengPuljeNavnNoegle_(row[2]);
    if (!a || !b || a === b) continue;
    if (sessions.has(a)) sessions.get(a).add(date);
    if (sessions.has(b)) sessions.get(b).add(date);
    history.push({date,a,b});
  }
  const recent = new Map();
  for (const [name,dates] of sessions.entries()) {
    recent.set(name, [...dates].sort().reverse().slice(0,2));
  }
  const usedDatePairs = new Set();
  for (const game of history) {
    if (!wanted.has(game.a) || !wanted.has(game.b)) continue;
    const key = hestengPuljeParNoegle_(game.a,game.b);
    const unique = game.date + '|' + key;
    if (usedDatePairs.has(unique)) continue;
    usedDatePairs.add(unique);
    const indexA = recent.get(game.a).indexOf(game.date);
    const indexB = recent.get(game.b).indexOf(game.date);
    const importance = i => i === 0 ? 3 : i === 1 ? 1 : 0;
    const weight = Math.max(importance(indexA), importance(indexB));
    if (weight) weightByPair.set(key,(weightByPair.get(key) || 0) + weight);
  }
  return weightByPair;
}

function hestengPuljeRotationScore_(pools, weights) {
  let score = 0;
  for (const pool of pools.slice(2)) {
    for (let i=0;i<pool.names.length;i++) {
      for (let j=i+1;j<pool.names.length;j++) {
        score += weights.get(hestengPuljeParNoegle_(
          pool.names[i],pool.names[j])) || 0;
      }
    }
  }
  return score;
}

/**
 * Skiller præcis to tilmeldte kørestolsbrugere ved at bytte med den
 * ELO-mæssigt nærmeste spiller fra en anden pulje.
 * Andre bundpuljer foretrækkes, så A/B bevares når muligt.
 */
function hestengPuljeAdskilKoerestole_(sections) {
  const groups = sections.map(group => group.slice());
  const wheelchair = new Set(['jesper andersen','thomas westh','rikke vestergaard']);
  const chairs = [];
  groups.forEach((group,pool) => group.forEach((p,pos) => {
    if(wheelchair.has(hestengPuljeNavnNoegle_(p.name))) chairs.push({pool,pos,p});
  }));
  if(chairs.length !== 2 || chairs[0].pool !== chairs[1].pool) return groups;
  const origin = chairs[0].pool;
  const otherLower = groups.map((_,i)=>i).filter(i=>i>=2 && i!==origin);
  const destinations = origin>=2 && otherLower.length ? otherLower :
    groups.map((_,i)=>i).filter(i=>i!==origin);
  let best = null;
  for(const chair of chairs){
    for(const dest of destinations){
      groups[dest].forEach((other,to)=>{
        if(wheelchair.has(hestengPuljeNavnNoegle_(other.name)))return;
        const cost = 100*Math.abs(chair.p.elo-other.elo)+Math.abs(origin-dest);
        if(!best || cost<best.cost)best={cost,from:chair.pos,dest,to};
      });
    }
  }
  if(!best)throw new Error('Kan ikke adskille kørestolsbrugerne');
  const prev=groups[origin][best.from];
  groups[origin][best.from]=groups[best.dest][best.to];
  groups[best.dest][best.to]=prev;
  return groups;
}

function hestengPuljeGentagelserV8_(pools, weights) {
  let antalPar=0, stoersteVaegt=0, samletVaegt=0;
  for(const pool of pools.slice(2)) for(let i=0;i<pool.names.length;i++)
    for(let j=i+1;j<pool.names.length;j++){
      const w=weights.get(hestengPuljeParNoegle_(pool.names[i],pool.names[j]))||0;
      if(w>0){antalPar++;stoersteVaegt=Math.max(stoersteVaegt,w);samletVaegt+=w;}
    }
  return {antalPar,stoersteVaegt,samletVaegt};
}
function hestengPuljeBedreV8_(a,b) {
  return !b || a.antalPar<b.antalPar ||
    (a.antalPar===b.antalPar &&
     (a.stoersteVaegt<b.stoersteVaegt ||
      (a.stoersteVaegt===b.stoersteVaegt && a.samletVaegt<b.samletVaegt)));
}

/** Ren beregning – skriver intet til arkene. */
function hestengPlanPuljer_(participants, timeMap, dayKey, recentWeights) {
  const total = participants.length;
  const sizes = HESTENG_PULJESTOERRELSER_[total];
  if (!sizes) throw new Error('Understøtter 14–35 spillere. Fundet: ' + total);
  const ranked = participants.slice().sort((a,b) =>
    b.elo - a.elo || a.name.localeCompare(b.name, 'da')
  );
  if (ranked.some(p => !p.name || !Number.isFinite(p.elo)) ||
      new Set(ranked.map(p => hestengPuljeNavnNoegle_(p.name))).size !== total) {
    throw new Error('Tilmelding indeholder tomme, ugyldige eller dublerede spillere');
  }
  const random = hestengPuljeRng_(hestengPuljeSeed_(
    dayKey + '|' + ranked.map(p=>p.name).join('|')
  ));
  const topCount = sizes[0] + sizes[1];
  const top = ranked.slice(0,topCount);
  const lower = ranked.slice(topCount);
  const weights = recentWeights || new Map();

  function makePools(lowerOrder) {
    let topOffset = 0, lowerOffset = 0;
    const sections = sizes.map((size,i) => i < 2 ?
      top.slice(topOffset,topOffset+=size) :
      lowerOrder.slice(lowerOffset,lowerOffset+=size));
    const assigned = hestengPuljeAdskilKoerestole_(sections);
    return assigned.map((section,i) => {
      const names = hestengPuljeBland_(section.map(p=>p.name), random);
      return {
        letter: 'ABCDEF'[i], names, rounds: hestengPuljeRunder_(names),
        avgElo: section.reduce((n,p)=>n+p.elo,0)/section.length,
        minutes: hestengPuljeTid_(names,timeMap)
      };
    });
  }

  // Ingen ELO-balancering i C og ned. Tilfældig fordeling med blød rotation.
  // Har vi ikke historik, er første lodtrækning resultatet.
  let best = null, bestMetric = null;
  for (let attempt=0;attempt<1200;attempt++) {
    const pools = makePools(hestengPuljeBland_(lower,random));
    const metric = hestengPuljeGentagelserV8_(pools,weights);
    if (hestengPuljeBedreV8_(metric,bestMetric)) {
      best = pools; bestMetric = metric;
    }
    if (bestMetric.antalPar === 0) break;
  }
  if (!best) throw new Error('Kunne ikke lave puljer');
  const knownChairs = new Set(['jesper andersen','thomas westh','rikke vestergaard']);
  const chairs = best.flatMap((p,i)=>p.names
    .filter(name=>knownChairs.has(hestengPuljeNavnNoegle_(name))).map(()=>i));
  if(chairs.length===2 && chairs[0]===chairs[1]){
    throw new Error('Kørestolsbrugerne er i samme pulje');
  }
  const assigned = best.flatMap(p=>p.names);
  if (assigned.length !== total ||
      new Set(assigned.map(hestengPuljeNavnNoegle_)).size !== total) {
    throw new Error('Fejl i puljefordeling: spiller mangler eller er dubleret');
  }
  return {sizes,pools:best,rotationScore:bestMetric.samletVaegt,gentagelser:bestMetric.antalPar};
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
  const people = [...deltagere.values()];
  const recent = hestengPuljeModstandereFraArk_(ss,
    people.map(p=>p.name),dayKey);
  const plan = hestengPlanPuljer_(people,hestengPuljeTiderFraArk_(ss),
    dayKey,recent);

  // Ny fordeling beregnes før overskrivning; ingen Ja/Nej-dialog.

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
    Math.round(pool.minutes) + ' min.').join(' | ') +
    ' | Rotation: ' + plan.rotationScore);
}


/**
 * Sikker prøvekørsel: læser tilmelding og DartConnect, men skriver intet.
 * Vælg hestengTestPuljerRotation i Apps Script.
 */
function hestengTestPuljerRotation() {
  const ss = SpreadsheetApp.getActive();
  const sheets = [ss.getSheetByName('Tilmelding'),
    ss.getSheetByName('Øvrige spillere')];
  const deltagere = new Map();
  sheets.forEach(sheet => {
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.getRange(2,1,sheet.getLastRow()-1,3).getValues().forEach(row => {
      const name = String(row[1] || '').trim(), elo = Number(row[2]);
      if (row[0] === true && name && row[2] !== '' && Number.isFinite(elo)) {
        deltagere.set(hestengPuljeNavnNoegle_(name),{name,elo});
      }
    });
  });
  const people = [...deltagere.values()];
  const tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
  const dayKey = Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
  const weights = hestengPuljeModstandereFraArk_(ss,people.map(p=>p.name),dayKey);
  const plan = hestengPlanPuljer_(people,hestengPuljeTiderFraArk_(ss),
    dayKey,weights);
  plan.pools.forEach(pool => Logger.log(
    'Pulje ' + pool.letter + ' (' + pool.names.length + '): ' +
    pool.names.join(', ') + ' | ca. ' + Math.round(pool.minutes) + ' min.'
  ));
  const gameCount = plan.pools.reduce((sum,p)=>
    sum+p.names.length*(p.names.length-1)/2,0);
  Logger.log('Spillere: ' + people.length + ' | kampe: ' + gameCount +
    ' | ekstrakampe: 0 | gentagelses-score: ' + plan.rotationScore);
}
