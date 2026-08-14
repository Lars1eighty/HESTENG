"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculateEveningStats } from "@/lib/eveningStatsEngine";
import { getCompletedMatches } from "@/lib/matchStore";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { calculateEveningEloDeltas, getPlayerElo } from "@/lib/eloRatingEngine";

const REFRESH_INTERVAL_MS = 7000;

export default function KlubaftenPage() {
  const { selectedPlayers, pools, matches } = useKlubaften();
  const [, setRefreshTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setRefreshTick((tick) => tick + 1), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const finished = matches.filter((match) => match.status === "finished").length;
  const live = matches.filter((match) => match.status === "live").length;
  const open = matches.filter((match) => match.status === "pending").length;
  const total = matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
  const finishedMatchIds = new Set(matches.filter((match) => match.status === "finished").map((match) => match.id));
  const completedMatches = getCompletedMatches().filter((match) => finishedMatchIds.has(match.id));
  const eveningStats = calculateEveningStats(completedMatches);
  const eveningEloDeltas = calculateEveningEloDeltas([...finishedMatchIds]);
  const liveMatches = matches.filter((match) => match.status === "live").sort((a, b) => a.board - b.board);
  const latestResults = matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))
    .slice(0, 5);
  const mostOneEighties =
    eveningStats.players
      .filter((player) => player.oneEighties > 0)
      .sort((a, b) => b.oneEighties - a.oneEighties || a.player.localeCompare(b.player))[0] ?? null;
  const dateLabel = new Intl.DateTimeFormat("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const lastUpdated = new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  const highlightCards = [
    {
      title: "Bedste snit",
      value: eveningStats.bestAverage ? eveningStats.bestAverage.average.toFixed(2) : "-",
      hint: eveningStats.bestAverage?.player,
    },
    {
      title: "Flest 180'ere",
      value: mostOneEighties?.oneEighties ?? "-",
      hint: mostOneEighties?.player,
    },
    {
      title: "Bedste lukke %",
      value: eveningStats.bestCheckoutPercent ? `${eveningStats.bestCheckoutPercent.checkoutPercent}%` : "-",
      hint: eveningStats.bestCheckoutPercent?.player,
    },
    {
      title: "Hurtigste leg",
      value: eveningStats.fastestLeg?.fastestLegDarts ?? "-",
      hint: eveningStats.fastestLeg?.player,
    },
  ];

  const poolSummaries = pools.map((pool) => {
    const poolMatches = matches.filter((match) => match.pool === pool.name);
    const poolFinished = poolMatches.filter((match) => match.status === "finished").length;
    return {
      pool,
      poolFinished,
      poolTotal: poolMatches.length,
      standings: calculatePoolStandings(pool.name, pool.players, matches).slice(0, 4).map((standing) => ({
        ...standing,
        elo: getPlayerElo(standing.player).elo,
        eveningEloDelta: eveningEloDeltas.get(standing.player) ?? 0,
      })),
    };
  });

  const liveStatusText = liveMatches.length
    ? `${liveMatches.length} kampe i gang`
    : finished === total
      ? "Alle kampe er færdige"
      : "Ingen live kampe lige nu";

  if (!matches.length) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-7xl p-10">
          <BackButton />
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-8 text-4xl font-bold">Klubaften</h1>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-2xl font-bold">Ny klubaften</h2>
              <p className="mt-3 text-gray-400">Start en klubaften og gå direkte til spillerne.</p>
              <Link href="/klubaften/ny" className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center font-semibold text-black hover:bg-orange-400">
                Opret klubaften
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-[1800px] p-6 xl:p-10">
        <BackButton />

        <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="text-lg font-semibold uppercase tracking-wider text-orange-400">Klubaften aktiv</div>
            <h1 className="mt-1 text-6xl font-black tracking-normal xl:text-7xl">Klubaften live</h1>
            <p className="mt-3 text-2xl font-semibold capitalize text-gray-300">
              {dateLabel} · {selectedPlayers.length} spillere
            </p>
          </div>
          <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-6 py-4 text-right">
            <div className="text-sm font-semibold uppercase tracking-wider text-orange-300">Auto-opdatering</div>
            <div className="mt-1 text-2xl font-bold">{lastUpdated}</div>
            <div className="text-sm text-gray-400">hver {REFRESH_INTERVAL_MS / 1000}. sekund</div>
          </div>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-3">
          <StatusStat title="Færdige" value={finished} tone="green" />
          <StatusStat title="I gang" value={live} tone="orange" />
          <StatusStat title="Mangler" value={open} tone="gray" />
        </div>

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl font-black">Kampstatus</h2>
            <span className="text-3xl font-black text-orange-400">{progress}%</span>
          </div>
          <div className="h-5 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-4 text-2xl font-semibold text-gray-300">{finished} færdige · {live} i gang · {open} mangler</p>
        </section>

        <div className="mb-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black">Live nu</h2>
              <span className="rounded-full bg-gray-800 px-4 py-2 text-lg font-bold text-orange-300">{liveStatusText}</span>
            </div>
            <div className="space-y-4">
              {liveMatches.length ? liveMatches.map((match) => (
                <div key={match.id} className="rounded-2xl border border-orange-500/30 bg-gray-950 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black">{match.player1} <span className="text-gray-500">vs</span> {match.player2}</div>
                      <div className="mt-2 text-xl font-semibold text-gray-400">{match.pool} · Runde {match.round} · Bane {match.board}</div>
                    </div>
                    <div className="rounded-xl bg-orange-500 px-5 py-3 text-2xl font-black text-black">I GANG</div>
                  </div>
                  {(match.score1 > 0 || match.score2 > 0) && (
                    <div className="mt-4 text-2xl font-bold text-gray-300">Legs: {match.score1} - {match.score2}</div>
                  )}
                </div>
              )) : (
                <div className="rounded-2xl bg-gray-950 p-8 text-center text-2xl font-semibold text-gray-400">
                  {finished === total ? "Alle kampe er færdigspillet." : "Næste kamp vises her, når den startes."}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black">Seneste resultater</h2>
              <span className="text-lg font-semibold text-gray-500">Top 5</span>
            </div>
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
            <span className="text-lg font-semibold text-gray-500">{pools.length} puljer</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {poolSummaries.map(({ pool, poolFinished, poolTotal, standings }) => {
              const poolProgress = poolTotal > 0 ? Math.round((poolFinished / poolTotal) * 100) : 0;
              return (
                <div key={pool.name} className="rounded-2xl bg-gray-950 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-3xl font-black">{pool.name}</div>
                      <div className="mt-1 text-lg font-semibold text-gray-400">{poolFinished}/{poolTotal} kampe færdige</div>
                    </div>
                    <div className="text-3xl font-black text-orange-400">{poolProgress}%</div>
                  </div>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${poolProgress}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-[32px_1fr_58px_54px_32px_32px_40px_38px] gap-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <div />
                    <div>Navn</div>
                    <div className="text-right">ELO</div>
                    <div className="text-right">Δ</div>
                    <div className="text-right">K</div>
                    <div className="text-right">V</div>
                    <div className="text-right">+/-</div>
                    <div className="text-right">P</div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {standings.map((standing, index) => (
                      <div key={standing.player} className="grid grid-cols-[32px_1fr_58px_54px_32px_32px_40px_38px] items-center gap-2 text-base">
                        <div className="font-black text-gray-500">{index + 1}</div>
                        <div className="truncate font-bold">{standing.player}</div>
                        <div className="text-right font-black tabular-nums text-gray-200">{standing.elo}</div>
                        <div className={`text-right font-black tabular-nums ${standing.eveningEloDelta >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {standing.eveningEloDelta > 0 ? `+${standing.eveningEloDelta}` : standing.eveningEloDelta}
                        </div>
                        <div className="text-right font-bold tabular-nums text-gray-300">{standing.played}</div>
                        <div className="text-right font-bold tabular-nums text-gray-300">{standing.wins}</div>
                        <div className="text-right font-bold tabular-nums text-gray-300">{standing.legsFor - standing.legsAgainst}</div>
                        <div className="text-right font-black tabular-nums text-green-400">{standing.points}</div>
                      </div>
                    ))}
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
            {highlightCards.map((card) => (
              <Stat key={card.title} title={card.title} value={card.value} hint={card.hint} />
            ))}
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
