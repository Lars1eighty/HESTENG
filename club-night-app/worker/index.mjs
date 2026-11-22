import { validatePlan } from "./engine.mjs";
import { assets } from "./assets.mjs";

function json(value, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function clubApi(request, db) {
  const owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({ error: "Log ind for at gemme klubbens program." }, 401);
  if (request.method === "GET") {
    const row = await db.prepare(
      "SELECT share_id, plan FROM club_nights WHERE owner_id = ?"
    ).bind(owner).first();
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
