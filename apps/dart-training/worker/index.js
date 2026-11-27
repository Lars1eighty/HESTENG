const syncPath = '/api/history';
const maxBodyBytes = 2_000_000;
const batchSize = 20;
const pageSize = 50;
const keyPattern = /^[a-f0-9]{64}$/;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

function validRecord(record) {
  return record && typeof record.date === 'string' && Number.isFinite(Date.parse(record.date)) &&
    record.results && typeof record.results === 'object' && !Array.isArray(record.results);
}

async function pull(request, db, owner) {
  const cursor = new URL(request.url).searchParams.get('after') ?? '0';
  const after = Number(cursor);
  if (!/^\d+$/.test(cursor) || !Number.isSafeInteger(after)) return json({ error: 'invalid_cursor' }, 400);

  const { results } = await db.prepare(
    'SELECT seq, record_key, payload FROM training_history WHERE owner = ? AND seq > ? ORDER BY seq LIMIT ?',
  ).bind(owner, after, pageSize + 1).all();
  const rows = results.slice(0, pageSize);
  return json({
    cursor: rows.at(-1)?.seq ?? after,
    more: results.length > pageSize,
    changes: rows.map(({ seq, record_key, payload }) => {
      const value = payload === null ? null : JSON.parse(payload);
      const deleted = value?.deleted === true;
      return {key: record_key, revision: seq, record: deleted ? null : value,
        trash: deleted ? {record: value.record, deletedAt: value.deletedAt} : null};
    }),
  });
}

async function push(request, db, owner) {
  // Same-origin requests set this header. Browser cross-origin requests cannot send it without CORS.
  if (request.headers.get('x-dart-training-sync') !== '1') return json({ error: 'invalid_request' }, 403);
  const body = await request.text();
  if (new TextEncoder().encode(body).length > maxBodyBytes) return json({ error: 'too_large' }, 413);
  let changes;
  try {
    changes = JSON.parse(body);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  if (!Array.isArray(changes) || !changes.length || changes.length > batchSize ||
      !changes.every(change => change && typeof change.key === 'string' && keyPattern.test(change.key) &&
        validRecord(change.record))) {
    return json({ error: 'invalid_history' }, 400);
  }

  const insert = db.prepare(
    'INSERT INTO training_history (owner, record_key, payload) VALUES (?, ?, ?) ON CONFLICT (owner, record_key) DO NOTHING',
  );
  await db.batch(changes.map(({ key, record }) => insert.bind(owner, key, JSON.stringify(record))));
  return json({ ok: true });
}

// Soft deletion and restoration are explicit, version-checked operations. Ordinary uploads
// remain insert-only, so neither an old backup nor an old device can resurrect a tombstone.
async function historyAction(request, db, owner) {
  if(request.headers.get('x-dart-training-sync') !== '1')return json({error:'invalid_request'},403);
  const body=await request.text();
  if(body.length>4096)return json({error:'too_large'},413);
  let input;try{input=JSON.parse(body);}catch{return json({error:'invalid_json'},400);}
  if(!input||!keyPattern.test(input.key)||!['delete','restore'].includes(input.action)||
    !Number.isSafeInteger(input.revision)||input.revision<1)return json({error:'invalid_action'},400);
  const {results}=await db.prepare('SELECT seq, payload FROM training_history WHERE owner = ? AND record_key = ?').bind(owner,input.key).all();
  const row=results[0];
  if(!row||row.seq!==input.revision)return json({error:'history_changed'},409);
  const value=row.payload===null?null:JSON.parse(row.payload);
  let payload;
  if(input.action==='delete'){
    if(!validRecord(value)||value.deleted)return json({error:'history_changed'},409);
    payload=JSON.stringify({deleted:true,deletedAt:new Date().toISOString(),record:value});
  }else{
    if(value?.deleted!==true||!validRecord(value.record))return json({error:'not_recoverable'},409);
    payload=JSON.stringify(value.record);
  }
  const update=db.prepare(`INSERT INTO training_history (owner,record_key,payload) VALUES (?,?,?)
    ON CONFLICT(owner,record_key) DO UPDATE SET payload=excluded.payload,seq=excluded.seq
    WHERE training_history.seq=?`);
  const outcome=await db.batch([update.bind(owner,input.key,payload,input.revision)]);
  if(outcome[0]?.meta?.changes!==1)return json({error:'history_changed'},409);
  return json({ok:true});
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === syncPath || pathname === syncPath+'/action') {
      const owner = request.headers.get('oai-authenticated-user-id');
      if (!owner) return json({ error: 'sign_in_required' }, 401);
      try {
        if(pathname.endsWith('/action'))return request.method==='POST'?await historyAction(request,env.DB,owner):json({error:'method_not_allowed'},405);
        if (request.method === 'GET') return await pull(request, env.DB, owner);
        if (request.method === 'POST') return await push(request, env.DB, owner);
        return json({ error: 'method_not_allowed' }, 405);
      } catch (error) {
        console.error('DART Training history storage:', error.message);
        return json({ error: 'storage_unavailable' }, 503);
      }
    }

    const asset = Object.hasOwn(ASSETS, pathname) && ASSETS[pathname];
    if (!asset || !['GET', 'HEAD'].includes(request.method)) return new Response('Siden findes ikke.', { status: 404 });
    const body = request.method === 'HEAD' ? null
      : asset.binary ? Uint8Array.from(atob(asset.body), char => char.charCodeAt(0)) : asset.body;
    return new Response(body, {
      headers: {
        'Content-Type': asset.type,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
