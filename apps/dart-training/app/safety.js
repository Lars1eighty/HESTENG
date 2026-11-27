'use strict';
function renderSafeFinish(){
 return '<footer class="safe-finish"><button type="button" id="hold-finish" class="hold-finish" aria-label="Hold i to sekunder for at gemme og afslutte træningen">Hold 2 sek. for at afslutte</button><p class="caption">Alle registreringer gemmes. Et almindeligt tryk afslutter ikke.</p></footer>';
}
// Pointer Events cover Android touch, mouse and pen. Releasing early, moving,
// scrolling, changing tab or losing focus cancels the hold. Click never finishes.
(()=>{
 let hold=null;
 const token=()=>JSON.stringify([state.startedAt,state.step,state.plan]);
 function cancel(){
  if(hold){clearTimeout(hold.timer);hold.button.classList.remove('holding','ready');hold.button.textContent='Hold 2 sek. for at afslutte';}
  hold=null;
 }
 function begin(button,kind,id,x,y){
  cancel();
  if(state.status!=='active'||tab!=='train')return;
  hold={button,kind,id,x,y,start:Date.now(),token:token()};
  button.classList.add('holding');
  hold.timer=setTimeout(()=>{
   if(!hold||!button.isConnected||hold.token!==token()){cancel();return;}
   button.classList.add('ready');button.textContent='Slip for at afslutte';
  },2000);
 }
 function finish(kind,id){
  const h=hold;
  const allowed=h&&h.kind===kind&&h.id===id&&Date.now()-h.start>=2000&&h.button.isConnected&&
    tab==='train'&&state.status==='active'&&h.token===token()&&!document.hidden;
  cancel();
  if(!allowed)return;
  if(!save()){notice='Træningen kunne ikke sikres lokalt og er derfor ikke afsluttet. Eksportér en sikkerhedskopi.';render();return;}
  if(state.plan.length===1)finishSolo();
  else{const id=activeExerciseId();archiveCurrent(state.step===state.plan.length-1&&completedGame(id,state.results[id])?'complete':'partial');render();}
 }
 document.addEventListener('pointerdown',event=>{
  const button=event.target.closest?.('#hold-finish');
  if(hold){cancel();return;}
  if(!button||event.button!==0||event.isPrimary===false)return;
  begin(button,'pointer',event.pointerId,event.clientX,event.clientY);
  try{button.setPointerCapture?.(event.pointerId);}catch{}
 });
 document.addEventListener('pointermove',event=>{
  if(hold?.kind==='pointer'&&hold.id===event.pointerId&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>12)cancel();
 });
 document.addEventListener('pointerup',event=>finish('pointer',event.pointerId));
 document.addEventListener('pointercancel',cancel);
 document.addEventListener('lostpointercapture',cancel);
 document.addEventListener('keydown',event=>{
  if(!event.target.matches?.('#hold-finish')||![' ','Enter'].includes(event.key))return;
  event.preventDefault();if(!event.repeat)begin(event.target,'key',event.key);
 });
 document.addEventListener('keyup',event=>{if([' ','Enter'].includes(event.key)){if(hold)event.preventDefault();finish('key',event.key);}});
 document.addEventListener('click',event=>{if(event.target.closest?.('#hold-finish'))event.preventDefault();});
 document.addEventListener('contextmenu',event=>{if(event.target.closest?.('#hold-finish'))event.preventDefault();});
 document.addEventListener('visibilitychange',cancel);
 window.addEventListener('blur',cancel);
 window.addEventListener('scroll',cancel,{passive:true});
})();
function renderAdministration(){
 const records=completedSessions().reverse(),trash=historySync.trashEntries();
 return `<h2>Administration</h2><p class="muted">Sletning flytter træningen til papirkurven på dine enheder. Her kan du gendanne den. Begge handlinger kræver internet.</p>
 <h3>Træninger</h3>${records.length?records.map((h,i)=>`<section class="card"><b>${day(h.date)}</b><p>${safeString(h.planName||'Træning')} · ${Object.keys(h.results).map(id=>safeString(EX.find(e=>e[0]===id)?.[1]||id)).join(', ')}</p>${button('Flyt til papirkurv',`adminDelete(${i})`,'small')}</section>`).join(''):'<p>Ingen træninger.</p>'}
 <h3>Papirkurv</h3>${trash.length?trash.map(h=>`<section class="card"><b>${day(h.record.date)}</b><p>${safeString(h.record.planName||'Træning')}</p>${button('Gendan træning',`adminRestore('${h.key}')`,'small')}</section>`).join(''):'<p>Ingen træninger i papirkurven. Listen opdateres ved synkronisering.</p>'}`;
}
let adminBusy=false;
async function adminDelete(index){
 if(tab!=='admin'||adminBusy)return;
 const h=completedSessions().reverse()[index];if(!h)return;
 adminBusy=true;
 try{await deleteSession(h.id||'',h.date,h);}finally{adminBusy=false;}
}
async function adminRestore(key){
 if(tab!=='admin'||adminBusy)return;
 const h=historySync.trashEntries().find(h=>h.key===key);if(!h)return;
 if(!confirm(`Gendanne træningen fra ${day(h.record.date)} på dine enheder?`))return;
 adminBusy=true;
 try{await historySync.restoreRecord(key);notice='Træningen er gendannet.';}
 catch(e){notice='Træningen kunne ikke gendannes. '+e.message;}
 finally{adminBusy=false;render();}
}
