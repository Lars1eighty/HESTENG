'use strict';
// Read-only goals: no state writes, migrations, or changes to game completion rules.
const GOAL_GAMES = [
 {id:'501',label:'501',unit:'i snit',target:50,next:55,step:5},
 {id:'catch40',label:'Catch40 · 61–100',unit:'%',target:45,step:5,max:100},
 {id:'checkout6080',label:'Catch40 kort · 60–80',unit:'%',target:45,step:5,max:100},
 {id:'doubles',label:'Doubler',unit:'%',target:20,step:5,max:100},
 {id:'scoring',label:'Scoring 20',unit:'point pr. indgang',target:1.25,step:.25,max:4},
 {id:'singles',label:'Store singler',unit:'% indgange med træf',step:5,max:100},
 {id:'combos',label:'Double-kombinationer',unit:'%',step:5,max:100},
 {id:'jdc',label:'JDC Challenge',unit:'point',step:25},
 {id:'170',label:'170 Challenge · 5 legs',unit:'pile pr. leg',step:1,lower:true,min:3},
 ...CHECKOUT_121_LIMITS.map(limit=>({id:'121',limit,label:'121 Challenge · '+limit+' pile',unit:'% lukket',step:10,max:100})),
 {id:'checkout',label:'Lukninger 60–69 · gammel øvelse',unit:'%',step:10,max:100}
];
function goalValue(config,entry){
 const {id}=config;
 if(!completedGame(id,entry))return null;
 const a=entry.events;
 if(id==='121'){
  // Old unlocked rules are not comparable to today's locked 121 exercise.
  if(!entry.locked121||a[0].limit!==config.limit)return null;
  return 100*checkout121(a,true).closed/a.length;
 }
 if(id==='170'&&solo170Goal(entry)!==5)return null;
 if(id==='501')return fiveLegStats(a)?.all??null;
 if(id==='scoring')return a.reduce((sum,n)=>sum+n,0)/a.length;
 if(id==='doubles'||id==='singles'||id==='combos'||id==='checkout')return 100*a.filter(Boolean).length/a.length;
 if(CATCH_RANGES[id])return catchInfo(id,a).rate;
 return statsFor(id,entry).primary;
}
function goalMeasurements(config){
 const rows=[];const seen=new Set();
 for(const h of completedSessions()){
  const entry=h.results[config.id];
  let value=goalValue(config,entry);
  let source=entry;
  if(value===null&&config.id==='501'){
   const logged=h.results['501log']?.events?.[0];
   if(logged&&validQuick501(logged)&&logged.legs>=5){value=logged.avg;source=h.results['501log'];}
  }
  if(value===null&&['jdc','doubles'].includes(config.id)){
   const logged=h.results.resultlog?.events?.[0];
   if(logged?.game===config.id&&validResultLog(logged)){
    value=config.id==='doubles'?2000/logged.value:logged.value;source=h.results.resultlog;
   }
  }
  if(typeof value!=='number'||!Number.isFinite(value))continue;
  const key=JSON.stringify([Date.parse(h.startedAt||h.date),source]);
  if(seen.has(key))continue;
  seen.add(key);rows.push({value,date:h.date});
 }
 return rows;
}
function goalStatus(config){
 const rows=goalMeasurements(config),recent=rows.slice(-5);
 // Establish a baseline from the first five comparable results; later outliers do not move the target.
 const baseline=rows.slice(0,5).map(r=>r.value).sort((a,b)=>a-b);
 const middle=baseline.length?baseline[Math.floor(baseline.length/2)]:null;
 let target=config.target??(middle===null?null:config.lower?Math.max(config.min??0,Math.ceil(middle)-config.step):Math.min(config.max??Infinity,(Math.floor(middle/config.step)+1)*config.step));
 const hit=value=>config.lower?value<=target:value>=target;
 const successes=target===null?0:recent.filter(r=>hit(r.value)).length;
 const stable=recent.length===5&&successes>=3;
 const next=target===null?null:config.next??(config.lower?Math.max(config.min??0,target-config.step):Math.min(config.max??Infinity,target+config.step));
 return {rows,recent,target,successes,stable,next,
  current:recent.length?recent.reduce((sum,r)=>sum+r.value,0)/recent.length:null,
  latest:rows.at(-1)?.value??null,
  best:rows.length?(config.lower?Math.min(...rows.map(r=>r.value)):Math.max(...rows.map(r=>r.value))):null};
}
function goalText(value,unit){return value===null?'Ingen måling':num(value,2)+' '+unit;}
function renderGoalCard(config){
 const x=goalStatus(config);
 const suggestion=x.stable&&x.next!==x.target?`<p class="good">Stabilt nået · forslag til næste mål: ${goalText(x.next,config.unit)}</p>`:'';
 const volume=config.id==='scoring'&&x.stable?'<p class="caption">Forslag til næste pointmål: 30 → 40 → 50. Dette ændrer ikke Scoring 20; øvelsen afsluttes fortsat ved 20 point.</p>':'';
 return `<section class="card"><h3>${safeString(config.label)}</h3>
 <p><strong>Mål: ${x.target===null?'Fastlægges efter første gennemførte øvelse':goalText(x.target,config.unit)}</strong></p>
 <div class="grid">${tile('Aktuelt · seneste '+x.recent.length,goalText(x.current,config.unit))}${tile('Bedste',goalText(x.best,config.unit))}</div>
 <p class="caption">Seneste: ${goalText(x.latest,config.unit)}${x.rows.length?' · '+day(x.rows.at(-1).date):''}</p>
 <p>${x.successes}/5 på mål · ${x.recent.length}/5 målinger${x.stable?' · stabilt nået':''}</p>
 ${suggestion}${volume}${config.id==='121'?'<p class="caption">Kun de nuværende låste regler og samme pilegrænse sammenlignes.</p>':''}
 ${config.id==='170'?'<p class="caption">Kun gennemførte serier med fem legs sammenlignes.</p>':''}
 ${CATCH_RANGES[config.id]?'<p class="caption">Point alene fortæller ikke antal lukninger. Hurtigregistrerede point indgår derfor ikke i lukkeprocenten.</p>':''}
 </section>`;
}
function renderGoals(){
 return '<h2>Mine mål</h2><p class="muted">Aktuelt niveau er gennemsnittet af op til fem seneste gennemførte øvelser. Stabilt nået kræver mindst tre af fem på mål og fem målinger. Forslag ændrer ikke reglerne.</p>'+GOAL_GAMES.map(renderGoalCard).join('');
}
