"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import GuestMatchScorer from "@/components/GuestMatchScorer";
import { getGuestClubNight, saveGuestCompletedMatch, type GuestClubNightSnapshot } from "@/lib/publicClubNightClient";

type GuestPool = { name?: unknown; players?: unknown };
type GuestMatch = { id?: unknown; pool?: unknown; round?: unknown; player1?: unknown; player1Id?: unknown; player2?: unknown; player2Id?: unknown; board?: unknown; status?: unknown; bestOfLegs?: unknown };
type GuestClubNight = { name?: unknown; date?: unknown; pools?: unknown; matches?: unknown };
type ResultPlayerStats = { name?: unknown; average?: unknown; hundredPlus?: unknown; oneFortyPlus?: unknown; oneEighties?: unknown; checkoutPercent?: unknown; highestCheckout?: unknown; fastestLegDarts?: unknown };
type CompletedResult = GuestMatch & { winner: string; score1: number; score2: number; status: "finished"; players?: unknown };

function asClubNight(value: unknown): GuestClubNight { return value !== null && typeof value === "object" ? value as GuestClubNight : {}; }
function getPools(clubNight: GuestClubNight): GuestPool[] { return Array.isArray(clubNight.pools) ? clubNight.pools.filter((p): p is GuestPool => p !== null && typeof p === "object") : []; }
function getMatches(clubNight: GuestClubNight): GuestMatch[] { return Array.isArray(clubNight.matches) ? clubNight.matches.filter((m): m is GuestMatch => m !== null && typeof m === "object") : []; }
function text(value: unknown, fallback = "-") { return typeof value === "string" && value.trim() ? value : fallback; }
function completedResults(values: unknown[]): CompletedResult[] { return values.filter((value): value is CompletedResult => value !== null && typeof value === "object" && typeof (value as { id?: unknown }).id === "string"); }
function resultStats(result: CompletedResult): ResultPlayerStats[] { return Array.isArray(result.players) ? result.players.filter((value): value is ResultPlayerStats => value !== null && typeof value === "object") : []; }

export default function GuestClubNightPage() {
  const params = useParams<{ token: string }>();
  const publicToken = params?.token ?? "";
  const [snapshot, setSnapshot] = useState<GuestClubNightSnapshot | null>(null);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [poolFilter, setPoolFilter] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!publicToken) return;
    let cancelled = false;
    async function load() {
      try {
        const next = await getGuestClubNight(publicToken);
        if (!cancelled) { setSnapshot(next); setError(""); }
      } catch {
        if (!cancelled) setError("Klubaftenen kunne ikke hentes eller er afsluttet.");
      }
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
  const activeMatchIds = useMemo(() => new Set(matches.map((match) => text(match.id))), [matches]);
  const historicalResults = useMemo(() => results.filter((result) => !activeMatchIds.has(text(result.id))), [results, activeMatchIds]);
  const visibleMatches = useMemo(() => poolFilter ? matches.filter((match) => text(match.pool, "") === poolFilter) : matches, [matches, poolFilter]);
  const visibleHistoricalResults = useMemo(() => poolFilter ? historicalResults.filter((match) => text(match.pool, "") === poolFilter) : historicalResults, [historicalResults, poolFilter]);
  const unfinishedVisible = visibleMatches.filter((match) => !resultById.has(text(match.id))).length;
  const selectedMatch = useMemo(() => matches.find((match) => text(match.id) === selectedMatchId) ?? null, [matches, selectedMatchId]);

  async function saveScoredMatch(completed: unknown) {
    if (!snapshot || !selectedMatchId) return;
    setSavingId(selectedMatchId);
    try {
      const saved = await saveGuestCompletedMatch(publicToken, completed);
      setSnapshot({ ...snapshot, completedMatches: saved.completedMatches });
      setSelectedMatchId(null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kampresultatet kunne ikke gemmes.");
      throw cause;
    } finally {
      setSavingId(null);
    }
  }

  function statsLine(result: CompletedResult) {
    const stats = resultStats(result);
    if (!stats.length) return null;
    return <div className="mt-3 grid gap-2 sm:grid-cols-2">{stats.map((player, index) => <div key={`${text(player.name, `spiller-${index}`)}-${index}`} className="rounded-xl bg-gray-950/70 px-3 py-2 text-xs text-gray-400"><div className="font-black text-gray-200">{text(player.name)}</div><div className="mt-1">Avg {typeof player.average === "number" ? player.average.toFixed(1) : "-"} · 100+ {typeof player.hundredPlus === "number" ? player.hundredPlus : "-"} · 140+ {typeof player.oneFortyPlus === "number" ? player.oneFortyPlus : "-"} · 180 {typeof player.oneEighties === "number" ? player.oneEighties : "-"} · CO {typeof player.checkoutPercent === "number" ? `${player.checkoutPercent}%` : "-"}{typeof player.highestCheckout === "number" ? ` · HC ${player.highestCheckout}` : ""}{typeof player.fastestLegDarts === "number" ? ` · ${player.fastestLegDarts} pile` : ""}</div></div>)}</div>;
  }

  function resultCard(result: CompletedResult) {
    const id = text(result.id);
    return <div key={id} className="rounded-2xl border border-green-900 bg-green-950/20 p-4"><div className="text-sm font-semibold text-gray-500">{text(result.pool, "Pulje")} · Runde {typeof result.round === "number" ? result.round : "-"}</div><div className="mt-3 flex items-center justify-between gap-4"><span className="font-bold">{text(result.player1)} – {text(result.player2)}</span><span className="font-black tabular-nums">{result.score1}-{result.score2}</span></div><div className="mt-2 text-sm font-bold text-green-300">{result.winner} vandt</div>{statsLine(result)}</div>;
  }

  return <main className="min-h-screen bg-gray-950 text-white"><section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
    <div className="mb-8"><div className="text-3xl font-black text-orange-500">HESTENG</div><div className="mt-1 text-sm font-semibold text-gray-400">Gæsteadgang · aktiv klubaften</div></div>
    {error && <div className="mb-5 rounded-2xl border border-red-900 bg-red-950/40 p-4 text-red-200">{error}</div>}
    {!snapshot ? <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-400">Henter klubaften...</div> : <>
      <div className="mb-6 rounded-2xl border border-gray-800 bg-gray-900 p-6"><div className="text-sm font-bold uppercase tracking-wide text-orange-400">Aktiv</div><h1 className="mt-2 text-3xl font-black">{text(clubNight.name, "Klubaften")}</h1><p className="mt-2 text-gray-400">{text(clubNight.date)}</p></div>

      <section className="mb-8 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
        <div className="text-xs font-black uppercase tracking-widest text-cyan-300">Vælg pulje</div>
        <select value={poolFilter} onChange={(event) => { setPoolFilter(event.target.value); setSelectedMatchId(null); }} className="mt-3 w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-4 text-lg font-black outline-none focus:border-cyan-500">
          <option value="">Alle puljer</option>
          {pools.map((pool, index) => { const poolName = text(pool.name, `Pulje ${index + 1}`); return <option key={`${poolName}-${index}`} value={poolName}>{poolName}</option>; })}
        </select>
        {poolFilter && <div className="mt-3 flex items-center justify-between text-sm"><span className="font-bold text-white">{poolFilter}</span><span className="text-gray-400">{unfinishedVisible} kampe mangler</span></div>}
      </section>

      {selectedMatch && !resultById.has(text(selectedMatch.id)) && <section className="mb-8"><GuestMatchScorer matchId={text(selectedMatch.id)} player1={text(selectedMatch.player1)} player1Id={typeof selectedMatch.player1Id === "string" ? selectedMatch.player1Id : undefined} player2={text(selectedMatch.player2)} player2Id={typeof selectedMatch.player2Id === "string" ? selectedMatch.player2Id : undefined} bestOfLegs={typeof selectedMatch.bestOfLegs === "number" ? selectedMatch.bestOfLegs : 1} disabled={savingId === selectedMatchId} onComplete={saveScoredMatch} onCancel={() => setSelectedMatchId(null)} /></section>}

      {!poolFilter && <section className="mb-10"><h2 className="mb-4 text-2xl font-bold">Puljer</h2><div className="grid gap-4 md:grid-cols-2">{pools.map((pool, index) => { const poolName = text(pool.name, `Pulje ${index + 1}`); const poolPlayers = Array.isArray(pool.players) ? pool.players.filter((p): p is string => typeof p === "string") : []; return <button type="button" key={`${poolName}-${index}`} onClick={() => { setPoolFilter(poolName); setSelectedMatchId(null); }} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left hover:border-cyan-500/60"><h3 className="text-xl font-bold">{poolName}</h3><div className="mt-3 space-y-2">{poolPlayers.map((player) => <div key={player} className="rounded-lg bg-gray-950 px-3 py-3 font-semibold text-gray-200">{player}</div>)}</div><div className="mt-4 text-sm font-black text-cyan-300">Vis kampe →</div></button>; })}</div></section>}

      <section>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-bold">{poolFilter ? `${poolFilter} · kampe` : "Kampe"}</h2><span className="text-sm font-semibold text-gray-400">{results.length} færdige i alt</span></div>
        {poolFilter && <button type="button" onClick={() => { setPoolFilter(""); setSelectedMatchId(null); }} className="mb-4 rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300">Vis alle puljer</button>}
        <div className="space-y-3">{visibleMatches.map((match, index) => { const id = text(match.id, `match-${index + 1}`); const result = resultById.get(id); const saving = savingId === id; const selected = selectedMatchId === id; return <div key={id} className={`rounded-2xl border p-4 ${result ? "border-green-900 bg-green-950/20" : selected ? "border-orange-500 bg-orange-500/5" : "border-gray-800 bg-gray-900"}`}><div className="text-sm font-semibold text-gray-500">{text(match.pool, "Pulje")} · Runde {typeof match.round === "number" ? match.round : "-"} · Bane {typeof match.board === "number" ? match.board : "-"}</div><div className="mt-3 flex items-center justify-between gap-4"><span className="font-black">{text(match.player1)} – {text(match.player2)}</span>{result && <span className="font-black tabular-nums">{result.score1}-{result.score2}</span>}</div>{!result && <button type="button" disabled={saving} onClick={() => setSelectedMatchId(selected ? null : id)} className="mt-4 w-full rounded-xl bg-orange-500 px-4 py-4 font-black text-black disabled:opacity-50">{selected ? "Scoreboard åbent" : "Åbn scoreboard"}</button>}{result && <><div className="mt-3 text-sm font-bold text-green-300">Færdig · {result.score1}-{result.score2} · {result.winner}</div>{statsLine(result)}</>}{saving && <div className="mt-3 text-sm font-bold text-orange-300">Gemmer...</div>}</div>; })}</div>
      </section>

      {visibleHistoricalResults.length > 0 && <section className="mt-10"><h2 className="mb-4 text-xl font-bold text-gray-300">Tidligere runder</h2><div className="space-y-3">{visibleHistoricalResults.map(resultCard)}</div></section>}
    </>}
  </section></main>;
}
