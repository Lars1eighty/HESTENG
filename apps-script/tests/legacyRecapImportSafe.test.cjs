"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const code = fs.readFileSync(path.join(__dirname, "../legacyRecapImportSafe.gs"), "utf8");

function sample(id) {
  const page = { props: { matchInfo: { match_winner: 0,
    opponents: [{name:"Alpha"}, {name:"Beta"}] },
    playersPerGame: [[[
      { set_number:1, set_game_number:1, name:"Alpha", opponent_index:1, player_win:"W" }
    ], [
      { set_number:1, set_game_number:1, name:"Beta", opponent_index:0, player_win:"" }
    ]]] } };
  return '<div data-page="' + JSON.stringify(page).replaceAll('"', '&quot;') + '">';
}
function fixture(ids) {
  const rows = [["MatchID"]];
  const events = [];
  const marked = new Set();
  const problems = { save:false, partialWrite:false, flush:false, label:false, lockBusy:false, broken:new Set() };
  const lockEvents = [];
  let held = false;
  const lock = {
    tryLock(ms) {
      assert.ok(ms === 30000 || ms === 1000, "Only direct/manual (30s) and Thursday (1s) timeouts are expected");
      lockEvents.push("try");
      if (problems.lockBusy || held) return false;
      held = true;
      return true;
    },
    releaseLock() {
      assert.equal(held, true);
      held = false;
      lockEvents.push("release");
    }
  };
  const now = new Date(); now.setHours(20, 0, 0, 0);
  const threads = ids.map((idsInThread, index) => ({
    getMessages: () => idsInThread.map(id => ({
      getDate:()=>now,
      getBody:()=> "https:%2F%2Frecap.dartconnect.com%2Fmatches%2F" + id
    })),
    addLabel() {events.push("label"); if(problems.label)throw Error("label failed"); marked.add(index);}
  }));
  const ctx = vm.createContext({
    LockService:{ getScriptLock:()=>lock },
    SpreadsheetApp:{
      getActive:()=>({getSheetByName:()=>({
        getLastRow:()=>rows.length,
        getRange:(r,c,n,m)=>({
          getValues:()=>rows.slice(r-1,r-1+n).map(row=>Array.from({length:m},(_,j)=>row[c-1+j]??"")),
          setValues:data=>{
            events.push("write");
            if(problems.save)throw Error("save failed");
            if(problems.partialWrite) {
              rows.push(data[0]);
              throw Error("partial write failed");
            }
            rows.push(...data);
          }
        })
      })}),
      flush(){events.push("flush");if(problems.flush)throw Error("flush failed");}
    },
    Session:{getScriptTimeZone:()=>"Europe/Copenhagen"},
    Utilities:{formatDate:()=>"2026/10/27"},
    GmailApp:{
      search:()=>threads.filter((_,i)=>!marked.has(i)),
      getUserLabelByName:()=>"elo-processed"
    },
    UrlFetchApp:{fetch(url){
      const id=url.split("/").at(-1);
      if(problems.broken.has(id))throw Error("fetch failed");
      return {getContentText:()=>sample(id)};
    }},
    Logger:{log(){}}
  });
  vm.runInContext(code,ctx);
  function runPipelineWithOuterLock() {
    assert.equal(lock.tryLock(1000), true);
    try {
      return ctx.importRecapStatsUnderLock_();
    } finally {
      lock.releaseLock();
    }
  }
  return {
    run:()=>ctx.importRecapStats(),
    runPipelineWithOuterLock, rows, events, marked, problems, lockEvents
  };
}

test("saves and flushes before labeling successful threads",()=>{
  const h=fixture([["abc123"]]);h.run();
  assert.deepEqual(h.events,["write","flush","label"]);
  assert.equal(h.rows.length,3);
  assert.equal(h.rows[1].length,20);
});
test("failed save never labels a message",()=>{
  const h=fixture([["abc123"]]);h.problems.save=true;
  assert.throws(h.run,/save failed/);
  assert.equal(h.marked.size,0);
});
test("failed flush is retryable without duplicate import",()=>{
  const h=fixture([["abc123"]]);h.problems.flush=true;
  assert.throws(h.run,/flush failed/);
  h.problems.flush=false;h.run();
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
});
test("partial thread failures do not mark unimported results",()=>{
  const h=fixture([["abc123","def456"]]);
  h.problems.broken.add("def456");h.run();
  assert.equal(h.marked.size,0);
  h.problems.broken.delete("def456");h.run();
  assert.equal(h.rows.length,5);
  assert.equal(h.marked.size,1);
});

test("partial persistence is repaired per leg instead of skipping whole match",()=>{
  const h=fixture([["abc123"]]);
  h.problems.partialWrite=true;
  assert.throws(h.run,/partial write failed/);
  assert.equal(h.rows.length,2); // Header and only Alpha saved.
  assert.equal(h.marked.size,0);
  h.problems.partialWrite=false;
  h.run();
  assert.equal(h.rows.length,3);
  assert.deepEqual(h.rows.slice(1).map(row=>row[3]),["Alpha","Beta"]);
  assert.equal(h.marked.size,1);
  assert.deepEqual(h.events,["write","write","flush","label"]);
});

test("failed Gmail labeling can be retried without duplicate leg rows",()=>{
  const h=fixture([["abc123"]]);
  h.problems.label=true;
  assert.throws(h.run,/label failed/);
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,0);
  h.problems.label=false;
  h.run();
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
  assert.deepEqual(h.events,["write","flush","label","label"]);
});

test("repeated recap mail in separate threads never duplicates stored leg rows",()=>{
  const h=fixture([["abc123"],["abc123"]]);
  h.run();
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,2);
  assert.deepEqual(h.events,["write","flush","label","label"]);
});

test("two importer executions cannot both acquire the same lock",()=>{
  const h=fixture([["abc123"]]);
  h.problems.lockBusy=true;
  assert.throws(h.run,/import optaget/);
  assert.equal(h.rows.length,1);
  assert.equal(h.marked.size,0);
  assert.deepEqual(h.lockEvents,["try"]);
  h.problems.lockBusy=false;
  h.run();
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
  assert.deepEqual(h.lockEvents,["try","try","release"]);
});

test("lock is released when saving throws and a subsequent run can recover",()=>{
  const h=fixture([["abc123"]]);
  h.problems.save=true;
  assert.throws(h.run,/save failed/);
  assert.deepEqual(h.lockEvents,["try","release"]);
  h.problems.save=false;
  h.run();
  assert.deepEqual(h.lockEvents,["try","release","try","release"]);
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
});

test("lock is released after flush and Gmail labeling failures",()=>{
  const h=fixture([["abc123"]]);
  h.problems.flush=true;
  assert.throws(h.run,/flush failed/);
  h.problems.flush=false;
  h.problems.label=true;
  assert.throws(h.run,/label failed/);
  h.problems.label=false;
  h.run();
  assert.deepEqual(h.lockEvents,["try","release","try","release","try","release"]);
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
});

test("Thursday pipeline uses its existing script lock without reacquiring",()=>{
  const h=fixture([["abc123"]]);
  h.runPipelineWithOuterLock();
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
  assert.deepEqual(h.lockEvents,["try","release"]);
  assert.deepEqual(h.events,["write","flush","label"]);
});

test("existing Thursday lock is released if the importer fails",()=>{
  const h=fixture([["abc123"]]);
  h.problems.save=true;
  assert.throws(h.runPipelineWithOuterLock,/save failed/);
  assert.deepEqual(h.lockEvents,["try","release"]);
  assert.equal(h.marked.size,0);
  h.problems.save=false;
  h.runPipelineWithOuterLock();
  assert.deepEqual(h.lockEvents,["try","release","try","release"]);
  assert.equal(h.rows.length,3);
  assert.equal(h.marked.size,1);
});
