// Test with: node --test apps-script/tests/lavPuljer3.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname,'../lavPuljer3.gs'),'utf8');
const ctx = vm.createContext({});
vm.runInContext(script,ctx);
const plan = ctx.hestengPlanPuljer_;
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
function verify(result, expectedTotal) {
  const all = result.pools.flatMap(p=>p.names);
  assert.equal(all.length,expectedTotal);
  assert.equal(new Set(all).size,expectedTotal);
  for (const pool of result.pools) {
    assert.ok(pool.names.length>=5);
    assert.ok(pool.names.length<=7);
    if (pool.names.length===7) assert.ok('AB'.includes(pool.letter));
    assert.equal(pool.rounds.length,pool.names.length%2===0?pool.names.length-1:pool.names.length);
    const pairs = new Set();
    for (const round of pool.rounds) {
      const seen = new Set();
      for (const [a,b] of round) {
        assert.ok(!seen.has(a) && !seen.has(b));
        seen.add(a); seen.add(b);
        const pair=[a,b].sort().join('||');
        assert.ok(!pairs.has(pair));
        pairs.add(pair);
      }
    }
    assert.equal(pairs.size,pool.names.length*(pool.names.length-1)/2);
    assert.ok(Number.isFinite(pool.minutes));
  }
  const broni = result.pools.find(p => p.names.includes('Ole Broni'));
  if (broni) assert.ok(!(broni.names.includes('Tom Petersen') && broni.names.includes('Yrsa Petersen')));
}
test('26 players: A/B strongest, CDE balanced, no extras', ()=>{
  const result=plan(players,{},'2026-10-29');
  verify(result,26);
  assert.equal(result.sizes.join('-'),'6-5-5-5-5');
  const ranked=players.slice().sort((a,b)=>b.elo-a.elo||a.name.localeCompare(b.name,'da'));
  assert.deepEqual(
    new Set(result.pools.slice(0,2).flatMap(p=>p.names)),
    new Set(ranked.slice(0,11).map(p=>p.name))
  );
  const means=result.pools.slice(2).map(p=>p.avgElo);
  assert.ok(Math.max(...means)-Math.min(...means)<50);
  const broni=result.pools.find(p=>p.names.includes('Ole Broni'));
  assert.ok(!broni.names.includes('Tom Petersen') && !broni.names.includes('Yrsa Petersen'));
  assert.notEqual(result.pools.find(p=>p.names.includes('Jesper Andersen')).letter,
                  result.pools.find(p=>p.names.includes('Thomas Westh')).letter);
});
test('29 players and mixed lower pools',()=>{
  const more=players.concat([
    {name:'Ny 1221',elo:1221},{name:'Ny 1160',elo:1160},{name:'Ny 1020',elo:1020}
  ]);
  const result=plan(more,{},'2026-11-05');
  verify(result,29);
  assert.equal(result.sizes.join('-'),'6-6-6-6-5');
});
test('14–35 player counts stay in allowed sizes and do not duplicate games',()=>{
  for(let total=14;total<=35;total++){
    const generated=Array.from({length:total},(_,i)=>({name:'Spiller '+i,elo:1600-i*8}));
    verify(plan(generated,{},'2026-11-05'),total);
  }
});
test('same date reproducible, different dates can vary lower opponents',()=>{
  const first=plan(players,{},'2026-11-05');
  assert.equal(JSON.stringify(first),JSON.stringify(plan(players,{},'2026-11-05')));
  const candidates=new Set(['2026-11-05','2026-11-12','2026-11-19']
    .map(date=>JSON.stringify(plan(players,{},date).pools.slice(2).map(p=>p.names))));
  assert.ok(candidates.size>=2);
});
