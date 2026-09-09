"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  getGuestClubNight,
  saveGuestCompletedMatch,
  type GuestClubNightSnapshot,
} from "@/lib/publicClubNightClient";

type GuestPool = { name?: unknown; players?: unknown };
type GuestMatch = {
  id?: unknown; pool?: unknown; round?: unknown; player1?: unknown; player1Id?: unknown;
  player2?: unknown; player2Id?: unknown; board?: unknown; status?: unknown; bestOfLegs?: unknown;
};
type GuestClubNight = { name?: unknown; date?: unknown; pools?: unknown; matches?: unknown };
type CompletedResult = GuestMatch & { winner: string; score1: number; score2: number; status: "finished" };

function asClubNight(value: unknown): GuestClubNight {
  return value !== null && typeof value === "object" ? (value as GuestClubNight) : {};
}
function getPools(clubNight: GuestClubNight): GuestPool[] {
  return Array.isArray(clubNight.pools) ? clubNight.pools.filter((p): p is GuestPool => p !== null && typeof p === "object") : [];
}
function getMatches(clubNight: GuestClubNight): GuestMatch[] {
  return Array.isArray(clubNight.matches) ? clubNight.matches.filter((m): m is GuestMatch => m !== null && typeof m === "object") : [];
}
function text(value: unknown, fallback = "-") { return typeof value === "string" && value.trim() ? value : fallback; }
function completedResults(values: unknown[]): CompletedResult[] {
  return values.filter((value): value is CompletedResult => value !== null && typeof value === "object" && typeof (value as { id?: unknown }).id === "string");
}

export default function GuestClubNightPage() {
  const params = useParams<{ token: string }>();
  const publicToken = params?.token ?? "";
  const [snapshot, setSnapshot] = useState<GuestClubNightSnapshot | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!publicToken) return;
    let cancelled = false;
    async function load() {
      try {
        const next = await getGuestClubNight(publicToken);
        if (!cancelled) { setSnapshot(next); setError(""); }
      } catch { if (!cancelled) setError("Klubaftenen kunne ikke hentes eller er afsluttet."); }
    }
    void load();
    const interval = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [publicToken]);

  const clubNight = useMemo(() => asClubNight(snapshot?.clubNight), [snapshot]);
  const pools = useMemo(() => getPools(clubNight), [clubNight]);
  const matches = useMemo(() => getMatches(clubNight), [clubNight]);
  const results = useMemo(() => completedResults(snapshot?.completedMatches ?? []), [snapshot]);
  const resultById = useMemo(() => new Map(results.map((result) => [text(result.id), result])), [results]);

  async function registerWinner(match: GuestMatch, winner: 1 | 2) {
    if (!snapshot || typeof match.id !== "string") return;
    const player1 = text(match.player1);
    const player2 = text(match.player2);
    const bestOfLegs = typeof match.bestOfLegs === "number" ? match.bestOfLegs : 1;
    const legsToWin = Math.floor(bestOfLegs / 2) + 1;
    const completed: CompletedResult = {
      ...match,
      id: match.id,
      player1,
      player2,
      winner: winner === 1 ? player1 : player2,
      score1: winner === 1 ? legsToWin : 0,
      score2: winner === 2 ? legsToWin : 0,
      status: "finished",
    };
    setSavingId(match.id);
    try {
      const saved = await saveGuestCompletedMatch(publicToken, completed);
      setSnapshot({ ...snapshot, completedMatches: saved.completedMatches });
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kampresultatet kunne ikke gemmes.");
    } finally { setSavingId(null); }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-8"><div className="text-3xl font-black text-orange-500">HESTENG</div><div className="mt-1 text-sm font-semibold text-gray-400">Gæsteadgang · aktiv klubaften</div></div>
        {error && <div className="mb-5 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-200">{error}</div>}
        {!snapshot ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-400">Henter klubaften...</div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6"><div className="text-sm font-bold uppercase tracking-wide text-orange-400">Aktiv</div><h1 className="mt-2 text-3xl font-black">{text(clubNight.name, "Klubaften")}</h1><p className="mt-2 text-gray-400">{text(clubNight.date)}</p></div>
            <section className="mb-10"><h2 className="mb-4 text-2xl font-bold">Puljer</h2><div className="grid gap-4 md:grid-cols-2">{pools.map((pool, index) => {
              const players = Array.isArray(pool.players) ? pool.players.filter((p): p is string => typeof p === "string") : [];
              return <div key={`${text(pool.name, "Pulje")}-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900 p-5"><h3 className="text-xl font-bold">{text(pool.name, `Pulje ${index + 1}`)}</h3><div className="mt-3 space-y-2">{players.map((player) => <div key={player} className="rounded-lg bg-gray-950 px-3 py-2 font-semibold text-gray-200">{player}</div>)}</div></div>;
            })}</div></section>
            <section><div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-bold">Kampe</h2><span className="text-sm font-semibold text-gray-400">{results.length} færdige</span></div><div className="space-y-3">{matches.map((match, index) => {
              const id = text(match.id, `match-${index + 1}`); const result = resultById.get(id); const saving = savingId === id;
              return <div key={id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-sm font-semibold text-gray-500">{text(match.pool, "Pulje")} · Runde {typeof match.round === "number" ? match.round : "-"} · Bane {typeof match.board === "number" ? match.board : "-"}</div><div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button disabled={!!result || saving} onClick={() => void registerWinner(match, 1)} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-4 text-left font-black disabled:opacity-50"><span className="block text-xs uppercase text-gray-500">{result ? (result.winner === match.player1 ? "Vinder" : "Spiller 1") : "Tryk på vinder"}</span>{text(match.player1)}</button>
                <button disabled={!!result || saving} onClick={() => void registerWinner(match, 2)} className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-4 text-left font-black disabled:opacity-50"><span className="block text-xs uppercase text-gray-500">{result ? (result.winner === match.player2 ? "Vinder" : "Spiller 2") : "Tryk på vinder"}</span>{text(match.player2)}</button>
              </div>{result && <div className="mt-3 text-sm font-bold text-green-300">Færdig · {result.score1}-{result.score2} · {result.winner}</div>}{saving && <div className="mt-3 text-sm font-bold text-orange-300">Gemmer...</div>}</div>;
            })}</div></section>
          </>
        )}
      </section>
    </main>
  );
}
