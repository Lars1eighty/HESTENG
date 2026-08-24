"use client";

import { use, useEffect, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculateEveningStats } from "@/lib/eveningStatsEngine";
import { getCompletedMatchesForClubNightInClub } from "@/lib/matchStore";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { calculateClubNightEloDeltasInClub } from "@/lib/eloRatingEngine";
import { getClubNightMatchHref } from "@/lib/clubNightRoutes";
import { calculateRankings } from "@/lib/rankingEngine";

const REFRESH_INTERVAL_MS = 7000;
type PerformanceRow = { id: string; player: string; value: string | number };

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
  const rankings = calculateRankings(undefined, currentClubId);
  const liveMatches = isActive ? matches.filter((match) => match.status === "live").sort((a, b) => a.board - b.board) : [];
  const latestResults = matches
    .filter((match) => match.status === "finished")
    .sort((a, b) => (b.completedAt ?? b.finishedAt ?? "").localeCompare(a.completedAt ?? a.finishedAt ?? ""))
    .slice(0, 6);
  const lastUpdatedLabel = clubNight.status === "active" ? lastUpdated : "Read-only";
  const liveEloRows = rankings.elo.map((row, index) => ({
    rank: index + 1,
    rankDelta: null as number | null,
    player: row.player,
    elo: row.value ?? 0,
    eloDelta: eveningEloDeltas.get(row.player) ?? 0,
  }));
  const oneEightyRows: PerformanceRow[] = eveningStats.players
    .filter((player) => player.oneEighties > 0)
    .sort((a, b) => b.oneEighties - a.oneEighties || a.player.localeCompare(b.player))
    .map((player) => ({ id: `180-${player.player}`, player: player.player, value: `×${player.oneEighties}` }));
  const highCheckoutRows: PerformanceRow[] = completedMatches.flatMap((match) =>
    match.players
      .filter((player) => (player.highestCheckout ?? 0) >= 100)
      .map((player) => ({
        id: `co-${match.id}-${player.name}-${player.highestCheckout}`,
        player: player.name,
        value: player.highestCheckout ?? 0,
      }))
  );
  const fastLegRows: PerformanceRow[] = completedMatches.flatMap((match) =>
    match.players
      .filter((player) => player.fastestLegDarts !== null && player.fastestLegDarts <= 21)
      .map((player) => ({
        id: `leg-${match.id}-${player.name}-${player.fastestLegDarts}`,
        player: player.name,
        value: `${player.fastestLegDarts} pile`,
      }))
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1920px] flex-col gap-1.5 p-1.5 lg:p-2 xl:h-[calc(100vh-72px)] xl:overflow-hidden">
        <div className="rounded-lg border border-gray-800 bg-gray-900/90 px-2.5 py-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-400">{isActive ? "Live" : "Arkiv"}</span>
                <h1 className="truncate text-xl font-black tracking-normal xl:text-3xl">{clubNight.name}</h1>
                <span className="text-xs font-bold text-gray-400 xl:text-sm">{clubNight.date} · {clubNight.selectedPlayers.length} spillere</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs font-bold">
              <TopPill label="Færdige" value={`${finished}/${total}`} tone="green" />
              <TopPill label="I gang" value={live} tone="orange" />
              <TopPill label="Mangler" value={open} tone="gray" />
              <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-right">
                <div className="text-[9px] uppercase tracking-wider text-orange-300">{isActive ? "Auto" : "Status"}</div>
                <div className="text-xs tabular-nums text-orange-100">{lastUpdatedLabel}</div>
              </div>
              <Link href={`/klubaften/${clubNight.id}/kampe`} className="rounded-full border border-orange-500/70 bg-orange-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-200 transition hover:border-orange-400 hover:bg-orange-500/20">
                KAMPE
              </Link>
              <Link href={`/klubaften/${clubNight.id}/afslut`} className="rounded-full border border-gray-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 transition hover:border-orange-500/70 hover:text-orange-300">
                Administration
              </Link>
            </div>
          </div>
        </div>

        <section className="rounded-lg border border-orange-500/25 bg-gray-900 p-1.5">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-orange-300 xl:text-lg">Aktive kampe</h2>
            <div className="text-[10px] font-bold text-gray-500">{isActive ? `${REFRESH_INTERVAL_MS / 1000}s auto` : "Read-only"}</div>
          </div>
          <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
            {liveMatches.length ? liveMatches.slice(0, 8).map((match) => (
              <Link key={match.id} href={getClubNightMatchHref(match.id, clubNight.id)} className="rounded-lg border border-orange-500/30 bg-gray-950 px-2.5 py-1.5 transition hover:border-orange-500">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-orange-300">Bane {match.board}</div>
                  <div className="text-[10px] font-bold text-gray-500">{match.pool} · R{match.round}</div>
                </div>
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="truncate text-sm font-black xl:text-base">{match.player1}</div>
                  <div className="rounded-md bg-orange-500 px-2 py-0.5 text-lg font-black tabular-nums text-black xl:text-xl">{match.score1}-{match.score2}</div>
                  <div className="truncate text-right text-sm font-black xl:text-base">{match.player2}</div>
                </div>
              </Link>
            )) : (
              <div className="rounded-lg bg-gray-950 px-3 py-2 text-center text-sm font-bold text-gray-400 md:col-span-2 xl:col-span-4 2xl:col-span-6">
                {isActive
                  ? total > 0 && finished === total ? "Alle kampe er færdigspillet." : "Ingen aktive kampe lige nu."
                  : "Arkiveret klubaften åbnes som read-only historik."}
              </div>
            )}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-1.5 xl:grid-cols-[minmax(0,1fr)_500px] 2xl:grid-cols-[minmax(0,1fr)_540px]">
          <section className="min-h-0 rounded-lg border border-gray-800 bg-gray-900 p-1.5 xl:overflow-hidden">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide xl:text-lg">Puljestillinger</h2>
              <span className="text-xs font-bold text-gray-500">{progress}% · {clubNight.pools.length} puljer</span>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {clubNight.pools.map((pool) => {
                const poolMatches = matches.filter((match) => match.pool === pool.name);
                const poolFinished = poolMatches.filter((match) => match.status === "finished").length;
                const standings = calculatePoolStandings(pool.name, pool.players, matches);
                return (
                  <div key={pool.name} className="rounded-lg border border-gray-800 bg-gray-950 p-1.5">
                    <div className="mb-1 flex items-center justify-between border-b border-gray-800 pb-1">
                      <div className="text-base font-black text-orange-300 xl:text-lg">{pool.name}</div>
                      <div className="text-[10px] font-bold text-gray-500">{poolFinished}/{poolMatches.length}</div>
                    </div>
                    <div className="grid grid-cols-[20px_minmax(0,1fr)_22px_22px_22px_32px] gap-1 border-b border-gray-900 pb-0.5 text-[9px] font-black uppercase text-gray-600">
                      <div>#</div>
                      <div>Navn</div>
                      <div className="text-right">K</div>
                      <div className="text-right">V</div>
                      <div className="text-right">T</div>
                      <div className="text-right">+/-</div>
                    </div>
                    <div>
                      {standings.map((standing, index) => (
                        <div key={standing.player} className="grid grid-cols-[20px_minmax(0,1fr)_22px_22px_22px_32px] items-center gap-1 border-b border-gray-900/70 py-0.5 text-[10px] leading-none xl:text-[11px]">
                          <div className="font-black text-gray-500">{index + 1}</div>
                          <div className="truncate font-bold text-gray-100">{standing.player}</div>
                          <div className="text-right font-bold tabular-nums text-gray-400">{standing.played}</div>
                          <div className="text-right font-bold tabular-nums text-green-400">{standing.wins}</div>
                          <div className="text-right font-bold tabular-nums text-red-300">{standing.losses}</div>
                          <div className="text-right font-bold tabular-nums text-gray-300">{standing.legsFor - standing.legsAgainst > 0 ? "+" : ""}{standing.legsFor - standing.legsAgainst}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="grid min-h-0 gap-1.5 md:grid-cols-2 xl:grid-cols-1 xl:grid-rows-[auto_minmax(0,1fr)_auto_auto] xl:overflow-hidden">
            <section className="rounded-lg border border-gray-800 bg-gray-900 p-1.5">
              <h2 className="mb-1 text-xs font-black uppercase tracking-wide text-gray-300">Aftenstatus</h2>
              <div className="grid grid-cols-3 gap-1">
                <MiniStatus title="Færdige" value={finished} tone="green" />
                <MiniStatus title="I gang" value={live} tone="orange" />
                <MiniStatus title="Mangler" value={open} tone="gray" />
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-1.5">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wide text-gray-300">Live ELO</h2>
                <span className="text-[9px] font-bold uppercase text-gray-600">Aktiv-snapshot mangler</span>
              </div>
              <div className="grid gap-x-3 xl:grid-cols-2">
                {liveEloRows.map((row) => (
                  <div key={row.player} className="grid grid-cols-[42px_minmax(0,1fr)_42px_36px] items-center gap-1 border-b border-gray-800/70 py-0.5 text-[10px] leading-none 2xl:text-[11px]">
                    <div className="font-black tabular-nums text-gray-400">#{row.rank} <RankDelta value={row.rankDelta} /></div>
                    <div className="truncate font-bold">{row.player}</div>
                    <div className="text-right font-black tabular-nums">{row.elo}</div>
                    <div className={`text-right font-black tabular-nums ${row.eloDelta > 0 ? "text-green-400" : row.eloDelta < 0 ? "text-red-400" : "text-gray-500"}`}>{formatDelta(row.eloDelta)}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-1.5">
              <h2 className="mb-1 text-xs font-black uppercase tracking-wide text-gray-300">Seneste resultater</h2>
              <div className="space-y-0.5">
                {latestResults.length ? latestResults.map((match) => (
                  <div key={match.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-1 rounded bg-gray-950 px-2 py-1 text-[11px] leading-none">
                    <div className="truncate font-bold">{match.player1} - {match.player2}</div>
                    <div className="text-right text-sm font-black tabular-nums text-green-400">{match.score1}-{match.score2}</div>
                  </div>
                )) : (
                  <div className="rounded bg-gray-950 px-2 py-2 text-center text-xs font-bold text-gray-500">Ingen færdige kampe endnu.</div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-gray-800 bg-gray-900 p-1.5">
              <h2 className="mb-1 text-xs font-black uppercase tracking-wide text-gray-300">Highlights</h2>
              <div className="grid grid-cols-3 gap-1">
                <PerformanceList title="180'ere" rows={oneEightyRows} />
                <PerformanceList title="100+ luk" rows={highCheckoutRows} />
                <PerformanceList title="≤21 pile" rows={fastLegRows} />
              </div>
            </section>
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

function RankDelta({ value }: { value: number | null }) {
  if (value === null || value === 0) return <span className="text-gray-600">–</span>;
  if (value > 0) return <span className="text-green-400">↑{value}</span>;
  return <span className="text-red-400">↓{Math.abs(value)}</span>;
}

function TopPill({ label, value, tone }: { label: string; value: string | number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "border-green-500/40 bg-green-500/10 text-green-300",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    gray: "border-gray-700 bg-gray-950 text-gray-200",
  };

  return (
    <div className={`rounded-md border px-2 py-1 ${toneClasses[tone]}`}>
      <div className="text-[9px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-base font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}

function MiniStatus({ title, value, tone }: { title: string; value: number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "text-green-400",
    orange: "text-orange-400",
    gray: "text-gray-200",
  };

  return <div className="rounded-md bg-gray-950 p-1.5 text-center"><div className="text-[9px] font-bold uppercase text-gray-500">{title}</div><div className={`text-2xl font-black leading-none tabular-nums ${toneClasses[tone]}`}>{value}</div></div>;
}

function PerformanceList({ title, rows }: { title: string; rows: PerformanceRow[] }) {
  return (
    <div className="rounded-md bg-gray-950 p-1.5">
      <div className="mb-1 text-[9px] font-black uppercase text-gray-500">{title}</div>
      <div className="space-y-0.5">
        {rows.length ? rows.slice(0, 8).map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-1 text-[10px] leading-none">
            <div className="truncate font-bold text-gray-200">{row.player}</div>
            <div className="font-black tabular-nums text-orange-300">{row.value}</div>
          </div>
        )) : (
          <div className="text-[10px] font-bold text-gray-600">Ingen endnu</div>
        )}
      </div>
    </div>
  );
}
