'use strict';

const QUICK_GAMES = {
  catch40: ['Catch40', 'Point', 120],
  checkout6080: ['Catch40 · 60–80', 'Point', 63],
  jdc: ['JDC Challenge', 'Point', 10000],
  doubles: ['Jorden rundt · doubler', 'Pile til 20 doubler', 10000, 20],
  '170': ['170 Challenge', 'Pile til lukning', 10000, 3],
};

const JDC_TARGETS = [
  ...Array.from({length:6},(_,i)=>({number:10+i})),
  ...Array.from({length:20},(_,i)=>({double:'D'+(i+1),points:50})),
  {double:'Bull',points:100},
  ...Array.from({length:6},(_,i)=>({number:15+i})),
];
let quickMode = null;
let compareMode = 'weeks';
let compareDates = ['', ''];

function validQuick501(x) {
  return x && Number.isFinite(x.avg) && x.avg >= 0 && x.avg <= 180 &&
    Number.isInteger(x.legs) && x.legs >= 0 && x.legs <= 999 &&
    Number.isInteger(x.darts) && x.darts >= Math.max(1, x.legs * 9) && x.darts <= 99999 &&
    (x.attempts === null || Number.isInteger(x.attempts) && x.attempts >= x.legs && x.attempts <= x.darts) &&
    (x.best === null || Number.isInteger(x.best) && x.legs > 0 && x.best >= 9 && x.best * x.legs <= x.darts) &&
    (x.checkout === null || Number.isInteger(x.checkout) && x.legs > 0 && x.checkout >= 2 && x.checkout <= 170 && ![159,162,163,165,166,168,169].includes(x.checkout));
}

function quick501Details(x) {
  return [
    x.legs + ' legs', x.darts + ' pile',
    x.attempts ? num(pct(x.legs, x.attempts)) + ' % på doubler' : null,
    x.best ? 'Bedste leg: ' + x.best + ' pile' : null,
    x.checkout ? 'Højeste lukning: ' + x.checkout : null,
  ].filter(Boolean).join(' · ');
}

function validResultLog(x) {
  const game = x && Object.hasOwn(QUICK_GAMES, x.game) && QUICK_GAMES[x.game];
  return !!game && Number.isInteger(x.value) && x.value >= (game[3] ?? 0) && x.value <= game[2] &&
    (x.darts == null || (Object.hasOwn(CATCH_RANGES,x.game) && Number.isInteger(x.darts) && x.darts >= 1 && x.darts <= catchDartLimit(x.game)));
}

function catchDartLimit(id) {
  const [start,end] = CATCH_RANGES[id];
  return (end-start+1)*6;
}

function jdcDarts(targets) {
  return JDC_TARGETS.slice(0,targets).reduce((sum,target)=>sum+(target.double?1:3),0);
}

function visitDartsThrown(visit) {
  return visit.bust ? (visit.thrown ?? Math.max(1,visit.doubleAttempts ?? 0)) : visit.darts;
}

function visitDartsUnknown(visit) {
  return !!visit.bust && visit.thrown === undefined;
}

function exerciseDarts(id,entry) {
  const events = entry.events;
  let darts = 0, incomplete = false;
  function countVisit(visit) {
    if (visit.opening) return;
    if (visitDartsUnknown(visit)) incomplete = true;
    darts += visitDartsThrown(visit);
  }
  if (id === 'doubles' || id === 'combos') darts = events.length;
  else if (id === 'scoring') darts = events.length*3;
  else if (id === 'singles' || id === 'checkout') {
    for (const result of events) {
      if (result === 1) incomplete = true; // Historical success could take 2 or 3 darts.
      darts += result === 0 || result === 3 ? 3 : 2;
    }
  } else if (id === 'jdc') {
    darts = jdcDarts(events.length);
  } else if (isCheckoutDrill(id)) {
    for (const [index,event] of events.entries()) {
      const round = entry.roundVisits?.[index];
      if (round) round.forEach(countVisit);
      else darts += id === '121' ? event.darts || event.limit : event || 6;
    }
    entry.roundVisits?.[events.length]?.forEach(countVisit);
  } else if (id === '501' || id === '170' || id === '501cpu' || id === '170cpu') {
    events.forEach(countVisit);
  } else if (id === '501log') darts = events[0].darts;
  else if (id === 'resultlog') {
    const {game,value,darts:loggedDarts} = events[0];
    if (game === 'jdc') darts = jdcDarts(JDC_TARGETS.length);
    else if (QUICK_GAMES[game][3]) darts = value;
    else if (loggedDarts != null) darts = loggedDarts;
    else incomplete = true;
  } else incomplete = true;
  return {darts,incomplete};
}

function trainingDarts(sessions) {
  const total = {darts:0,incomplete:0};
  for (const {results} of sessions) {
    for (const [id,entry] of Object.entries(results)) {
      if (!hasGameEntries(entry)) continue;
      const count = exerciseDarts(id,entry);
      total.darts += count.darts;
      if (count.incomplete) total.incomplete++;
    }
  }
  return total;
}

function dartsForDay(sessions, date) {
  const records = sessions.filter(h=>localDayKey(h.date) === date);
  if (date === localDayKey() && state.status === 'active' && !state.archivedSessionId) records.push(state);
  return trainingDarts(records);
}

function dartTotalCard(label, {darts,incomplete}) {
  return `<section class="card dart-total"><div><h3>${label}</h3><strong>${dartTotalText({darts,incomplete})} pile</strong></div>
    ${incomplete?`<p class="caption">${incomplete === 1 ? 'En registrering mangler det præcise antal pile.' : incomplete+' registreringer mangler det præcise antal pile.'}</p>`:''}</section>`;
}

function dartTotalText({darts,incomplete}) {
  return (incomplete?'Mindst ':'')+num(darts,0);
}

function startSolo(id) {
  if (state.status === 'active') return;
  resetTraining();
  state.plan = [id];
  state.planName = EX.find(e => e[0] === id)[1];
  state.planDate = localDayKey();
  startTraining();
  window.scrollTo(0, 0);
}

function finishSolo() {
  if (state.status !== 'active' || state.plan.length !== 1) return;
  const id = activeExerciseId();
  archiveCurrent(completedGame(id, state.results[id]) ? 'complete' : 'partial');
  restart();
  window.scrollTo(0, 0);
}

function renderJdc(events) {
  const target = JDC_TARGETS[events.length];
  const points = events.reduce((sum,value)=>sum+value,0);
  if (!target) return `<div class="metric">${points} point</div><p>JDC Challenge gennemført.</p>`;
  const actions = target.double
    ? playButtons(button('Ramt','add('+target.points+')','primary'),button('Miss','add(0)'))
    : `<p class="caption">Vælg summen af multiplikatorerne på ${target.number}. Single = 1, double = 2, triple = 3.</p>
      <div class="scoring-actions jdc-actions">${Array.from({length:10},(_,i)=>button(String(i*target.number),'add('+i*target.number+')')).join('')}</div>
      ${button('Shanghai · '+(100+6*target.number),'add('+(100+6*target.number)+')','primary')}`;
  return `<p class="caption">${events.length+1} af ${JDC_TARGETS.length} mål · ${points} point</p>
    <div class="metric">${target.double ?? target.number}</div>${actions}`;
}

function showQuick(id) {
  quickMode = id;
  render();
  window.scrollTo(0, 0);
}

function quickField(name, label, min, max, required, step = 1) {
  return `<label for="quick-${name}">${label}</label><input id="quick-${name}" name="${name}" type="number" inputmode="${step===1?'numeric':'decimal'}" min="${min}" max="${max}" step="${step}" ${required?'required':''}>`;
}

function renderQuick() {
  const game = QUICK_GAMES[quickMode];
  const fields = quickMode === '501'
    ? quickField('avg','3-pils snit',0,180,true,.01) + quickField('darts','Antal pile',1,99999,true)
      + quickField('legs','Afsluttede legs',0,999,true)
      + `<details><summary>Lukninger og bedste leg</summary>${quickField('attempts','Doubleforsøg i alt',0,99999,false)}${quickField('best','Bedste leg · pile',9,99999,false)}${quickField('checkout','Højeste lukning',2,170,false)}</details>`
    : quickField('value',game[1],game[3] ?? 0,game[2],true)
      + (Object.hasOwn(CATCH_RANGES,quickMode) ? quickField('darts','Pile kastet i alt (hvis du har tallet)',1,catchDartLimit(quickMode),false) : '');
  return `<section class="card"><h2>Registrér ${game?.[0] ?? '501'}</h2><form onsubmit="event.preventDefault();saveQuick(this)">
    <label for="quick-date">Træningsdato</label><input id="quick-date" name="date" type="date" value="${localDayKey()}" max="${localDayKey()}" required>
    ${fields}<p id="quick-error" class="bad" role="alert"></p><div class="row"><button type="button" onclick="showQuick(null)">Tilbage</button><button class="primary">Gem resultat</button></div>
  </form></section>`;
}

function saveQuick(form) {
  const data = new FormData(form);
  const field = key => data.get(key) === '' || data.get(key) === null ? null : Number(data.get(key));
  const is501 = quickMode === '501';
  const value = is501
    ? {avg:field('avg'),darts:field('darts'),legs:field('legs'),attempts:field('attempts'),best:field('best'),checkout:field('checkout')}
    : {game:quickMode,value:field('value')};
  if (!is501 && Object.hasOwn(CATCH_RANGES,quickMode) && field('darts') !== null) value.darts = field('darts');
  if (!(is501 ? validQuick501(value) : validResultLog(value))) {
    document.getElementById('quick-error').textContent = 'Kontrollér at tallene passer sammen, især pile, legs og doubleforsøg.';
    return;
  }
  const dayKey = data.get('date');
  const date = dayKey === localDayKey() ? new Date() : new Date(dayKey + 'T12:00:00');
  if (Number.isNaN(date.getTime())) return;
  const id = is501 ? '501log' : 'resultlog';
  state.history.unshift({id:makeId(),date:date.toISOString(),status:'complete',plan:[id],planName:'Registreret ' + (is501?'501':QUICK_GAMES[quickMode][0]),results:{[id]:{events:[value]}}});
  save();
  historySync.changed();
  notice = storageOk ? 'Resultatet er gemt.' : 'Resultatet er indtastet. Eksportér en sikkerhedskopi.';
  showQuick(null);
}

function tile(label, value) {
  return `<div class="tile"><small>${label}</small><div class="big">${value}</div></div>`;
}

function summary501(h) {
  const logged = h.results['501log']?.events?.[0];
  if (logged) return {...logged, percent:logged.attempts ? pct(logged.legs, logged.attempts) : null};
  const events = h.results['501']?.events;
  if (!events?.length) return null;
  const x = get501(events);
  return {avg:x.avg,darts:x.darts,legs:x.legs.length,percent:x.checkoutPercent,best:x.bestLeg,
    checkout:x.legs.length?Math.max(...x.legs.map(leg=>leg.checkout)):null};
}

function renderDashboard(program) {
  if (quickMode) return renderQuick();
  const all = completedSessions();
  const recent = all.map(h=>({date:h.date,info:summary501(h)})).filter(h=>h.info).slice(-8);
  const last = recent.at(-1);
  const prev = recent.at(-2);
  const delta = prev ? last.info.avg - prev.info.avg : null;
  const gameButtons = [
    ['catch40','Catch40','61–100'],['checkout6080','Catch40 kort','60–80'],
    ['jdc','JDC Challenge','Shanghai og doubler'],['doubles','Doubler','D1–D20'],
    ['170','170 Challenge','Fem legs fra 170'],['170cpu','170 mod CPU','Bedst af 7 legs mod appen'],['121','121 Challenge','Luk 121 og opefter'],['combos','Checkout-træning','Double-kombinationer'],
    ['scoring','Scoring 20','Spil til 20 point'],['singles','Store singler','S1–S20'],
  ];
  return `<div class="dashboard"><section class="card hero"><div class="hero-body"><h1>501</h1>
    <p>Spil fem legs eller gem dagens resultat.</p><div class="row">${button('Registrér resultat',"showQuick('501')",'primary')}${button('Spil 501',"startSolo('501')",'hero-secondary')}${button('501 mod CPU',"startSolo('501cpu')",'hero-secondary')}</div></div></section>
    ${dartTotalCard('Dagens pile',dartsForDay(all,localDayKey()))}
    <section class="card"><h2>Mine mål</h2><p>Mål, aktuelt niveau og stabil fremgang i dine øvelser.</p>${button('Se mine mål',"tab='stats';changeStatsView('goals')",'primary')}</section>
    <section class="card latest"><h2>Seneste 501</h2>${last?`<p class="caption">${day(last.date)}${delta===null?'':' · '+signed(delta)+' i snit fra forrige registrering'}</p>
      <div class="grid">${tile('3-pils snit',num(last.info.avg,2))}${tile('Doubleprocent',last.info.percent===null?'–':num(last.info.percent)+' %')}</div>
      ${recent.length>1?chart(recent.map(h=>h.info.avg),'higher',(v,i)=>day(recent[i].date)+' · '+num(v,2)):''}`
      : '<p class="muted">Her vises dit snit og dine lukninger, når du har gemt en 501-træning.</p>'}
      ${button('Se udvikling',"showTab('stats')",'small')}</section>
    <section class="exercises"><h2>Øvelser</h2><div class="exercise-grid">${gameButtons.map(([id,label,sub])=>
      `<div class="exercise-tile"><button type="button" onclick="startSolo('${id}')"><strong>${label}</strong><small>${sub}</small></button>
      ${Object.hasOwn(QUICK_GAMES,id)?button('Registrér',"showQuick('"+id+"')",'small quick-link'):''}</div>`).join('')}</div></section>
    ${program}
    ${all.length?'':`<div class="mutedbox">Har du trænet i den tidligere app? ${button('Importér historik',"showTab('backup')",'small')}</div>`}
  </div>`;
}

function shiftDay(key, offset) {
  const date = new Date(key + 'T12:00:00');
  date.setDate(date.getDate() + offset);
  return localDayKey(date);
}

function compareRanges(sessions) {
  const days = [...new Set(sessions.map(h=>localDayKey(new Date(h.date))))].sort();
  const last = days.at(-1) || localDayKey();
  if (compareMode === 'days') {
    const [a,b] = [compareDates[0] || days.at(-2) || shiftDay(last,-1), compareDates[1] || last];
    return [[a,a],[b,b]];
  }
  if (compareMode === 'firstFourth') {
    const first = shareWeekStart((days[0] || last) + 'T12:00:00');
    return [[first,shiftDay(first,6)],[shiftDay(first,21),shiftDay(first,27)]];
  }
  const anchor = compareDates[1] || last;
  if (compareMode === 'periods') {
    return [[shiftDay(anchor,-55),shiftDay(anchor,-28)],[shiftDay(anchor,-27),anchor]];
  }
  const week = shareWeekStart(anchor + 'T12:00:00');
  return [[shiftDay(week,-7),shiftDay(week,-1)],[week,shiftDay(week,6)]];
}

function mean(values) {
  const available = values.filter(Number.isFinite);
  return available.length ? available.reduce((a,b)=>a+b,0)/available.length : null;
}

function signed(value) {
  return (value > 0 ? '+' : '') + num(value,2);
}

function measuredGame(h,id) {
  const log = h.results.resultlog?.events?.[0];
  if (log?.game === id) return log.value;
  const entry = h.results[id];
  return completedGame(id,entry) ? statsFor(id,entry).primary : null;
}

const PERIOD_MEASURES = [
  ['average501','501 · 3-pils snit',''],
  ['double501','501 · doubleprocent','%'],
  ['doubles','Doubler · pile til 20 træffere','pile',true],
  ['catch40','Catch40 · snit','point'],
  ['checkout6080','Catch40 60–80 · snit','point'],
  ['jdc','JDC · snit','point'],
  ['long170','170 · snit pr. leg (5 legs)','pile',true],
  ['short170','170 · snit (enkelt leg)','pile',true],
];

function periodMetrics(group) {
  const rows = group.map(summary501).filter(Boolean);
  const darts = rows.reduce((sum,r)=>sum+r.darts,0);
  const top = (key, choose) => {
    const values = rows.map(r=>r[key]).filter(Number.isFinite);
    return values.length ? choose(...values) : null;
  };
  const doubleRows = group.map(h=>{
    const logged = h.results['501log']?.events?.[0];
    if (logged) return logged.attempts ? [logged.legs,logged.attempts] : null;
    const x = get501(h.results['501']?.events || []);
    return x.checkoutPercent === null ? null : [x.legs.length,x.doubleAttempts];
  }).filter(Boolean);
  return {
    average501:darts?rows.reduce((sum,r)=>sum+r.avg*r.darts,0)/darts:null,
    legs:rows.length?rows.reduce((sum,r)=>sum+r.legs,0):null,
    double501:pct(doubleRows.reduce((s,r)=>s+r[0],0),doubleRows.reduce((s,r)=>s+r[1],0)),
    fastest501:top('best',Math.min),
    checkout501:top('checkout',Math.max),
    jdc:mean(group.map(h=>measuredGame(h,'jdc'))),
    catch40:mean(group.map(h=>measuredGame(h,'catch40'))),
    checkout6080:mean(group.map(h=>measuredGame(h,'checkout6080'))),
    doubles:mean(group.map(h=>measuredGame(h,'doubles'))),
    long170:mean(group.filter(h=>h.results['170']?.goal===5).map(h=>measuredGame(h,'170'))),
    short170:mean(group.filter(h=>h.results['170']?.goal!==5).map(h=>measuredGame(h,'170'))),
  };
}

function groupTrainingDays(sessions) {
  const groups = new Map();
  for (const session of sessions) {
    const date = localDayKey(session.date);
    if (!groups.has(date)) groups.set(date,[]);
    groups.get(date).push(session);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b));
}

function compareValue(value,unit='') {
  return Number.isFinite(value)?num(value,2)+(unit?' '+unit:''):'–';
}

function compareChart(key,label,unit,lower,before,after,daily) {
  const difference = after-before;
  const unchanged = num(Math.abs(difference),2) === '0';
  const tone = unchanged ? '' : ((lower ? difference<0 : difference>0) ? 'good' : 'bad');
  const delta = '<span class="comparison-delta '+tone+'">'+(unchanged ? 'Uændret' :
    signed(difference)+(unit==='%'?' pp':unit?' '+unit:''))+'</span>';
  const ceiling = Math.max(before,after,1);
  const bars = [before,after].map((value,i)=>`<div class="comparison-column">
    <b>${compareValue(value,unit)}</b><div class="comparison-track" aria-hidden="true"><i style="height:${100*value/ceiling}%"></i></div>
    <span>${i?'Efter':'Før'}</span></div>`).join('');
  const plot = daily.filter(({metrics})=>Number.isFinite(metrics[key])).slice(-12);
  const curve = chart(plot.map(({metrics})=>metrics[key]),lower?'lower':'higher',
    (value,i)=>day(plot[i].date+'T12:00:00')+' · '+compareValue(value,unit),false);
  return `<section class="comparison-measure"><div class="comparison-heading"><h3>${label}</h3>${delta}</div>
    <div class="comparison-bars" role="group" aria-label="${label}">${bars}</div>
    <details name="comparison-trends" class="comparison-trend"><summary aria-label="Se kurve for ${label}">Se kurve</summary>
    ${curve}<div class="progress-range caption">${plot.length?`<span>${day(plot[0].date+'T12:00:00')}</span>`:''}
    ${plot.length>1?`<span>${day(plot.at(-1).date+'T12:00:00')}</span>`:''}</div></details></section>`;
}

function dailyDartsChart(trainingDays) {
  const rows = trainingDays.map(([date,sessions])=>({date,...trainingDarts(sessions)}))
    .filter(row=>row.darts>0||row.incomplete).slice(-7);
  if (!rows.length) return '';
  const ceiling = Math.max(...rows.map(row=>row.darts),1);
  const columns = rows.map(row=>{
    const [,month,date] = row.date.split('-');
    const label = day(row.date+'T12:00:00')+' · '+dartTotalText(row)+' pile';
    return `<div class="comparison-column" role="listitem" aria-label="${label}"><b>${row.incomplete?'≥':''}${num(row.darts,0)}</b>
      <div class="comparison-track" aria-hidden="true"><i style="height:${100*row.darts/ceiling}%"></i></div>
      <span>${Number(date)}/${Number(month)}</span></div>`;
  }).join('');
  return `<section class="card"><h2>Pile fra alle spil</h2><p class="caption">Seneste ${rows.length} ${rows.length===1?'dag':'dage'} med registreringer</p>
    <div class="comparison-bars daily-dart-bars" role="list" aria-label="Kastede pile pr. dag">${columns}</div>
    ${rows.some(row=>row.incomplete)?'<p class="caption">≥ betyder mindst. Nogle registreringer mangler det præcise antal pile.</p>':''}</section>`;
}

function renderCompare() {
  const sessions = completedSessions();
  const trainingDays = groupTrainingDays(sessions);
  const ranges = compareRanges(sessions);
  const [left,right] = ranges.map(([from,to])=>periodMetrics(trainingDays.filter(([date])=>date>=from&&date<=to).flatMap(([,records])=>records)));
  const daily = trainingDays.map(([date,records])=>({date,metrics:periodMetrics(records)}));
  const choices = [['days','Dage'],['weeks','Uger'],['periods','4 uger ad gangen'],['firstFourth','Uge 1 mod uge 4']];
  const rangeText = ([a,b]) => a===b?day(a+'T12:00:00'):day(a+'T12:00:00')+' – '+day(b+'T12:00:00');
  const max = localDayKey();
  const controls = compareMode==='firstFourth'?'':`<div class="grid">
    ${compareMode==='days'?`<label>Første dag<input type="date" max="${max}" value="${ranges[0][0]}" onchange="compareDates[0]=this.value;render()"></label>`:''}
    <label>${compareMode==='days'?'Anden dag':compareMode==='weeks'?'Dato i seneste uge':'Slutdato'}<input type="date" max="${max}" value="${compareDates[1]|| (compareMode==='weeks'?ranges[1][0]:ranges[1][1])}" onchange="compareDates[1]=this.value;render()"></label></div>`;
  const measured = PERIOD_MEASURES.filter(([key])=>left[key]!==null&&right[key]!==null);
  const onePeriod = PERIOD_MEASURES.filter(([key])=>(left[key]===null)!==(right[key]===null));
  const comparisons = measured.map(([key,label,unit,lower])=>compareChart(key,label,unit,lower,left[key],right[key],daily)).join('');
  const singles = onePeriod.map(([key,label,unit])=>`<li><span>${label}</span><b>${compareValue(left[key]??right[key],unit)}</b><small>${left[key]===null?'Efter':'Før'}</small></li>`).join('');
  const best = periodMetrics(sessions);
  const sessionAverages=sessions.map(summary501).filter(x=>x&&x.legs>=5).map(x=>x.avg);
  const bestAverage=sessionAverages.length?Math.max(...sessionAverages):null;
  return `<section class="card"><h2>Sammenlign udvikling</h2>
    <div class="stats-nav comparison-periods" role="group" aria-label="Sammenlign perioder">${choices.map(([id,label])=>`<button type="button" aria-pressed="${compareMode===id}" onclick="compareMode='${id}';compareDates=['',''];render()">${label}</button>`).join('')}</div>
    ${controls}<div class="comparison-dates"><div><small>Før</small><strong>${rangeText(ranges[0])}</strong></div><div><small>Efter</small><strong>${rangeText(ranges[1])}</strong></div></div>
    ${left.legs!==null||right.legs!==null?`<p class="caption">Spillede 501-legs · Før ${left.legs??0} · Efter ${right.legs??0}</p>`:''}
    ${comparisons?`<div class="comparison-grid">${comparisons}</div>`:'<p class="muted">Ingen øvelser med en måling i begge perioder.</p>'}
    ${singles?`<div class="comparison-single"><h3>Resultater i én periode</h3><ul>${singles}</ul></div>`:''}
    ${compareMode==='firstFourth'?'<p class="caption">Uge 1 er kalenderugen med den første gemte træning.</p>':''}</section>
    ${dailyDartsChart(trainingDays)}<section class="card"><h2>Personlige 501-rekorder</h2><div class="grid">
    ${tile('Hurtigste leg',compareValue(best.fastest501,'pile'))}${tile('Højeste lukning',compareValue(best.checkout501))}${tile('Bedste snit · mindst 5 legs',compareValue(bestAverage))}
    </div></section>`;
}

const CPU_170_LEVELS = {
  easy: {label:'Let', scoring:[.12,.35,.58,.94], doubles:.10, singles:.60},
  even: {label:'Jævnbyrdig', scoring:[.10,.27,.45,.88], doubles:.20, singles:.72},
  hard: {label:'Svær', scoring:[.07,.20,.31,.81], doubles:.30, singles:.84},
};
const CPU_170_DEFAULT = 'even';
const CHECKOUT_FIELDS = [
  ...Array.from({length:20},(_,i)=>({value:3*(20-i),single:20-i,triple:true})),
  ...Array.from({length:20},(_,i)=>({value:20-i,single:20-i})),
  {value:25,single:25},
];
function checkoutDouble(rest) {
  return rest===50 || (rest>=2&&rest<=40&&rest%2===0);
}

function checkoutAim(rest,darts) {
  if(checkoutDouble(rest))return {value:rest,single:rest/2,double:true};
  if(darts<2||rest>60*(darts-1)+50)return null;
  return CHECKOUT_FIELDS.find(field=>checkoutAim(rest-field.value,darts-1))||null;
}

function cpuScoringDart(level,roll) {
  const bracket=level.scoring.findIndex(cutoff=>roll<cutoff);
  return bracket===-1?60:[0,1,5,20][bracket];
}

function cpuVisit(start,level,random=Math.random) {
  let rest=start;
  for(let darts=1;darts<=3;darts++){
    const aim=checkoutAim(rest,4-darts)||
      [40,32,24,16,8,2].map(target=>rest-target).filter(score=>score>0)
        .map(score=>CHECKOUT_FIELDS.find(field=>field.value===score)).find(Boolean);
    const roll=random();
    let score;
    if(!aim)score=cpuScoringDart(level,roll);
    else if(aim.double)score=roll<level.doubles?aim.value:roll<level.doubles+.25?aim.single:0;
    else if(aim.value===60&&rest>110)score=cpuScoringDart(level,1-roll);
    else if(aim.triple)score=roll<1-level.scoring[3]?aim.value:roll<level.singles?aim.single:0;
    else score=roll<level.singles?aim.value:0;
    if(score>rest||rest-score===1||(score===rest&&!aim?.double))return {score:0,darts:3,finish:false,bust:true};
    rest-=score;
    if(rest===0)return {score:start,darts,finish:true};
  }
  return {score:start-rest,darts:3,finish:false};
}

function cpu170Match(events) {
  if(!events.length||events[0]?.bestOf===7)return cpu501Match(events,170,4);
  const player=get501(events,170);
  const cpu=get501(events.map(event=>event.cpu).filter(Boolean),170);
  const winner=player.legs.length?'player':cpu.legs.length?'cpu':null;
  return {player,cpu,winner,level:events[0]?.level??CPU_170_DEFAULT};
}

function selectedCpu170Level(entry) {
  return entry.events[0]?.level??(Object.hasOwn(CPU_170_LEVELS,entry.level)?entry.level:CPU_170_DEFAULT);
}

function setCpu170Level(level) {
  if(state.status!=='active'||!['170cpu','501cpu'].includes(activeExerciseId())||!Object.hasOwn(CPU_170_LEVELS,level)||checkDeadline())return;
  const entry=datum();
  if(entry.events.length)return;
  entry.level=level;
  save();
  render();
}

const CHECKOUT_DOUBLES=[20,16,18,12,10,8,4,2,1,3,5,6,7,9,11,13,14,15,17,19,25]
  .map(n=>({value:n*2,label:n===25?'Bull':'D'+n}));
const CHECKOUT_SETUP_FIELDS=[
  ...CHECKOUT_FIELDS.map(field=>({value:field.value,label:field.triple?'T'+field.single:String(field.single)})),
  ...CHECKOUT_DOUBLES,
];

function findCheckoutRoute(rest,darts){
  const double=CHECKOUT_DOUBLES.find(field=>field.value===rest);
  if(double)return [double.label];
  if(darts<2||rest<2||rest>60*(darts-1)+50)return null;
  for(const field of CHECKOUT_SETUP_FIELDS){
    const remaining=findCheckoutRoute(rest-field.value,darts-1);
    if(remaining)return [field.label,...remaining];
  }
  return null;
}

function checkoutRoute(rest,darts){
  for(let count=1;count<=darts;count++){
    const route=findCheckoutRoute(rest,count);
    if(route)return route;
  }
  return null;
}

function render501LegStrip(result){
  const active=result.legs.length<5?result.legs.length:-1;
  const cells=Array.from({length:5},(_,i)=>{
    const leg=result.legs[i],current=i===active;
    const count=leg?.thrown??(current?result.currentLegThrown:null);
    const value=count?(count.incomplete?'≥':'')+count.darts:'–';
    return `<li class="${current?'leg-playing':''}" ${current?'aria-current="step"':''}><small>Leg ${i+1}</small>
      <strong>${value}</strong>${current?'<span>nu</span>':''}</li>`;
  });
  return `<div class="leg-progress501"><p>Pile pr. leg</p><ol>${cells.join('')}</ol></div>`;
}

function solo501Legs(events){
  const legs=[];
  let visits=[],rest=501,darts=0,chance=null,valid=true,incomplete=false;
  for(const event of events){
    const score=event.score,used=visitDartsThrown(event),left=rest-score;
    if(chance===null&&rest>=2&&rest<=170&&checkoutRoute(rest,3))chance={rest,darts};
    valid=valid&&validScoredVisit(event)&&left>=0&&left!==1&&event.finish===(left===0)&&
      (!event.bust||score===0)&&(!event.finish||!!checkoutRoute(rest,event.darts));
    const attempts=Number.isInteger(event.doubleAttempts)?event.doubleAttempts:null;
    const unknown=visitDartsUnknown(event);
    incomplete=incomplete||unknown;
    visits.push({score,darts:used,rest:left,attempts,bust:event.bust,firstChance:chance?.darts===darts,incomplete:unknown});
    darts+=used;
    rest=left;
    if(event.finish){
      const split=valid&&chance&&!incomplete?{rest:chance.rest,before:chance.darts,after:darts-chance.darts}:null;
      legs.push({visits,darts,split,incomplete});
      visits=[];rest=501;darts=0;chance=null;valid=true;incomplete=false;
    }
  }
  return legs;
}

function render501Breakdown(events){
  const legs=solo501Legs(events);
  if(!legs.length)return '';
  const maxDarts=Math.max(...legs.map(leg=>leg.darts));
  const hasSplit=legs.some(leg=>leg.split);
  const cards=legs.map(({visits,darts,split,incomplete},i)=>{
    const label=split?`Første lukkechance ved ${split.rest} · ${split.after} pile derfra`:
      incomplete?'Antal pile ved bust mangler':'Lukkechance kan ikke beregnes';
    const bar=split?`<span class="leg-track501" aria-hidden="true">
       <i class="leg-before501" style="width:${100*split.before/maxDarts}%"></i>
       <i class="leg-after501" style="width:${100*split.after/maxDarts}%"></i></span>`:'';
    const rows=visits.map((visit,index)=>`<tr${split&&visit.firstChance?' class="leg-first-chance501"':''}>
      <th scope="row">${index+1}${split&&visit.firstChance?' <span class="leg-chance-tag501">Lukkechance</span>':''}</th>
      <td>${visit.bust?'Bust':visit.score}</td><td>${visit.incomplete?'≥':''}${visit.darts}</td>
      <td>${visit.rest>=0?visit.rest:'–'}</td><td>${visit.attempts??'–'}</td></tr>`);
    return `<details class="leg-detail501"><summary>
      <span class="leg-detail-title501"><b>Leg ${i+1}</b><b>${dartTotalText({darts,incomplete})} pile</b></span>
      ${bar}<small>${label}</small></summary>
      ${split?`<p class="caption">${split.before} pile før første lukkechance · ${split.after} pile fra lukkechancen til nul</p>`:''}
      <table aria-label="Indgange i leg ${i+1}"><thead><tr>
       <th scope="col">Indg.</th><th scope="col">Score</th><th scope="col">Pile</th>
       <th scope="col">Rest</th><th scope="col">Doubleforsøg</th></tr></thead>
      <tbody>${rows.join('')}</tbody></table></details>`;
  });
  return `<section class="leg-analysis501">
    <h3>Leg for leg</h3>
    ${hasSplit?`<p class="leg-legend501"><span><i class="leg-before501"></i>Før lukkechance</span>
      <span><i class="leg-after501"></i>Fra lukkechance</span></p>`:''}
    <p class="caption">Lukkechance er den første indgang, du kunne starte med en lukning på højst tre pile.</p>
    ${cards.join('')}</section>`;
}

function render501Comparison(events,session=null){
  const current=fiveLegStats(events);
  if(!current)return '';
  const cutoff=Date.parse(session?.startedAt??session?.date??state.startedAt??'');
  const previous=[],currentId=session?.id??(!session?state.archivedSessionId:null);
  for(const workout of completedSessions().reverse()){
    if(workout===session||(currentId&&workout.id===currentId))continue;
    if(Number.isFinite(cutoff)&&Date.parse(workout.date)>=cutoff)continue;
    const five=fiveLegStats(workout.results['501']?.events??[]);
    if(five)previous.push(five);
    if(previous.length===5)break;
  }
  if(!previous.length)return '';
  const legs=previous.length*5,totalDarts=previous.reduce((sum,set)=>sum+set.darts,0);
  const attempts=previous.every(set=>set.attempts!==null)?previous.reduce((sum,set)=>sum+set.attempts,0):null;
  const units=[
    ['3-pils snit',current.all,501*3*legs/totalDarts,''],
    ['Pile pr. leg',current.darts/5,totalDarts/legs,''],
    ['Doubleprocent',pct(5,current.attempts),pct(legs,attempts),' %'],
  ];
  const result=(value,unit)=>value===null?'–':num(value)+unit;
  return `<section class="leg-analysis501"><h3>Sammenlign 501</h3>
    <table aria-label="Dette sæt mod tidligere solo-501"><thead><tr>
      <th scope="col">Måling</th><th scope="col">Dette sæt</th>
      <th scope="col">Forrige ${previous.length} sæt</th><th scope="col">Forskel</th></tr></thead><tbody>
    ${units.map(([label,now,usual,unit])=>{
      const difference=now===null||usual===null?null:Math.round((now-usual)*10)/10;
      const delta=difference===null?'–':(difference>0?'+':'')+num(difference)+(unit?' pp':'');
      return `<tr><th scope="row">${label}</th><td>${result(now,unit)}</td><td>${result(usual,unit)}</td><td>${delta}</td></tr>`;
    }).join('')}
    </tbody></table>
    ${current.attempts===null||attempts===null?'<p class="caption">Doubleprocent vises, når alle doubleforsøg i de viste sæt er registreret.</p>':''}</section>`;
}

function solo170Goal(entry){
  return entry?.goal===5||!entry?.events?.length?5:1;
}

function render170Legs(score){
  if(!score.legs.length)return '';
  const average=score.legs.reduce((sum,leg)=>sum+leg.darts,0)/score.legs.length;
  return `<div class="tile checkout-summary"><b>${num(average)} pile pr. leg i snit · Hurtigste ${score.bestLeg} pile</b>
    <ol class="list">${score.legs.map(leg=>`<li>${leg.darts} pile · lukket på ${leg.checkout}</li>`).join('')}</ol></div>`;
}

function gameVariant(id,entry){
  if(id==='170')return solo170Goal(entry);
  if(id==='121')return (entry?.locked121?'låst':'tidligere')+'-'+(entry?.events?.[0]?.limit??entry?.limit??9);
  return id;
}

function isCheckoutDrill(id){
  return id==='121'||Object.hasOwn(CATCH_RANGES,id);
}

function hasGameEntries(entry){
  return Boolean(entry?.events?.length||entry?.roundVisits?.at(-1)?.length);
}

function checkoutDrillState(id,entry){
  const n=entry.events.length,round=entry.roundVisits?.[n]??[];
  const ranges=CATCH_RANGES[id];
  const limit=ranges?6:(entry.events[0]?.limit??entry.limit??9);
  const target=ranges?ranges[0]+n:checkout121(entry.events,entry.locked121).target;
  const left=limit-round.reduce((sum,visit)=>sum+visit.darts,0);
  return {target,limit,left,rest:target-round.reduce((sum,visit)=>sum+visit.score,0),round,
    done:n===(ranges?ranges[1]-ranges[0]+1:CHECKOUT_121_ROUNDS)};
}

function validCheckoutProgress(id,entry){
  if(id==='170')return entry.goal===undefined||entry.goal===5;
  if(!isCheckoutDrill(id))return true;
  if(entry.locked121!==undefined&&(id!=='121'||entry.locked121!==true))return false;
  if(id==='121'&&entry.limit!==undefined&&!CHECKOUT_121_LIMITS.includes(entry.limit))return false;
  const rounds=entry.roundVisits;
  if(rounds===undefined)return true;
  if(!Array.isArray(rounds)||rounds.length>entry.events.length+1)return false;
  const limit=id==='121'?(entry.events[0]?.limit??entry.limit??9):6;
  if(rounds.length>entry.events.length&&completedGame(id,entry))return false;
  const partial={...entry,events:[],roundVisits:[]};
  if(id==='121')partial.limit=limit;
  for(let index=0;index<rounds.length;index++){
    const round=rounds[index],complete=index<entry.events.length;
    if(round===null&&complete){partial.events.push(entry.events[index]);continue;}
    if(!Array.isArray(round)||!round.length||round.length>limit/3)return false;
    let {rest}=checkoutDrillState(id,partial),used=0;
    for(const [turn,visit] of round.entries()){
      if(!validMatchVisit(visit,rest)||used+visit.darts>limit)return false;
      if(visit.roundBust!==undefined&&(id!=='121'||visit.roundBust!==true||visit.bust!==true))return false;
      if((visit.finish||visit.roundBust)&&turn!==round.length-1)return false;
      used+=visit.darts;
      rest-=visit.score;
    }
    const {finish,roundBust}=round.at(-1);
    const summary=id==='121'?entry.events[index]?.darts:entry.events[index];
    if(complete?(finish?summary!==used:(!roundBust&&used!==limit)||summary!==0):finish||roundBust||used>=limit)return false;
    if(complete)partial.events.push(entry.events[index]);
  }
  return true;
}

function saveCheckoutVisit(id,entry,visit){
  const x=checkoutDrillState(id,entry);
  if(x.done||visit.darts>x.left||!validMatchVisit(visit,x.rest))return;
  const n=entry.events.length;
  if(id==='121'&&!n&&!entry.roundVisits?.length)entry.locked121=true;
  entry.roundVisits??=Array(n).fill(null);
  const roundBust=id==='121'&&visit.bust===true;
  // Earlier 121 games allowed play to continue after a bust within a round.
  entry.roundVisits[n]=[...x.round,roundBust?{...visit,roundBust:true}:visit];
  if(visit.finish||roundBust||x.left===visit.darts){
    const used=visit.finish?x.limit-x.left+visit.darts:0;
    entry.events.push(id==='121'?{darts:used,limit:x.limit}:used);
  }
  save();render();
}

function undoCheckoutVisit(entry){
  const n=entry.events.length,round=entry.roundVisits?.at(-1);
  if(entry.roundVisits?.length===n+1){
    round.pop();
    if(!round.length)entry.roundVisits.pop();
  }else if(n){
    entry.events.pop();
    if(entry.roundVisits?.length===n){
      if(round?.length>1)round.pop();
      else entry.roundVisits.pop();
    }
  }
}

function renderCheckoutDrill(id,entry,heading,summary){
  const x=checkoutDrillState(id,entry);
  return `<div class="muted">${x.done?'Gennemført':heading+' · Mål '+x.target}</div>
    <div class="scoreboard501 checkout-board"><div><small>Tilbage</small><div class="remaining">${x.done?'✓':x.rest}</div></div>
    <div><small>Pile tilbage i runden</small><div class="smallmetric">${x.done?'–':x.left+' / '+x.limit}</div></div></div>
    <p class="game-status">${summary}</p>${x.done?'':renderScoreEntry(x.rest,false)}`;
}

function saveScoredVisit(visit) {
  if(state.status!=='active'||checkDeadline())return;
  const entry=datum(),id=activeExerciseId();
  if(!entry||state.inBreak)return;
  if(isCheckoutDrill(id)){saveCheckoutVisit(id,entry,visit);return;}
  if(!['501','170','170cpu','501cpu'].includes(id))return;
  if(id==='170'){
    const goal=solo170Goal(entry);
    if(get501(entry.events,170).legs.length>=goal)return;
    if(goal===5)entry.goal=5;
  }
  if(id==='170cpu'||id==='501cpu'){
    const match=id==='501cpu'?cpu501Match(entry.events):cpu170Match(entry.events);
    if(!match||match.winner||match.legWinner)return;
    const level=selectedCpu170Level(entry);
    visit={...visit,...(id==='170cpu'&&(!entry.events.length||entry.events[0]?.bestOf===7)?{bestOf:7}:{}),level,cpu:visit.finish?null:cpuVisit(match.cpu.rest,CPU_170_LEVELS[level])};
  }
  entry.events.push(visit);
  save();
  render();
}

function renderCpuOpponent(id,entry,match) {
  const level=selectedCpu170Level(entry);
  const last=entry.events.at(-1)?.cpu;
  const setup=entry.events.length?'':`<div class="row" role="group" aria-label="Sværhedsgrad">${Object.entries(CPU_170_LEVELS)
    .map(([id,{label}])=>`<button type="button" class="${id===level?'primary':''}" aria-pressed="${id===level}" onclick="setCpu170Level('${id}')">${label}</button>`).join('')}</div>`;
  const tally={wins:0,losses:0};
  for(const workout of state.history){
    const events=workout.results?.[id]?.events;
    if(events?.[0]?.level!==level)continue;
    const winner=(id==='501cpu'?cpu501Match(events):cpu170Match(events))?.winner;
    if(winner==='player')tally.wins++;
    if(winner==='cpu')tally.losses++;
  }
  return `${setup}<div class="tile"><small>CPU · ${CPU_170_LEVELS[level].label}</small>
    <div class="big">${match.winner==='cpu'?0:match.cpu.rest} tilbage</div>
    <small>${match.cpu.darts} pile${last?' · Sidste indgang: '+(last.bust?'bust':last.score):''}</small>
    <small>Historik på niveauet: ${tally.wins} sejre · ${tally.losses} nederlag</small></div>`;
}

function validMatchVisit(visit,rest) {
  if(!validScoredVisit(visit)||visit.score>rest||rest-visit.score===1)return false;
  if(visit.finish)return visit.score===rest&&!!checkoutRoute(rest,visit.darts);
  return visit.score<rest&&visit.darts===3&&(!visit.bust||visit.score===0);
}

function cpu501Match(events,target=501,winsNeeded=3) {
  const player={rest:target,darts:0,score:0,doubleAttempts:0,legs:[]};
  const cpu={rest:target,darts:0};
  const legs=[];
  const level=events[0]?.level??CPU_170_DEFAULT;
  let legDarts=0,legWinner=null,winner=null,losses=0;
  if(!Object.hasOwn(CPU_170_LEVELS,level))return null;
  for(const turn of events){
    if(!turn||turn.level!==level||winner)return null;
    if(turn.opening===true){
      if(!legWinner)return null;
      const cpuStarts=target===501&&legs.length%2===1;
      if(cpuStarts?(!validMatchVisit(turn.cpu,target)||turn.cpu.finish):turn.cpu!==null)return null;
      player.rest=target;
      cpu.rest=target-(turn.cpu?.score??0);
      cpu.darts+=turn.cpu?.darts??0;
      legDarts=0;
      legWinner=null;
      continue;
    }
    if(legWinner||!validMatchVisit(turn,player.rest)||!Number.isInteger(turn.doubleAttempts))return null;
    if(turn.finish?turn.cpu!==null:!validMatchVisit(turn.cpu,cpu.rest))return null;
    player.rest-=turn.score;
    player.score+=turn.score;
    player.darts+=turn.darts;
    player.doubleAttempts+=turn.doubleAttempts;
    legDarts+=turn.darts;
    cpu.rest-=turn.cpu?.score??0;
    cpu.darts+=turn.cpu?.darts??0;
    if(turn.finish){
      legWinner='player';
      player.legs.push({number:legs.length+1,darts:legDarts,checkout:turn.score});
      if(player.legs.length===winsNeeded)winner='player';
    }else if(turn.cpu.finish){
      legWinner='cpu';
      if(++losses===winsNeeded)winner='cpu';
    }
    if(legWinner)legs.push({winner:legWinner,darts:legDarts});
  }
  player.avg=player.darts?player.score*3/player.darts:null;
  player.checkoutPercent=player.doubleAttempts?pct(player.legs.length,player.doubleAttempts):null;
  return {player,cpu,winner,legWinner,legs,losses,level,bestOf:winsNeeded*2-1};
}

function startCpu501Leg() {
  if(state.status!=='active'||!['501cpu','170cpu'].includes(activeExerciseId())||checkDeadline())return;
  const entry=datum(),is170=activeExerciseId()==='170cpu',match=is170?cpu170Match(entry.events):cpu501Match(entry.events);
  if(!match?.legWinner||match.winner)return;
  const cpu=!is170&&match.legs.length%2===1?cpuVisit(501,CPU_170_LEVELS[match.level]):null;
  entry.events.push({opening:true,level:match.level,cpu});
  save();
  render();
}

function renderCpu501Summary(match) {
  const score=`${match.player.legs.length} – ${match.losses}`;
  const completed=match.legs.length;
  if(match.winner)return `<p class="good"><b>${match.winner==='player'?'Du vandt kampen':'CPU vandt kampen'} · ${score}</b></p>`;
  if(match.legWinner){
    const starter=match.bestOf!==7&&completed%2===1?'CPU starter':'Du starter';
    return `<p><b>${match.legWinner==='player'?'Du vandt leget':'CPU vandt leget'} · ${score}</b></p>
      ${button('Start leg '+(completed+1)+' · '+starter,'startCpu501Leg()','primary journal-action')}`;
  }
  return `<p class="game-status"><b>Du ${score} CPU</b> · Leg ${completed+1} af højst ${match.bestOf||5} · ${match.bestOf!==7&&completed%2===1?'CPU startede':'Du starter'}</p>`;
}
