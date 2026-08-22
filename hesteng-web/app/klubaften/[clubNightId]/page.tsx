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
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))
    .slice(0, 5);
  const mostOneEighties =
    eveningStats.players
      .filter((player) => player.oneEighties > 0)
      .sort((a, b) => b.oneEighties - a.oneEighties || a.player.localeCompare(b.player))[0] ?? null;
  const lastUpdatedLabel = clubNight.status === "active" ? lastUpdated : "Read-only";
  const highlightCards = [
    { title: "Bedste snit", value: eveningStats.bestAverage ? eveningStats.bestAverage.average.toFixed(2) : "-", hint: eveningStats.bestAverage?.player },
    { title: "Flest 180'ere", value: mostOneEighties?.oneEighties ?? "-", hint: mostOneEighties?.player },
    { title: "Bedste lukke %", value: eveningStats.bestCheckoutPercent ? `${eveningStats.bestCheckoutPercent.checkoutPercent}%` : "-", hint: eveningStats.bestCheckoutPercent?.player },
    { title: "Hurtigste leg", value: eveningStats.fastestLeg?.fastestLegDarts ?? "-", hint: eveningStats.fastestLeg?.player },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-[1800px] p-6 xl:p-10">
        <BackButton />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-lg font-semibold uppercase tracking-wider text-orange-400">
              {isActive ? "Klubaften aktiv" : "Arkiv"}
            </div>
            <h1 className="mt-1 text-6xl font-black tracking-normal xl:text-7xl">{clubNight.name}</h1>
            <p className="mt-3 text-2xl font-semibold text-gray-300">
              {clubNight.date} · {clubNight.selectedPlayers.length} spillere
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Link
              href={`/klubaften/${clubNight.id}/afslut`}
              className="rounded-full border border-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 transition hover:border-orange-500/70 hover:text-orange-300"
            >
              Administration
            </Link>
            <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-6 py-4 text-right">
              <div className="text-sm font-semibold uppercase tracking-wider text-orange-300">
                {isActive ? "Auto-opdatering" : "Arkivvisning"}
              </div>
              <div className="mt-1 text-2xl font-bold">{lastUpdatedLabel}</div>
              <div className="text-sm text-gray-400">
                {isActive ? `hver ${REFRESH_INTERVAL_MS / 1000}. sekund` : "read-only"}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-3">
          <StatusStat title="Færdige" value={finished} tone="green" />
          <StatusStat title={isActive ? "I gang" : "Live låst"} value={live} tone="orange" />
          <StatusStat title={isActive ? "Mangler" : "Ikke afsluttet"} value={open} tone="gray" />
        </div>

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-black">Kampstatus</h2>
            <span className="text-3xl font-black text-orange-400">{progress}%</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-300">
            {isActive ? `${finished} færdige · ${live} i gang · ${open} mangler` : `${finished} færdige · ${open} ikke afsluttet · read-only arkiv`}
          </p>
        </section>

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-7">
            <h2 className="mb-5 text-3xl font-black">Live nu</h2>
            <div className="space-y-4">
              {liveMatches.length ? liveMatches.map((match) => (
                <Link key={match.id} href={getClubNightMatchHref(match.id, clubNight.id)} className="block rounded-2xl border border-orange-500/30 bg-gray-950 p-5 transition hover:border-orange-500">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black">{match.player1} <span className="text-gray-500">vs</span> {match.player2}</div>
                      <div className="mt-2 text-xl font-semibold text-gray-400">{match.pool} · Runde {match.round} · Bane {match.board}</div>
                    </div>
                    <div className="rounded-xl bg-orange-500 px-5 py-3 text-2xl font-black text-black">I GANG</div>
                  </div>
                  {(match.score1 > 0 || match.score2 > 0) && <div className="mt-4 text-2xl font-bold text-gray-300">Legs: {match.score1} - {match.score2}</div>}
                </Link>
              )) : (
                <div className="rounded-2xl bg-gray-950 p-8 text-center text-2xl font-semibold text-gray-400">
                  {isActive
                    ? total > 0 && finished === total ? "Alle kampe er færdigspillet." : "Næste kamp vises her, når den startes."
                    : "Arkiveret klubaften åbnes som read-only historik."}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-7">
            <h2 className="mb-5 text-3xl font-black">Seneste resultater</h2>
            <div className="space-y-3">
              {latestResults.length ? latestResults.map((match) => (
                <div key={match.id} className="rounded-2xl bg-gray-950 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-black">{match.player1} - {match.player2}</div>
                      <div className="mt-1 text-base font-semibold text-gray-500">{match.pool} · Bane {match.board}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black tabular-nums text-green-400">{match.score1}-{match.score2}</div>
                      <div className="text-sm font-bold text-gray-400">{match.winner} vinder</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl bg-gray-950 p-8 text-center text-2xl font-semibold text-gray-400">Ingen færdige kampe endnu.</div>
              )}
            </div>
          </section>
        </div>

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black">Puljer</h2>
            <span className="text-lg font-semibold text-gray-500">{clubNight.pools.length} puljer</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {clubNight.pools.map((pool) => {
              const poolMatches = matches.filter((match) => match.pool === pool.name);
              const poolFinished = poolMatches.filter((match) => match.status === "finished").length;
              const poolProgress = poolMatches.length > 0 ? Math.round((poolFinished / poolMatches.length) * 100) : 0;
              const standings = calculatePoolStandings(pool.name, pool.players, matches).slice(0, 4);
              return (
                <div key={pool.name} className="rounded-2xl bg-gray-950 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black">{pool.name}</div>
                      <div className="mt-1 text-lg font-semibold text-gray-400">{poolFinished}/{poolMatches.length} kampe færdige</div>
                    </div>
                    <div className="text-3xl font-black text-orange-400">{poolProgress}%</div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${poolProgress}%` }} />
                  </div>
                  <div className="mt-4 space-y-2">
                    {standings.map((standing, index) => {
                      const delta = eveningEloDeltas.get(standing.player) ?? 0;
                      return (
                        <div key={standing.player} className="grid grid-cols-[32px_1fr_58px_54px_38px] items-center gap-2 text-base">
                          <div className="font-black text-gray-500">{index + 1}</div>
                          <div className="truncate font-bold">{standing.player}</div>
                          <div className="text-right font-black tabular-nums text-gray-200">{getPlayerElo(standing.player, currentClubId).elo}</div>
                          <div className={`text-right font-black tabular-nums ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>{delta > 0 ? `+${delta}` : delta}</div>
                          <div className="text-right font-black tabular-nums text-green-400">{standing.points}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black">Aftenens highlights</h2>
            <span className="text-lg font-semibold text-gray-500">{eveningStats.matchesPlayed} kampe spillet</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {highlightCards.map((card) => <Stat key={card.title} title={card.title} value={card.value} hint={card.hint} />)}
          </div>
        </section>
      </section>
    </main>
  );
}

function Stat({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5"><div className="text-lg font-semibold text-gray-500">{title}</div><div className="mt-2 text-5xl font-black tabular-nums">{value}</div>{hint && <div className="mt-2 truncate text-xl font-bold text-orange-400">{hint}</div>}</div>;
}

function StatusStat({ title, value, tone }: { title: string; value: number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "border-green-500/40 bg-green-500/10 text-green-400",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-400",
    gray: "border-gray-700 bg-gray-900 text-gray-200",
  };

  return (
    <div className={`rounded-3xl border p-8 ${toneClasses[tone]}`}>
      <div className="text-xl font-bold uppercase tracking-wider text-gray-400">{title}</div>
      <div className="mt-3 text-8xl font-black tabular-nums">{value}</div>
    </div>
  );
}
