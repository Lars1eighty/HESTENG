import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync('app/index.html','utf8');
function context(h=html,training=readFileSync('app/training.js','utf8')){
 const core=[...h.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const EX='));
 const c=vm.createContext({console,Date});vm.runInContext(core,c);vm.runInContext(training,c);vm.runInContext(readFileSync('app/goals.js','utf8'),c);return s=>vm.runInContext(s,c);
}
const run=context();const config=id=>`GOAL_GAMES.find(c=>c.id==='${id}')`;
let count=0;function test(name,fn){fn();count++;console.log('PASS',name);}
function history(results){run('state.history='+JSON.stringify(results.map((r,i)=>({id:'t'+i,date:`2026-11-${String(i+1).padStart(2,'0')}T12:00:00Z`,results:r}))));}
const score=value=>({scoring:{events:Array(20).fill(value)}});
test('all real non-CPU exercises have goals, 121 separated by limit',()=>{assert.equal(run('GOAL_GAMES.length'),13);assert.equal(run('GOAL_GAMES.some(c=>c.id.includes("cpu"))'),false);for(const id of ['501','catch40','checkout6080','doubles','scoring','singles','combos','jdc','170','121','checkout'])assert.equal(run('GOAL_GAMES.some(c=>c.id==='+JSON.stringify(id)+')'),true);});
test('empty history renders without writing or fake results',()=>{history([]);const before=run('JSON.stringify(state)');assert.ok(run('renderGoals()').includes('Ingen måling'));assert.equal(run('JSON.stringify(state)'),before);});
test('fixed 501, Catch40 and doubles goals',()=>{for(const [id,value] of [['501',50],['catch40',45],['doubles',20]])assert.equal(run(`goalStatus(${config(id)}).target`),value);});
test('one good result is not stable',()=>{history([score(2)]);assert.equal(run(`goalStatus(${config('scoring')}).stable`),false);});
test('three of five at 1.25 establishes scoring stability',()=>{history([score(2),score(1),score(2),score(1),score(2)]);assert.equal(run(`goalStatus(${config('scoring')}).stable`),true);assert.equal(run(`goalStatus(${config('scoring')}).successes`),3);});
test('stability uses last five, best uses full history',()=>{history([score(4),score(1),score(1),score(1),score(1),score(2)]);assert.equal(run(`goalStatus(${config('scoring')}).stable`),false);assert.equal(run(`goalStatus(${config('scoring')}).best`),4);});
test('partial exercises do not enter targets',()=>{history([{scoring:{events:[4]}},{doubles:{events:[1,1]}},{catch40:{events:[2]}}]);for(const id of ['scoring','doubles','catch40'])assert.equal(run(`goalMeasurements(${config(id)}).length`),0);});
test('Catch40 percentage is closures, not points',()=>{history([{catch40:{events:[...Array(18).fill(2),...Array(22).fill(0)]}}]);assert.equal(run(`goalStatus(${config('catch40')}).latest`),45);});
test('point-only quick Catch40 is never converted into a closure percentage',()=>{history([{resultlog:{events:[{game:'catch40',value:27}]}}]);assert.equal(run(`goalMeasurements(${config('catch40')}).length`),0);});
test('quick doubles and JDC use recorded values',()=>{history([{resultlog:{events:[{game:'doubles',value:100}]}},{resultlog:{events:[{game:'jdc',value:425}]}}]);assert.equal(run(`goalStatus(${config('doubles')}).latest`),20);assert.equal(run(`goalStatus(${config('jdc')}).latest`),425);});
test('121 limits and legacy rules never mix',()=>{history([9,12,15].map(limit=>({'121':{locked121:true,events:Array(10).fill({limit,darts:3})}})).concat([{'121':{events:Array(10).fill({limit:9,darts:3})}}]));for(const limit of [9,12,15])assert.equal(run(`goalMeasurements(GOAL_GAMES.find(c=>c.id==='121'&&c.limit===${limit})).length`),1);});
test('repeated same training is not counted twice for stability',()=>{history([score(2)]);run('state.history.push(copy(state.history[0]))');assert.equal(run(`goalMeasurements(${config('scoring')}).length`),1);});
test('no writes or scoring changes while rendering goals',()=>{history([score(2)]);run('ensurePlan()');const before=run('JSON.stringify(state)');run('renderGoals()');assert.equal(run('JSON.stringify(state)'),before);assert.equal(run('completedGame("scoring",{events:Array(20).fill(1)})'),true);});
const expected=JSON.parse(readFileSync('tests/scoring-baseline.json','utf8'));
const fixtures={doubles:{events:[...Array(20).fill(1),...Array(80).fill(0)]},singles:{events:[...Array(20).fill(2),...Array(20).fill(0)]},scoring:{events:Array(20).fill(1)},catch40:{events:Array(40).fill(3)},checkout6080:{events:Array(21).fill(6)},combos:{events:Array(60).fill(1)},checkout:{events:Array(10).fill(3)},jdc:{events:Array(33).fill(0)},'121':{locked121:true,events:Array(10).fill({limit:9,darts:3})},'170':{goal:5,events:Array.from({length:5},()=>[{score:100,darts:3,finish:false,doubleAttempts:0},{score:70,darts:2,finish:true,doubleAttempts:1}]).flat()},'501':{events:Array.from({length:5},()=>[{score:180,darts:3,finish:false,doubleAttempts:0},{score:180,darts:3,finish:false,doubleAttempts:0},{score:141,darts:3,finish:true,doubleAttempts:1}]).flat()}};
test('all 11 scoring and statistics outputs match pre-change source',()=>{for(const [id,entry] of Object.entries(fixtures)){const expr=`JSON.stringify([statsFor(${JSON.stringify(id)},${JSON.stringify(entry)}),completedGame(${JSON.stringify(id)},${JSON.stringify(entry)}),validResults({[${JSON.stringify(id)}]:${JSON.stringify(entry)}})])`;assert.equal(run(expr),JSON.stringify(expected[id]),id);}});
test('501 bust and checkout calculations match pre-change source',()=>{const events=[{score:180,darts:3,finish:false},{score:180,darts:3,finish:false},{score:101,darts:3,finish:false},{score:0,darts:3,bust:true,thrown:1,finish:false,doubleAttempts:1},{score:40,darts:1,finish:true,doubleAttempts:1}];assert.equal(run(`JSON.stringify(get501(${JSON.stringify(events)}))`),JSON.stringify(expected.bust501));});
console.log(count+' goal and scoring tests passed');
