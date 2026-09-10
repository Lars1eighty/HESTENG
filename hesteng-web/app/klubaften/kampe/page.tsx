"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getClubNightMatchHref } from "@/lib/clubNightRoutes";
import { createClubNightMatches } from "@/lib/matchEngine";
import { getNextMatchesByBoard } from "@/lib/liveEngine";
import { normalizeName } from "@/lib/playerIdentity";

const LEG_OPTIONS = [1, 3, 5, 7, 9];
function getStatusLabel(status: "pending" | "live" | "finished") { if (status === "finished") return "FÆRDIG"; if (status === "live") return "I GANG"; return "IKKE STARTET"; }
function getStatusClasses(status: "pending" | "live" | "finished") { if (status === "finished") return "border-green-700 bg-green-500/10 text-green-400"; if (status === "live") return "border-orange-700 bg-orange-500/10 text-orange-400"; return "border-gray-700 bg-gray-800 text-gray-300"; }
function formatEstimatedMinutes(seconds?: number) { if (!seconds || seconds <= 0) return null; return `${Math.max(1, Math.round(seconds / 60))} min`; }
function formatMatchDuration(seconds?: number) { if (!seconds || seconds <= 0) return null; const totalSeconds = Math.round(seconds); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const remainingSeconds = totalSeconds % 60; return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}` : `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`; }
function getTimingSourceLabel(source?: string) { if (source === "hesteng") return "HESTENG"; if (source === "mixed") return "Blandet"; if (source === "dartconnect") return "DartConnect"; return "Global"; }

export default function KampePage() {
  const params = useParams<{ clubNightId?: string }>();
  const routeClubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;
  const { clubs, currentClub } = useClub();
  const { currentClubId, pools, matches, setMatches, currentClubNightId, currentClubNight, setCurrentClubNightId } = useKlubaften();
  const clubNightId = routeClubNightId ?? currentClubNightId;
  const effectiveClub = (currentClubNight?.clubId ? clubs.find((club) => club.id === currentClubNight.clubId) : null) ?? currentClub;
  const isTjoerring = normalizeName(effectiveClub.name).includes(normalizeName("Tjørring"));
  const [bestOfLegs, setBestOfLegs] = useState(isTjoerring ? 1 : 5);

  useEffect(() => { if (routeClubNightId) setCurrentClubNightId(routeClubNightId); }, [routeClubNightId, setCurrentClubNightId]);
  useEffect(() => { if (matches.length === 0) setBestOfLegs(isTjoerring ? 1 : 5); }, [isTjoerring, matches.length]);

  function createMatches() {
    if (pools.length === 0 || !clubNightId || currentClubNight?.status !== "active") return;
    setMatches(createClubNightMatches(pools, currentClubNight.boardCount, clubNightId, currentClubId, bestOfLegs, currentClubNight.handicapBoards, undefined, isTjoerring));
  }

  if (pools.length === 0) return <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto max-w-5xl p-10"><BackButton /><h1 className="mb-8 text-4xl font-bold">🎯 Kampe</h1><div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Opret først puljerne.</div></section></main>;

  if (matches.length === 0) return <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto max-w-3xl p-10"><BackButton /><div className="rounded-3xl border border-gray-800 bg-gray-900 p-8"><div className="text-sm font-black uppercase tracking-[0.2em] text-orange-400">Kampformat</div><h1 className="mt-2 text-3xl font-black">Hvor mange legs?</h1><p className="mt-2 text-gray-400">Vælg format for kampene denne runde. Tjørring starter som standard med 1 leg.</p><div className="mt-6 grid grid-cols-5 gap-2">{LEG_OPTIONS.map((legs) => <button key={legs} type="button" onClick={() => setBestOfLegs(legs)} className={`rounded-xl border px-3 py-4 font-black ${bestOfLegs === legs ? "border-orange-500 bg-orange-500 text-black" : "border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500"}`}>{legs === 1 ? "1 leg" : `Bo${legs}`}</button>)}</div><button type="button" onClick={createMatches} className="mt-6 w-full rounded-xl bg-green-600 py-4 text-lg font-black hover:bg-green-500">Opret kampe · {bestOfLegs === 1 ? "1 leg" : `Best of ${bestOfLegs}`}</button></div></section></main>;

  const boardCount = currentClubNight?.boardCount ?? Math.max(...matches.map((m) => m.board), 1); const boards = Array.from({ length: boardCount }, (_, index) => index + 1); const nextMatches = getNextMatchesByBoard(matches); const finished = matches.filter((m) => m.status === "finished").length; const live = matches.filter((m) => m.status === "live").length; const pending = matches.filter((m) => m.status === "pending").length; const activeBestOf = matches[0]?.bestOfLegs ?? bestOfLegs;

  return <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto max-w-7xl p-10"><BackButton />
    <div className="mb-8 flex items-end justify-between gap-4"><div><h1 className="text-4xl font-bold">🎯 Kampe + baner</h1><p className="mt-2 text-gray-400">Færdige {finished} · I gang {live} · Mangler {pending} · {activeBestOf === 1 ? "1 leg" : `Best of ${activeBestOf}`}</p></div><div className="flex flex-wrap gap-3"><Link href={clubNightId ? `/klubaften/${clubNightId}/puljer` : "/klubaften/puljer"} className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">Se puljer</Link>{clubNightId ? <Link href={`/klubaften/${clubNightId}/gaest`} className="rounded-xl border border-cyan-700 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20">QR / gæsteadgang</Link> : null}<Link href={clubNightId ? `/klubaften/${clubNightId}/live` : "/klubaften/live"} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600">🔴 Live scoring</Link></div></div>
    <div className="mb-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-7">{boards.map((board) => { const next = nextMatches.find((match) => match.board === board); return <div key={board} className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-sm text-gray-500">Bane</div><div className="mt-1 text-2xl font-bold">{board}</div><div className="mt-3 text-sm text-gray-300">{next ? `${next.player1} – ${next.player2}` : "Ledig"}</div>{next && formatEstimatedMinutes(next.estimatedDurationSeconds) && <div className="mt-2 text-xs text-gray-500">Forventet {formatEstimatedMinutes(next.estimatedDurationSeconds)}</div>}{next?.requiresAccessibleBoardForMatch && <div className="mt-2 text-xs font-bold uppercase tracking-wide text-orange-300">Handicapbane</div>}</div>; })}</div>
    <div className="space-y-8">{pools.map((pool) => { const poolMatches = matches.filter((match) => match.pool === pool.name); return <section key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">{pool.name}</h2><span className="text-sm text-gray-500">{poolMatches.length} kampe</span></div><div className="grid gap-3 md:grid-cols-2">{poolMatches.map((match) => <Link key={match.id} href={getClubNightMatchHref(match.id, clubNightId)} className="rounded-xl border border-gray-800 bg-gray-950/40 p-4 transition hover:border-gray-600 hover:bg-gray-800"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm text-gray-400">#{match.order} · {match.pool} · Runde {match.round} · Bane {match.board}</div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(match.status)}`}>{getStatusLabel(match.status)}</span></div>{match.requiresAccessibleBoardForMatch && <div className="mt-3 inline-flex rounded-full border border-orange-700 bg-orange-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-300">Handicapbane</div>}{formatEstimatedMinutes(match.estimatedDurationSeconds) && <div className="mt-3 text-xs text-gray-500">Forventet: {formatEstimatedMinutes(match.estimatedDurationSeconds)} · Kilde: {getTimingSourceLabel(match.timingEstimateSource)} · {match.timingEstimateConfidence ?? "low"}</div>}<div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"><div className="truncate font-semibold">{match.player1}</div><div className="text-gray-600">vs.</div><div className="truncate text-right font-semibold">{match.player2}</div></div>{match.status === "finished" && <div className="mt-4 rounded-xl border border-green-800 bg-green-500/10 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-green-400">{match.winner ?? "Vinder"} vinder</span><span className="text-2xl font-bold tabular-nums text-white">{match.score1} – {match.score2}</span></div>{formatMatchDuration(match.durationSeconds) && <div className="mt-2 text-xs font-semibold text-green-200/80">Varighed: {formatMatchDuration(match.durationSeconds)}</div>}</div>}{match.status === "live" && <div className="mt-4 rounded-xl border border-orange-800 bg-orange-500/10 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-orange-400">Kampen er i gang</span>{(match.score1 > 0 || match.score2 > 0) && <span className="text-xl font-bold tabular-nums">{match.score1} – {match.score2}</span>}</div></div>}</Link>)}</div></section>; })}</div>
  </section></main>;
}
