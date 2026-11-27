const historySync = (() => {
  const api = '/api/history';
  const batchSize = 20;
  const maxBodyBytes = 2_000_000;
  const encoder = new TextEncoder();
  const recordKeys = new WeakMap();
  const remote = new Map();
  const revisions = new Map();
  const trash = new Map();
  let cursor = 0;
  let timer;
  let running = false;
  let changedWhileRunning = false;
  let started = false;
  let failures = 0;

  function status(message) {
    const label = document.getElementById('sync-status');
    if (label) label.textContent = message;
  }

  function keyFor(record) {
    if (!recordKeys.has(record)) {
      const fingerprint = JSON.stringify([Date.parse(record.date), archiveResultKey(record)]);
      const digest = crypto.subtle.digest('SHA-256', encoder.encode(fingerprint)).then(bytes =>
        Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join(''));
      recordKeys.set(record, digest);
    }
    return recordKeys.get(record);
  }

  function queue(delay = 400) {
    if (!started) return;
    if (running) {
      changedWhileRunning = true;
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(sync, delay);
  }

  function changed() {
    status(navigator.onLine ? 'Historik afventer synkronisering' : 'Offline · historik afventer');
    queue();
  }

  async function request(url, options) {
    const response = await fetch(url, {
      ...options,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('History sync returned ' + response.status);
    return response.json();
  }

  async function pull() {
    let page;
    do {
      page = await request(api + '?after=' + cursor);
      for (const change of page.changes) {
        remote.set(change.key,change.record);
        revisions.set(change.key,change.revision);
        if(change.trash)trash.set(change.key,{key:change.key,...change.trash});
        else trash.delete(change.key);
      }
      cursor = page.cursor;
    } while (page.more);
  }

  async function push(changes) {
    let batch = [];
    let bytes = 2;
    async function sendBatch() {
      if (!batch.length) return;
      await request(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-DART-Training-Sync': '1' },
        body: '[' + batch.join(',') + ']',
      });
      batch = [];
      bytes = 2;
    }
    for (const change of changes) {
      const entry = JSON.stringify(change);
      const entryBytes = encoder.encode(entry).length + 1;
      if (entryBytes + 2 > maxBodyBytes) throw new Error('Training record is too large');
      if (batch.length === batchSize || bytes + entryBytes > maxBodyBytes) await sendBatch();
      batch.push(entry);
      bytes += entryBytes;
    }
    await sendBatch();
  }

  async function localRecords(snapshot) {
    return Promise.all(snapshot.history.map(async record => ({ key: await keyFor(record), record })));
  }

  async function upload() {
    if (historyStorageBlocked || !storageOk) throw new Error('Local history is not safely stored');
    // Previous app versions could queue destructive, unversioned deletions. Cancel these
    // rather than applying them to a possibly restored or changed server record.
    const legacy = Array.isArray(state.syncDeleted) ? state.syncDeleted : [];
    if(legacy.length){
      const next={...state,syncDeleted:[]};
      if(!save(next,[],legacy))throw new Error('Browser storage unavailable');
      state=next;
      notice='En tidligere afventende sletning er annulleret. Brug Administration, hvis den stadig ønskes.';
    }
    const records = await localRecords(state);
    const changes = records.filter(({key})=>!remote.has(key));
    if (changes.length) {
      await push(changes);
      await pull();
    }
  }

  async function reconcile() {
    const originalHistory = state.history.slice();
    const entries = await localRecords({ history: originalHistory });
    if (originalHistory.length !== state.history.length || originalHistory.some((record, i) => record !== state.history[i])) {
      changedWhileRunning = true;
      return;
    }
    const pendingDeletes = Array.isArray(state.syncDeleted) ? state.syncDeleted : [];
    const deleted = new Set(pendingDeletes);
    const seen = new Set();
    const history = [];
    for (const { key, record } of entries) {
      if (remote.get(key) === null || deleted.has(key) || seen.has(key)) continue;
      seen.add(key);
      const saved = remote.get(key);
      history.push(saved && JSON.stringify(saved) !== JSON.stringify(record) ? saved : record);
      if (!saved) changedWhileRunning = true;
    }
    for (const [key, record] of remote) {
      if (!record || deleted.has(key) || seen.has(key) || !validResults(record.results)) continue;
      history.push(record);
    }
    const syncDeleted = pendingDeletes.filter(key => remote.get(key) !== null);
    if (syncDeleted.length) changedWhileRunning = true;
    history.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    if (syncDeleted.length === pendingDeletes.length && history.length === originalHistory.length &&
        history.every((record, i) => record === originalHistory[i])) return;

    const next = { ...state, history, syncDeleted };
    const removedRecords = originalHistory.filter(record => !history.includes(record));
    const stored = save(next, removedRecords, pendingDeletes.filter(key => remote.get(key) === null));
    state = next;
    journalIndex = null;
    if (!quickMode && (tab === 'admin' || tab === 'history' || (tab === 'stats' && statsView !== 'share'))) render();
    if (!stored) throw new Error('Browser storage unavailable');
  }

  async function sync() {
    if(running)return;
    if (!navigator.onLine) {
      status('Offline · historik afventer');
      return;
    }
    running = true;
    changedWhileRunning = false;
    status('Synkroniserer historik …');
    try {
      await pull();
      await upload();
      await reconcile();
      failures = 0;
      if (changedWhileRunning) status('Historik afventer synkronisering');
      else status('Historik synkroniseret');
    } catch (error) {
      failures++;
      status(navigator.onLine ? 'Synkronisering afventer · prøver igen' : 'Offline · historik afventer');
      console.warn('DART Training sync:', error.message);
    } finally {
      running = false;
      if (failures) queue(Math.min(1000 * 2 ** Math.min(failures, 6), 60000));
      else queue(changedWhileRunning ? 200 : 30000);
    }
  }

  function start() {
    started = true;
    window.addEventListener('online', () => queue(0));
    window.addEventListener('offline', () => status('Offline · historik afventer'));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) queue(0);
    });
    queue(0);
  }

  async function action(key,kind) {
    if(!navigator.onLine)throw new Error('Sletning og gendannelse kræver internet.');
    if(running)throw new Error('Vent på synkroniseringen, og prøv igen.');
    if(historyStorageBlocked||!storageOk||!save())throw new Error('Data kunne ikke sikres lokalt. Handlingen er afbrudt.');
    running=true;
    try{
      await pull();
      await upload();
      const revision=revisions.get(key);
      if(!revision)throw new Error('Træningen er ikke synkroniseret endnu. Prøv igen.');
      await request(api+'/action',{method:'POST',headers:{'Content-Type':'application/json','X-DART-Training-Sync':'1'},body:JSON.stringify({key,action:kind,revision})});
      await pull();
      await reconcile();
      status('Historik synkroniseret');
    }finally{running=false;queue(0);}
  }
  async function deleteRecord(record){return action(await keyFor(record),'delete');}
  async function restoreRecord(key){return action(key,'restore');}
  function trashEntries(){return [...trash.values()].sort((a,b)=>String(b.deletedAt).localeCompare(String(a.deletedAt)));}
  return { start, changed, keyFor, deleteRecord, restoreRecord, trashEntries };

})();
