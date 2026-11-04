// node --test apps-script/tests/lavPuljer3.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname,'../lavPuljer3.gs'),'utf8');
const ctx = vm.createContext({});
vm.runInContext(script,ctx);
const plan = ctx.hestengPlanPuljer_;
const recent = ctx.hestengPuljeModstandereFraArk_;
const score = ctx.hestengPuljeRotationScore_;
const pairKey = ctx.hestengPuljeParNoegle_;

const players = [
['Jens Oli Jespersen',1479],['Simon Halkjær',1408],['William Nielsen',1349],
['Bjarne Villadsen',1327],['Jens Ole Thomsen',1260],['Hans Hedegaard',1253],
['Jesper Sund',1243],['Johnny Hansen',1243],['Dan Dyhrberg',1230],
['Lars Hesteng Jensen',1226],['Michael Villadsen',1224],['Jesper Andersen',1219],
['Allan Noergaard',1214],['Thomas Westh',1200],['Kim Thomassen',1194],
['Betina Pedersen',1184],['Jan Kjeldsen',1178],['Jens Kristian Villadsen',1176],
['Brian Nielsen',1164],['Pia Aggerholm',1156],['Kasper Schwalbe',1151],
['Jannie Nielsen',1105],['Ole Broni',1098],['Philip Nielsen',1036],
['Tom Petersen',984],['Yrsa Petersen',946]
].map(([name,elo])=>({name,elo}));

function verify(result, n) {
  const all = result.pools.flatMap(p=>p.names);
  assert.equal(all.length,n);
  assert.equal(new Set(all).size,n);
  for (const p of result.pools) {
    assert.ok(p.names.length>=5 && p.names.length<=7);
    if(p.names.length===7)assert.ok('AB'.includes(p.letter));
    assert.equal(p.rounds.length,p.names.length%2?p.names.length:p.names.length-1);
    const pairs = new Set();
    for (const round of p.rounds) {
      const inRound = round.flat();
      assert.equal(new Set(inRound).size,inRound.length);
      for(const match of round){
        const key=match.slice().sort().join('|');
        assert.ok(!pairs.has(key));
        pairs.add(key);
      }
    }
    assert.equal(pairs.size,p.names.length*(p.names.length-1)/2);
    assert.ok(Number.isFinite(p.minutes));
  }
}

test('26: A/B have top 11, CDE random and no extra games',()=>{
  const p=plan(players,{},'2026-11-05',new Map());
  verify(p,26);
  assert.equal(p.sizes.join('-'),'6-5-5-5-5');
  const top=players.slice().sort((a,b)=>b.elo-a.elo||a.name.localeCompare(b.name,'da'))
    .slice(0,11).map(p=>p.name);
  const ab=p.pools.slice(0,2).flatMap(p=>p.names);
  assert.deepEqual(new Set(ab),new Set(top));
});

test('29 and 14–35 all avoid groups of four',()=>{
  const more=players.concat([
    {name:'Ny 1221',elo:1221},{name:'Ny 1160',elo:1160},{name:'Ny 1020',elo:1020}
  ]);
  const res=plan(more,{},'2026-11-05');
  verify(res,29);
  assert.equal(res.sizes.join('-'),'6-6-6-6-5');
  for (let n=14;n<=35;n++) {
    const input=Array.from({length:n},(_,i)=>({name:'Spiller '+i,elo:1600-i*8}));
    verify(plan(input,{},'2026-11-05'),n);
  }
});

test('last two attendances per person and DartConnect aliases',()=>{
  const rows=[
    ['9/3/2026','Ole Broni','Tom Petersen'],
    ['9/10/2026','Ole Broni','Philip Nielsen'],
    ['9/17/2026','Ole Broni','Yrsa ..'],
    ['9/17/2026','Tom Petersen','Jannie Nielsen'],
    ['9/24/2026','Ole Broni','Philip Nielsen'],
    ['9/24/2026','Tom Petersen','Brian Nielsen'],
    ['10/22/2026','Billiam Nielsen','Simon Halkjaer'],
    ['11/5/2026','Ole Broni','Tom Petersen']
  ];
  const sheet={getLastRow:()=>rows.length+1,getRange:()=>({getValues:()=>rows})};
  const ss={getSheetByName:n=>n==='DC_Matches'?sheet:null,
    getSpreadsheetTimeZone:()=> 'Europe/Copenhagen'};
  const w=recent(ss,players.map(p=>p.name),'2026-11-05');
  assert.equal(w.get(pairKey('Ole Broni','Tom Petersen'))||0,0);
  assert.ok(w.get(pairKey('Ole Broni','Yrsa Petersen'))>0);
  assert.ok(w.get(pairKey('Ole Broni','Philip Nielsen'))>0);
  assert.ok(w.get(pairKey('William Nielsen','Simon Halkjær'))>0);
});

test('rotation reduces rematches, while A/B stay locked',()=>{
  const day='2026-11-05';
  const plain=plan(players,{},day,new Map());
  const weights=new Map();
  for(const pool of plain.pools.slice(2)) {
    for(let i=0;i<pool.names.length;i++) {
      for(let j=i+1;j<pool.names.length;j++) {
        weights.set(pairKey(pool.names[i],pool.names[j]),3);
      }
    }
  }
  const optimized=plan(players,{},day,weights);
  verify(optimized,26);
  assert.ok(score(optimized.pools,weights) < score(plain.pools,weights));
  assert.deepEqual(new Set(optimized.pools.slice(0,2).flatMap(p=>p.names)),
    new Set(plain.pools.slice(0,2).flatMap(p=>p.names)));
});

test('same date and history reproducible; a new Thursday changes random draw',()=>{
  const same1=plan(players,{},'2026-11-05');
  const same2=plan(players,{},'2026-11-05');
  assert.equal(JSON.stringify(same1),JSON.stringify(same2));
  const variants=new Set(['2026-11-05','2026-11-12','2026-11-19']
    .map(day=>JSON.stringify(plan(players,{},day).pools.slice(2).map(p=>p.names))));
  assert.ok(variants.size>1);
});

test('without match history, the allocation still works',()=>{
  const ss={getSheetByName:()=>null};
  const weights=recent(ss,players.map(p=>p.name),'2026-11-05');
  assert.equal(weights.size,0);
  verify(plan(players,{},'2026-11-05',weights),26);
});


test('exactly two wheelchair users do not share a pool',()=>{
  for(let day=1;day<=12;day++){
    const r=plan(players,{},'2026-11-'+String(day).padStart(2,'0'));
    verify(r,26);
    const a=r.pools.findIndex(p=>p.names.includes('Jesper Andersen'));
    const b=r.pools.findIndex(p=>p.names.includes('Thomas Westh'));
    assert.notEqual(a,b);
  }
});

test('wheelchair user may play A or B when ELO permits',()=>{
  const elevated=players.map(p=>p.name==='Jesper Andersen'?{...p,elo:1550}:p);
  const r=plan(elevated,{},'2026-11-05');
  verify(r,26);
  assert.equal(r.pools.find(p=>p.names.includes('Jesper Andersen')).letter,'A');
  assert.notEqual(r.pools.findIndex(p=>p.names.includes('Jesper Andersen')),
    r.pools.findIndex(p=>p.names.includes('Thomas Westh')));
});

test('same-pool conflicts in A/B are fixed by a minimum-change swap',()=>{
  for(const elos of [[1600,1500],[1237,1236]]){
    const changed=players.map(p=>p.name==='Jesper Andersen'?{...p,elo:elos[0]}:
      p.name==='Thomas Westh'?{...p,elo:elos[1]}:p);
    const r=plan(changed,{},'2026-11-05');
    verify(r,26);
    assert.notEqual(r.pools.findIndex(p=>p.names.includes('Jesper Andersen')),
      r.pools.findIndex(p=>p.names.includes('Thomas Westh')));
  }
});

test('15 players: two wheelchair users can be separated from sole C pool',()=>{
  const data=Array.from({length:13},(_,i)=>({name:'Nonchair '+i,elo:1800-i*20}))
    .concat([{name:'Jesper Andersen',elo:850},{name:'Thomas Westh',elo:840}]);
  const r=plan(data,{},'2026-11-05');
  verify(r,15);
  assert.notEqual(r.pools.findIndex(p=>p.names.includes('Jesper Andersen')),
    r.pools.findIndex(p=>p.names.includes('Thomas Westh')));
});
