import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const html=readFileSync('app/index.html','utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
const core=scripts.find(s=>s.includes("const EX="));
const boot=scripts.at(-1);
const training=readFileSync('app/training.js','utf8');
const sync=readFileSync('app/sync.js','utf8');
const KEY='HESTENG_TRAIN_V8', REC=KEY+'_RECOVERY';
const record=(n=1)=>({id:'r'+n,date:`2026-11-${String(n).padStart(2,'0')}T12:00:00Z`,results:{doubles:{events:[1,0,n%2]}}});
function fixture(raw,fail=null){
 const data=new Map(raw===undefined?[]:[[KEY,raw]]), listeners={};
 const doc={getElementById:()=>null,addEventListener:()=>{},hidden:false};
 const c=vm.createContext({console,Date,JSON,Map,Set,WeakMap,TextEncoder,crypto:webcrypto,AbortSignal,navigator:{onLine:true},document:doc,window:{addEventListener:(n,f)=>listeners[n]=f},setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,confirm:()=>true,alert:()=>{},localStorage:{getItem(k){if(fail==='read')throw Error('read');return data.get(k)??null;},setItem(k,v){if(fail==='write'||fail===k)throw Error('quota');data.set(k,v);}}});
 vm.runInContext(core,c);vm.runInContext(training,c);vm.runInContext(sync.replace('return { start, changed, keyFor, deleteRecord, restoreRecord, trashEntries };','return { start, changed, keyFor, deleteRecord, restoreRecord, trashEntries, upload, pull, reconcile };'),c);
 vm.runInContext('render=()=>{};showTab=()=>{};',c);
 return {c,data,listeners,run:s=>vm.runInContext(s,c),boot:()=>vm.runInContext(boot.replace('render();historySync.start();','historySync.start();'),c)};
}
function valid(history=[]){const f=fixture();f.run('ensurePlan()');const s=JSON.parse(f.run('JSON.stringify(state)'));s.history=history;return s;}
let count=0;async function test(name,fn){await fn();console.log('PASS',name);count++;}
await test('normal startup, write and reload preserve history',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();f.run('state.history.push('+JSON.stringify(record(2))+');save()');const g=fixture(f.data.get(KEY));g.boot();assert.equal(g.run('state.history.length'),2);});
await test('malformed JSON is never overwritten and blocks uploads',async()=>{const f=fixture('{broken');f.boot();assert.equal(f.run('save()'),false);assert.equal(f.data.get(KEY),'{broken');await assert.rejects(f.run('historySync.upload()')); });
await test('invalid state is preserved unchanged',()=>{const raw=JSON.stringify({history:[record()]});const f=fixture(raw);f.boot();assert.equal(f.data.get(KEY),raw);assert.equal(f.run('historyStorageBlocked'),true);});
await test('read error never enables later writes',()=>{const f=fixture('original','read');f.boot();assert.equal(f.run('save()'),false);assert.equal(f.data.get(KEY),'original');});
await test('failed recovery checkpoint prevents primary overwrite',()=>{const raw=JSON.stringify(valid([record()]));const f=fixture(raw,REC);f.boot();f.run('state.history.push('+JSON.stringify(record(2))+');save()');assert.equal(f.data.get(KEY),raw);assert.equal(f.run('storageOk'),false);});
await test('previous exact bytes retained for recovery',()=>{const raw=JSON.stringify(valid([record()]));const f=fixture(raw);f.boot();const before=f.data.get(KEY);f.run('state.history.push('+JSON.stringify(record(2))+');save()');assert.equal(f.data.get(REC),before);});
await test('stale tab cannot remove newer completed training',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();f.data.set(KEY,JSON.stringify(valid([record(),record(2)])));f.run('save()');assert.equal(JSON.parse(f.data.get(KEY)).history.length,2);});
await test('storage event keeps ongoing scoring and merges history',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();f.run("state.results={doubles:{events:[1,1]}};state.status='active'");f.listeners.storage({key:KEY,newValue:JSON.stringify(valid([record(),record(2)]))});assert.equal(f.run('state.results.doubles.events.length'),2);assert.equal(f.run('state.history.length'),2);});
await test('backup merge retains current training and avoids duplicates',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();f.run('backupImport={records:'+JSON.stringify([record(),record(2)])+'};applyArchiveImport()');assert.equal(f.run('state.history.length'),2);f.run('backupImport={records:'+JSON.stringify([record(),record(2)])+'};applyArchiveImport()');assert.equal(f.run('state.history.length'),2);});
await test('reused backup id with different results is retained',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();const changed={...record(),results:{doubles:{events:[1,1,1]}}};assert.equal(f.run('mergeArchiveRecords('+JSON.stringify([changed])+').added.length'),1);});
await test('invalid backup is rejected without changing data',()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();const before=f.data.get(KEY);assert.throws(()=>f.run('archiveRecords({version:8,history:[]})'));assert.equal(f.data.get(KEY),before);});
await test('deletion cannot be called from ordinary history',async()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();assert.equal(await f.run('deleteSession("r1","2026-11-01T12:00:00Z")'),false);assert.equal(f.run('state.history.length'),1);});
await test('cancelling delete confirmation preserves the training',async()=>{const f=fixture(JSON.stringify(valid([record()])));f.boot();f.run('tab="admin";confirm=()=>false');const before=f.data.get(KEY);assert.equal(await f.run('deleteSession("r1","2026-11-01T12:00:00Z")'),false);assert.equal(f.run('state.history.length'),1);assert.equal(f.data.get(KEY),before);});
await test('acknowledged tombstones clear without losing other pending deletes',()=>{const f=fixture(JSON.stringify({...valid([record()]),syncDeleted:['a','b']}));f.boot();f.run('save({...state,syncDeleted:[]},[],["a"])');assert.deepEqual(JSON.parse(f.data.get(KEY)).syncDeleted,['b']);});
await test('all existing exercises and scoring validators remain available',()=>{const f=fixture();assert.equal(f.run('EX.length'),15);assert.equal(f.run('validScoredVisit({score:60,darts:3,finish:false})'),true);assert.equal(f.run('validScoredVisit({score:181,darts:3,finish:false})'),false);assert.equal(f.run('validEvents("catch40",[2,3,6,0])'),true);assert.equal(f.run('validEvents("catch40",[1])'),false);});
console.log(`${count} history tests passed`);
