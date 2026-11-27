import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_training_history.sql','utf8'));
const db={
 prepare(query){
  return {bind(...args){
   return {query,args,async all(){return {results:sql.prepare(query).all(...args)};}};
  }};
 },
 async batch(items){
  sql.exec('BEGIN');
  try{const results=items.map(({query,args})=>({meta:{changes:Number(sql.prepare(query).run(...args).changes)}}));sql.exec('COMMIT');return results;}
  catch(e){sql.exec('ROLLBACK');throw e;}
 }
};
const worker=await import('data:text/javascript;base64,'+Buffer.from(readFileSync('worker/index.js','utf8')).toString('base64'));
let posts=0,offline=false;
async function fetchApi(url,opts={}){if(offline)throw Error('offline');if(opts.method==='POST')posts++;return worker.default.fetch(new Request('https://test.invalid'+url,{...opts,headers:{...opts.headers,'oai-authenticated-user-id':'owner'}}),{DB:db});}
const html=readFileSync('app/index.html','utf8');const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
function device(){const data=new Map();const c=vm.createContext({console,Date,JSON,Map,Set,WeakMap,TextEncoder,crypto:webcrypto,AbortSignal,navigator:{onLine:true},document:{getElementById:()=>null,addEventListener:()=>{}},window:{addEventListener:()=>{}},setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,fetch:fetchApi,localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}});const run=s=>vm.runInContext(s,c);run(scripts.find(s=>s.includes('const EX=')));run(readFileSync('app/training.js','utf8'));run(readFileSync('app/sync.js','utf8').replace('return { start, changed, keyFor, deleteRecord, restoreRecord, trashEntries };','return { start, changed, keyFor, deleteRecord, restoreRecord, trashEntries, pull, upload, reconcile };'));run('render=()=>{};ensurePlan();save()');return {run,data,async sync(){await run('historySync.pull()');await run('historySync.upload()');await run('historySync.reconcile()');}};}
const r={id:'new',date:'2026-11-26T12:00:00Z',results:{doubles:{events:[1,0,1]}}};
const a=device(),b=device();a.run('state.history.push('+JSON.stringify(r)+');save()');await a.sync();assert.equal(sql.prepare('SELECT count(*) n FROM training_history').get().n,1);
await b.sync();assert.equal(b.run('state.history.length'),1);assert.equal(JSON.parse(b.data.get('HESTENG_TRAIN_V8')).history.length,1);console.log('PASS two devices upload, download, persist');
const empty=device();await empty.sync();assert.equal(empty.run('state.history.length'),1);assert.equal(sql.prepare('SELECT count(*) n FROM training_history WHERE payload IS NOT NULL').get().n,1);console.log('PASS empty device cannot erase server history');
const key=sql.prepare('SELECT record_key FROM training_history').get().record_key;
const original=sql.prepare('SELECT payload FROM training_history').get().payload;
const res=await fetchApi('/api/history',{method:'POST',headers:{'X-DART-Training-Sync':'1'},body:JSON.stringify([{key,record:{date:'2020-01-01',results:{}}}])});assert.equal(res.status,200);assert.equal(sql.prepare('SELECT payload FROM training_history').get().payload,original);console.log('PASS stale or empty record cannot replace existing server payload');
const invalid=await fetchApi('/api/history',{method:'POST',headers:{'X-DART-Training-Sync':'1'},body:'[]'});assert.equal(invalid.status,400);console.log('PASS empty upload rejected without mutation');
offline=true;const before=posts;await assert.rejects(a.sync());assert.equal(posts,before);assert.equal(a.run('state.history.length'),1);offline=false;await a.sync();console.log('PASS network failure and retry preserve training');
const reload=device();reload.data.set('HESTENG_TRAIN_V8',b.data.get('HESTENG_TRAIN_V8'));reload.run('state=JSON.parse(localStorage.getItem(KEY))');await reload.sync();assert.equal(reload.run('state.history.length'),1);console.log('PASS reload and repeat sync avoid duplicates');
console.log('6 sync integration tests passed');
let safetyCount=0;async function safety(name,fn){await fn();safetyCount++;console.log('PASS',name);}
const revision=()=>Number(sql.prepare('SELECT seq FROM training_history WHERE record_key=?').get(key).seq);
const action=(kind,rev,owner='owner')=>worker.default.fetch(new Request('https://test.invalid/api/history/action',{method:'POST',headers:{'X-DART-Training-Sync':'1','oai-authenticated-user-id':owner},body:JSON.stringify({key,revision:rev,action:kind})}),{DB:db});
let deletedRevision;
await safety('soft delete retains exact original on server and moves training to trash',async()=>{await a.run('historySync.deleteRecord(state.history[0])');assert.equal(a.run('state.history.length'),0);assert.equal(a.run('historySync.trashEntries().length'),1);const stored=JSON.parse(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload);assert.equal(stored.deleted,true);assert.equal(JSON.stringify(stored.record),original);deletedRevision=revision();});
await safety('stale other device cannot resurrect deleted record',async()=>{assert.equal(b.run('state.history.length'),1);await b.sync();assert.equal(b.run('state.history.length'),0);assert.equal(JSON.parse(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload).deleted,true);});
await safety('importing an old backup does not resurrect a deleted training',async()=>{b.run('state.history.push('+JSON.stringify(r)+');save()');await b.sync();assert.equal(b.run('state.history.length'),0);assert.equal(JSON.parse(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload).deleted,true);});
await safety('fresh device sees recoverable trash after reload',async()=>{const fresh=device();await fresh.sync();assert.equal(fresh.run('state.history.length'),0);assert.equal(fresh.run('historySync.trashEntries().length'),1);});
await safety('restore preserves data and propagates to second device',async()=>{await a.run('historySync.restoreRecord('+JSON.stringify(key)+')');await b.sync();assert.equal(a.run('state.history.length'),1);assert.equal(b.run('state.history.length'),1);assert.equal(a.run('historySync.trashEntries().length'),0);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('delayed delete with old revision cannot erase restored record',async()=>{const res=await action('delete',deletedRevision);assert.equal(res.status,409);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('legacy unversioned delete is rejected',async()=>{const res=await fetchApi('/api/history',{method:'POST',headers:{'X-DART-Training-Sync':'1'},body:JSON.stringify([{key,record:null}])});assert.equal(res.status,400);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('offline delete and restore do not mutate local or server history',async()=>{offline=true;await assert.rejects(a.run('historySync.deleteRecord(state.history[0])'));await assert.rejects(a.run('historySync.restoreRecord('+JSON.stringify(key)+')'));offline=false;assert.equal(a.run('state.history.length'),1);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('record belonging to another user cannot be deleted',async()=>{const res=await action('delete',revision(),'someone-else');assert.equal(res.status,409);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('legacy pending deletion is cancelled instead of deleting restored data',async()=>{b.run('state.syncDeleted=['+JSON.stringify(key)+'];save()');await b.sync();assert.equal(b.run('state.syncDeleted.length'),0);assert.equal(b.run('state.history.length'),1);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
await safety('network failure after server deletion is recovered by subsequent sync',async()=>{const res=await action('delete',revision());assert.equal(res.status,200);offline=true;await assert.rejects(a.sync());offline=false;await a.sync();assert.equal(a.run('state.history.length'),0);assert.equal(a.run('historySync.trashEntries().length'),1);await a.run('historySync.restoreRecord('+JSON.stringify(key)+')');await b.sync();assert.equal(b.run('state.history.length'),1);});
await safety('compare-and-swap rejects race between read and database update',async()=>{let raced=false;const racingDb={prepare:db.prepare,async batch(items){if(!raced){raced=true;sql.prepare('UPDATE training_history SET seq=seq+1000 WHERE record_key=?').run(key);}return db.batch(items);}};const rev=revision();const res=await worker.default.fetch(new Request('https://test.invalid/api/history/action',{method:'POST',headers:{'X-DART-Training-Sync':'1','oai-authenticated-user-id':'owner'},body:JSON.stringify({key,revision:rev,action:'delete'})}),{DB:racingDb});assert.equal(res.status,409);assert.equal(sql.prepare('SELECT payload FROM training_history WHERE record_key=?').get(key).payload,original);});
console.log(safetyCount+' deletion and restore integration tests passed');
