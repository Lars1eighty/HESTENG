"use client";

import { use, useEffect, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculateEveningStats } from "@/lib/eveningStatsEngine";
import { getCompletedMatchesForClubNightInClub } from "@/lib/matchStore";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { calculateClubNightEloDeltasInClub, getPlayerElo } from "@/lib/eloRatingEngine";
import { getClubNightMatchHref } from "@/lib/clubNightRoutes";

const REFRESH_INTERVAL_MS = 7000;
type HighlightCard = { title: string; value: string | number; hint: string };

export default function ClubNightDashboardPage({ params }: { params: Promise<{ clubNightId: string }> }) {
  const { clubNightId } = use(params);
  const { currentClubId, clubNights, setCurrentClubNightId } = useKlubaften();
  const [, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("-");
  const clubNight = clubNights.find((item) => item.id === clubNightId);

  useEffect(() => {
    setCurrentClubNightId(clubNightId);
  }, [clubNightId, setCurrentClubNightId]);

  useEffect(() => {
    if (clubNight?.status !== "active") return;

    function updateClock() {
      setLastUpdated(new Intl.DateTimeFormat("da-DK", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date()));
      setRefreshTick((tick) => tick + 1);
    }

    updateClock();
    const interval = window.setInterval(updateClock, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [clubNight?.status]);

  if (!clubNight) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Klubaftenen blev ikke fundet.
          </div>
        </section>
      </main>
    );
  }

  const isActive = clubNight.status === "active";
  const matches = clubNight.matches;
  const finished = matches.filter((match) => match.status === "finished").length;
  const live = isActive ? matches.filter((match) => match.status === "live").length : 0;
  const open = isActive
    ? matches.filter((match) => match.status === "pending").length
    : matches.filter((match) => match.status !== "finished").length;
  const total = matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
  const matchIds = matches.map((match) => match.id);
  const completedMatches = getCompletedMatchesForClubNightInClub(currentClubId, clubNight.id, matchIds);
  const eveningStats = calculateEveningStats(completedMatches);
  const eveningEloDeltas = calculateClubNightEloDeltasInClub(currentClubId, clubNight.id, matchIds);
  const liveMatches = isActive ? matches.filter((match) => match.status === "live").sort((a, b) => a.board - b.board) : [];
  const latestResults = matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => (b.completedAt ?? b.finishedAt ?? "").localeCompare(a.completedAt ?? a.finishedAt ?? ""))
    .slice(0, 6);
  const mostOneEighties =
    eveningStats.players
      .filter((player) => player.oneEighties > 0)
      .sort((a, b) => b.oneEighties - a.oneEighties || a.player.localeCompare(b.player))[0] ?? null;
  const lastUpdatedLabel = clubNight.status === "active" ? lastUpdated : "Read-only";
  const eloRows = [...clubNight.selectedPlayers]
    .map((player) => ({
      player,
      elo: getPlayerElo(player, currentClubId).elo,
      delta: eveningEloDeltas.get(player) ?? 0,
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.elo - a.elo || a.player.localeCompare(b.player))
    .slice(0, 8);
  const highlightCandidates: Array<HighlightCard | null> = [
    eveningStats.bestAverage ? { title: "Bedste snit", value: eveningStats.bestAverage.average.toFixed(2), hint: eveningStats.bestAverage.player } : null,
    mostOneEighties ? { title: "180'ere", value: mostOneEighties.oneEighties, hint: mostOneEighties.player } : null,
    eveningStats.bestCheckoutPercent ? { title: "Lukke %", value: `${eveningStats.bestCheckoutPercent.checkoutPercent}%`, hint: eveningStats.bestCheckoutPercent.player } : null,
    eveningStats.fastestLeg?.fastestLegDarts ? { title: "Hurtigste leg", value: eveningStats.fastestLeg.fastestLegDarts, hint: eveningStats.fastestLeg.player } : null,
  ];
  const highlightCards = highlightCandidates.filter((card): card is HighlightCard => card !== null);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1920px] flex-col gap-3 p-3 lg:p-4 xl:h-[calc(100vh-72px)] xl:overflow-hidden">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/90 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">{isActive ? "Klubaften live" : "Arkiv"}</div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="truncate text-2xl font-black tracking-normal xl:text-4xl">{clubNight.name}</h1>
                <span className="text-sm font-bold text-gray-400 xl:text-lg">{clubNight.date} · {clubNight.selectedPlayers.length} spillere</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-sm font-bold">
              <TopPill label="Færdige" value={`${finished}/${total}`} tone="green" />
              <TopPill label="I gang" value={live} tone="orange" />
              <TopPill label="Mangler" value={open} tone="gray" />
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-wider text-orange-300">{isActive ? "Auto" : "Status"}</div>
                <div className="tabular-nums text-orange-100">{lastUpdatedLabel}</div>
              </div>
              <Link href={`/klubaften/${clubNight.id}/kampe`} className="rounded-full border border-orange-500/70 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/20">
                KAMPE
              </Link>
              <Link href={`/klubaften/${clubNight.id}/afslut`} className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-400 transition hover:border-orange-500/70 hover:text-orange-300">
                Administration
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-2xl border border-orange-500/25 bg-gray-900 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black uppercase tracking-wide text-orange-300 xl:text-2xl">Aktive kampe</h2>
            <div className="text-xs font-bold text-gray-500">{isActive ? `Opdaterer hvert ${REFRESH_INTERVAL_MS / 1000}. sekund` : "Read-only"}</div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {liveMatches.length ? liveMatches.slice(0, 8).map((match) => (
              <Link key={match.id} href={getClubNightMatchHref(match.id, clubNight.id)} className="rounded-xl border border-orange-500/30 bg-gray-950 px-4 py-3 transition hover:border-orange-500">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-black uppercase tracking-wider text-orange-300">Bane {match.board}</div>
                  <div className="text-xs font-bold text-gray-500">{match.pool} · R{match.round}</div>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="truncate text-lg font-black xl:text-xl">{match.player1}</div>
                  <div className="rounded-lg bg-orange-500 px-3 py-1 text-xl font-black tabular-nums text-black xl:text-2xl">{match.score1} - {match.score2}</div>
                  <div className="truncate text-right text-lg font-black xl:text-xl">{match.player2}</div>
                </div>
              </Link>
            )) : (
              <div className="rounded-xl bg-gray-950 px-4 py-5 text-center text-lg font-bold text-gray-400 md:col-span-2 xl:col-span-4">
                {isActive
                  ? total > 0 && finished === total ? "Alle kampe er færdigspillet." : "Ingen aktive kampe lige nu."
                  : "Arkiveret klubaften åbnes som read-only historik."}
              </div>
            )}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-h-0 rounded-2xl border border-gray-800 bg-gray-900 p-3 xl:overflow-hidden">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-wide xl:text-2xl">Puljestillinger</h2>
              <span className="text-sm font-bold text-gray-500">{progress}% færdig · {clubNight.pools.length} puljer</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {clubNight.pools.map((pool) => {
                const poolMatches = matches.filter((match) => match.pool === pool.name);
                const poolFinished = poolMatches.filter((match) => match.status === "finished").length;
                const standings = calculatePoolStandings(pool.name, pool.players, matches);
                return (
                  <div key={pool.name} className="rounded-xl border border-gray-800 bg-gray-950 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xl font-black text-orange-300">{pool.name}</div>
                      <div className="text-xs font-bold text-gray-500">{poolFinished}/{poolMatches.length} kampe</div>
                    </div>
                    <div className="space-y-1">
                      {standings.map((standing, index) => (
                        <div key={standing.player} className="grid grid-cols-[22px_minmax(0,1fr)_28px_34px_36px] items-center gap-1 text-[11px] leading-tight xl:text-xs">
                          <div className="font-black text-gray-500">{index + 1}</div>
                          <div className="truncate font-bold text-gray-100">{standing.player}</div>
                          <div className="text-right font-bold tabular-nums text-gray-400">{standing.played}</div>
                          <div className="text-right font-black tabular-nums text-green-400">{standing.points}</div>
                          <div className="text-right font-bold tabular-nums text-gray-300">{standing.legsFor - standing.legsAgainst > 0 ? "+" : ""}{standing.legsFor - standing.legsAgainst}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="grid min-h-0 gap-3 md:grid-cols-2 xl:grid-cols-1 xl:overflow-hidden">
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
              <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-300">Aftenstatus</h2>
              <div className="grid grid-cols-3 gap-2">
                <MiniStatus title="Færdige" value={finished} tone="green" />
                <MiniStatus title="I gang" value={live} tone="orange" />
                <MiniStatus title="Mangler" value={open} tone="gray" />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
              <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-300">Live ELO</h2>
              <div className="space-y-1">
                {eloRows.map((row) => (
                  <div key={row.player} className="grid grid-cols-[minmax(0,1fr)_48px_42px] items-center gap-2 text-xs">
                    <div className="truncate font-bold">{row.player}</div>
                    <div className="text-right font-black tabular-nums">{row.elo}</div>
                    <div className={`text-right font-black tabular-nums ${row.delta > 0 ? "text-green-400" : row.delta < 0 ? "text-red-400" : "text-gray-500"}`}>{formatDelta(row.delta)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
              <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-300">Seneste resultater</h2>
              <div className="space-y-1">
                {latestResults.length ? latestResults.map((match) => (
                  <div key={match.id} className="grid grid-cols-[minmax(0,1fr)_56px] items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-xs">
                    <div className="truncate font-bold">{match.player1} - {match.player2}</div>
                    <div className="text-right text-lg font-black tabular-nums text-green-400">{match.score1}-{match.score2}</div>
                  </div>
                )) : (
                  <div className="rounded-lg bg-gray-950 px-3 py-4 text-center text-sm font-bold text-gray-500">Ingen færdige kampe endnu.</div>
                )}
              </div>
            </section>

            {highlightCards.length > 0 && (
              <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3">
                <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-gray-300">Highlights</h2>
                <div className="grid grid-cols-2 gap-2">
                  {highlightCards.slice(0, 4).map((card) => <Highlight key={card.title} title={card.title} value={card.value} hint={card.hint} />)}
                </div>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function formatDelta(delta: number) {
  if (delta > 0) return `+${delta}`;
  return delta.toString();
}

function TopPill({ label, value, tone }: { label: string; value: string | number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "border-green-500/40 bg-green-500/10 text-green-300",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    gray: "border-gray-700 bg-gray-950 text-gray-200",
  };

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}

function MiniStatus({ title, value, tone }: { title: string; value: number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "text-green-400",
    orange: "text-orange-400",
    gray: "text-gray-200",
  };

  return <div className="rounded-xl bg-gray-950 p-3 text-center"><div className="text-[10px] font-bold uppercase text-gray-500">{title}</div><div className={`text-3xl font-black tabular-nums ${toneClasses[tone]}`}>{value}</div></div>;
}

function Highlight({ title, value, hint }: { title: string; value: string | number; hint: string }) {
  return <div className="rounded-xl bg-gray-950 p-3"><div className="text-[10px] font-bold uppercase text-gray-500">{title}</div><div className="text-2xl font-black tabular-nums">{value}</div><div className="truncate text-xs font-bold text-orange-300">{hint}</div></div>;
}
