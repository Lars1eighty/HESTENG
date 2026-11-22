import { mergeNames, namesFromPlan, playerKey, readNames, validatePlan } from "./engine.mjs";
import { assets } from "./assets.mjs";

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

function savedNight(db, owner) {
  return db.prepare("SELECT share_id, plan FROM club_nights WHERE owner_id = ?").bind(owner).first();
}

async function saveNames(db, owner, names) {
  const players = Object.fromEntries(names.map(name => [playerKey(name), name]));
  const row = await db.prepare(
    "INSERT INTO club_rosters (owner_id, players) VALUES (?, ?) " +
    "ON CONFLICT(owner_id) DO UPDATE SET players = json_patch(excluded.players, club_rosters.players) " +
    "RETURNING players"
  ).bind(owner, JSON.stringify(players)).first();
  return Object.values(JSON.parse(row.players));
}

async function rosterApi(request, db) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({error: "Log ind for at gemme klubbens spillerliste."}, 401);
  const night = await savedNight(db, owner);
  const previousNames = night ? namesFromPlan(JSON.parse(night.plan)) : [];
  if (request.method === "GET") {
    const row = await db.prepare("SELECT players FROM club_rosters WHERE owner_id = ?").bind(owner).first();
    return json({players: mergeNames(row ? Object.values(JSON.parse(row.players)) : [], previousNames)});
  }
  if (request.method !== "POST") return json({error: "Ukendt handling."}, 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({error: "Åbn appen igen, og prøv at gemme."}, 403);
  }
  const text = await request.text();
  if (text.length > 12_000) return json({error: "Tilføj færre navne ad gangen."}, 413);
  let names;
  try {
    const input = JSON.parse(text);
    if (!Array.isArray(input) || input.some(name => typeof name !== "string" || /[\r\n]/.test(name))) {
      return json({error: "Tilføj ét spillernavn pr. linje."}, 400);
    }
    names = readNames(input.join("\n"));
  } catch (error) {
    return json({error: error instanceof SyntaxError ? "Ugyldig spillerliste." : error.message}, 400);
  }
  if (!names.length) return json({error: "Tilføj mindst ét navn."}, 400);
  const players = await saveNames(db, owner, mergeNames(previousNames, names));
  return json({players: mergeNames(players)});
}

async function clubApi(request, db) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({ error: "Log ind for at gemme klubbens program." }, 401);
  if (request.method === "GET") {
    const row = await savedNight(db, owner);
    return json(row ? { shareId: row.share_id, plan: JSON.parse(row.plan) } : null);
  }
  if (request.method !== "PUT") return json({error: "Ukendt handling."}, 405);
  if (request.headers.get("Origin") !== new URL(request.url).origin) {
    return json({error: "Åbn appen igen, og prøv at gemme."}, 403);
  }
  const text = await request.text();
  if (text.length > 12_000) return json({error: "Spillerlisten fylder for meget."}, 413);
  let plan;
  try {
    plan = validatePlan(JSON.parse(text));
  } catch (error) {
    return json({error: error instanceof SyntaxError ? "Ugyldigt program." : error.message}, 400);
  }
  const previous = await savedNight(db, owner);
  const names = mergeNames(previous ? namesFromPlan(JSON.parse(previous.plan)) : [], namesFromPlan(plan));
  if (names.length) await saveNames(db, owner, names);
  const row = await db.prepare(
    "INSERT INTO club_nights (owner_id, share_id, plan, updated_at) VALUES (?, ?, ?, ?) " +
    "ON CONFLICT(owner_id) DO UPDATE SET plan = excluded.plan, updated_at = excluded.updated_at " +
    "RETURNING share_id"
  ).bind(owner, crypto.randomUUID(), JSON.stringify(plan), new Date().toISOString()).first();
  return json({ shareId: row.share_id, plan });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/club") return clubApi(request, env.DB);
    if (pathname === "/api/roster") return rosterApi(request, env.DB);
    if (pathname.startsWith("/api/program/") && request.method === "GET") {
      const id = pathname.slice("/api/program/".length);
      if (!/^[a-f0-9-]{36}$/.test(id)) return json(null, 404);
      const row = await env.DB.prepare("SELECT plan FROM club_nights WHERE share_id = ?").bind(id).first();
      return row ? json(JSON.parse(row.plan)) : json(null, 404);
    }
    if (request.method !== "GET" && request.method !== "HEAD") return new Response(null, { status: 405 });
    const page = pathname === "/" || /^\/program\/[a-f0-9-]{36}$/.test(pathname);
    const asset = assets[page ? "/index.html" : pathname];
    if (!asset) return new Response("Siden findes ikke.", {status: 404});
    return new Response(asset.body, { headers: {
      "Content-Type": asset.type,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-cache",
    }});
  },
};
