import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=readFileSync('app/index.html','utf8');
const core=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const EX='));
let now=0,finished=0;const handlers={},timers=new Map();let tid=0;
class Clock extends Date{static now(){return now;}}
const add=(type,fn)=>(handlers[type]??=[]).push(fn);
const button={isConnected:true,closest:s=>s==='#hold-finish'?button:null,matches:s=>s==='#hold-finish',classList:{add(){},remove(){}},setPointerCapture(){}};
const c=vm.createContext({console,Date:Clock,Math,document:{addEventListener:add,hidden:false},window:{addEventListener:add},setTimeout:(fn)=>{timers.set(++tid,fn);return tid;},clearTimeout:id=>timers.delete(id)});
const run=s=>vm.runInContext(s,c);
run(core);run('state={...fresh(),status:"active",startedAt:"2026-11-26T12:00:00Z",plan:["501"]};');
c.finishSolo=()=>finished++;c.save=()=>true;c.render=()=>{};
run(readFileSync('app/safety.js','utf8'));
function emit(type,extra={}){for(const fn of handlers[type]||[])fn({target:button,button:0,isPrimary:true,pointerId:1,clientX:5,clientY:5,preventDefault(){},...extra});}
function advance(ms){now+=ms;if(ms>=2000){for(const [id,fn] of [...timers]){timers.delete(id);fn();}}}
let count=0;function test(name,fn){emit('pointercancel');button.isConnected=true;run('tab="train";state.status="active";document.hidden=false;');const before=finished;fn(before);count++;console.log('PASS',name);}
test('ordinary click never finishes',before=>{emit('click');assert.equal(finished,before);});
test('short Android touch does not finish',before=>{emit('pointerdown',{pointerType:'touch'});advance(150);emit('pointerup',{pointerType:'touch'});emit('click');assert.equal(finished,before);});
test('1999 milliseconds is insufficient',before=>{emit('pointerdown');advance(1999);emit('pointerup');assert.equal(finished,before);});
test('two second touch finishes once after release',before=>{emit('pointerdown',{pointerType:'touch'});advance(2000);assert.equal(finished,before);emit('pointerup',{pointerType:'touch'});emit('click');assert.equal(finished,before+1);});
test('dragging cancels the hold',before=>{emit('pointerdown');advance(1000);emit('pointermove',{clientX:40});advance(2000);emit('pointerup');assert.equal(finished,before);});
test('pointer cancellation cancels the hold',before=>{emit('pointerdown');advance(2200);emit('pointercancel');emit('pointerup');assert.equal(finished,before);});
test('scrolling cancels the hold',before=>{emit('pointerdown');advance(2200);emit('scroll');emit('pointerup');assert.equal(finished,before);});
test('losing focus or hiding page cancels the hold',before=>{for(const type of ['blur','visibilitychange']){emit('pointerdown');advance(2200);emit(type);emit('pointerup');}assert.equal(finished,before);});
test('second finger cancels, it cannot complete the first hold',before=>{emit('pointerdown');advance(2200);emit('pointerdown',{pointerId:2,isPrimary:false});emit('pointerup');assert.equal(finished,before);});
test('detached or replaced button cannot finish',before=>{emit('pointerdown');advance(2200);button.isConnected=false;emit('pointerup');assert.equal(finished,before);});
test('changing step or navigating away invalidates hold',before=>{emit('pointerdown');advance(2200);run('tab="stats"');emit('pointerup');assert.equal(finished,before);});
test('keyboard tap is rejected, keyboard hold is accessible',before=>{emit('keydown',{key:'Enter'});advance(100);emit('keyup',{key:'Enter'});assert.equal(finished,before);emit('keydown',{key:' '});advance(2000);emit('keyup',{key:' '});assert.equal(finished,before+1);});
test('storage failure blocks even a valid long hold',before=>{c.save=()=>false;emit('pointerdown');advance(2100);emit('pointerup');assert.equal(finished,before);c.save=()=>true;});
test('completed programme archives once as complete',before=>{run('state.plan=["doubles","scoring"];state.step=1;state.results={scoring:{events:Array(20).fill(1)}};');let status;c.archiveCurrent=s=>{status=s;finished++;};emit('pointerdown');advance(2000);emit('pointerup');emit('click');assert.equal(status,'complete');assert.equal(finished,before+1);});
test('unfinished programme is retained as partial',before=>{run('state.plan=["doubles","scoring"];state.step=0;state.results={doubles:{events:[1]}};');let status;c.archiveCurrent=s=>{status=s;finished++;};emit('pointerdown');advance(2000);emit('pointerup');assert.equal(status,'partial');assert.equal(finished,before+1);});
test('history contains no delete control and admin is separate',()=>{assert.equal(html.includes('Slet denne træning'),false);assert.equal(html.includes('onclick="deleteSessionByJournal'),false);assert.ok(html.includes("showTab('admin')"));assert.ok(!html.includes("button('Afslut og gem'"));assert.ok(!html.includes("button(canUndo?'Gem og afslut'"));});
console.log(count+' finish and UI safety tests passed');
