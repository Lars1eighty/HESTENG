"use client";

import { use, useEffect, useMemo, useSyncExternalStore, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculateEveningStats } from "@/lib/eveningStatsEngine";
import { getCompletedMatchesForClubNightInClub } from "@/lib/matchStore";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { getClubNightMatchHref } from "@/lib/clubNightRoutes";
import type { ClubMatch } from "@/lib/matchEngine";
import { calculateThursdayPoints } from "@/lib/thursdayPointsEngine";
import {
  calculateLiveActiveRows,
  getLatestLiveActiveSnapshotFromStorageValue,
  getLiveActiveSnapshotStorageValue,
  subscribeLiveActiveSnapshots,
} from "@/lib/liveActiveEngine";

const REFRESH_INTERVAL_MS = 7000;
type PerformanceRow = { id: string; player: string; value: string | number };

export default function ClubNightDashboardPage({ params }: { params: Promise<{ clubNightId: string }> }) {
  const { clubNightId } = use(params);
  const { currentClubId, clubNights, setCurrentClubNightId } = useKlubaften();
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("-");
  const liveActiveSnapshotStore = useSyncExternalStore(
    subscribeLiveActiveSnapshots,
    getLiveActiveSnapshotStorageValue,
    () => "[]"
  );
  const liveActiveSnapshot = useMemo(
    () => getLatestLiveActiveSnapshotFromStorageValue(currentClubId, liveActiveSnapshotStore),
    [currentClubId, liveActiveSnapshotStore]
  );
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
  void refreshTick;
  const liveActiveRows = calculateLiveActiveRows(clubNights, currentClubId, liveActiveSnapshot, clubNight.id);
  const liveMatches = isActive ? matches.filter((match) => match.status === "live").sort((a, b) => a.board - b.board) : [];
  const nextMatches = isActive
    ? matches
      .filter((match) => match.status === "pending")
      .sort((a, b) =>
        a.scheduleSlot - b.scheduleSlot ||
        a.order - b.order ||
        a.board - b.board ||
        a.id.localeCompare(b.id, undefined, { numeric: true })
      )
      .slice(0, 9)
    : [];
  const lastUpdatedLabel = clubNight.status === "active" ? lastUpdated : "Read-only";
  const liveActiveSplitIndex = Math.ceil(liveActiveRows.length / 2);
  const liveEloColumns = [
    liveActiveRows.slice(0, liveActiveSplitIndex),
    liveActiveRows.slice(liveActiveSplitIndex),
  ];
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
  ).sort((a, b) => Number(b.value) - Number(a.value) || a.player.localeCompare(b.player));
  const fastLegRows: PerformanceRow[] = completedMatches.flatMap((match) =>
    match.players
      .filter((player) => player.fastestLegDarts !== null && player.fastestLegDarts <= 21)
      .map((player) => ({
        id: `leg-${match.id}-${player.name}-${player.fastestLegDarts}`,
        player: player.name,
        value: `${player.fastestLegDarts} pile`,
      }))
  ).sort((a, b) => Number.parseInt(String(a.value), 10) - Number.parseInt(String(b.value), 10) || a.player.localeCompare(b.player));
  const clubNightPointRows: PerformanceRow[] = calculateThursdayPoints(completedMatches)
    .filter((player) => player.totalPoints > 0)
    .map((player) => ({ id: `club-night-points-${player.player}`, player: player.player, value: player.totalPoints }));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1920px] flex-col gap-1 p-1.5 lg:p-2 xl:h-[calc(100vh-72px)] xl:overflow-hidden">
        <div className="rounded-lg border border-gray-800 bg-gray-900/90 px-2.5 py-1">
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
          <ActiveMatchTicker
            clubNightId={clubNight.id}
            isActive={isActive}
            liveMatches={liveMatches}
            allMatchesFinished={total > 0 && finished === total}
          />
        </div>

        <section className="rounded-lg border border-gray-800 bg-gray-900 px-2 py-1">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <h2 className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-orange-300 2xl:text-xs">
              Næste kampe
            </h2>
            {nextMatches.length ? (
              <div className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                {nextMatches.map((match) => (
                  <Link
                    key={match.id}
                    href={getClubNightMatchHref(match.id, clubNight.id)}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-1 rounded-md bg-gray-950 px-2 py-1 text-[11px] font-bold leading-none text-gray-200 transition hover:bg-gray-900 2xl:text-xs"
                  >
                    <span className="font-black text-orange-300">BANE {match.board}</span>
                    <span className="truncate">
                      {match.player1} vs {match.player2} · {match.pool}{match.round ? ` · R${match.round}` : ""}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="truncate text-[11px] font-bold leading-none text-gray-600 2xl:text-xs">
                {isActive ? "Ingen kommende kampe" : "Arkiv · ingen kommende kampe"}
              </div>
            )}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-1 xl:grid-cols-[minmax(760px,1.65fr)_minmax(330px,0.8fr)_minmax(310px,0.65fr)] xl:overflow-hidden">
          <section className="min-h-0 rounded-lg border border-gray-800 bg-gray-900 p-1.5 xl:overflow-hidden">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide text-orange-300 xl:text-lg">Live Aktiv</h2>
              {!liveActiveSnapshot && <span className="text-[9px] font-bold uppercase text-gray-600">Aktiv-snapshot mangler</span>}
            </div>
            <div className="grid gap-x-3 xl:grid-cols-2">
              <LiveEloColumn rows={liveEloColumns[0]} />
              <LiveEloColumn rows={liveEloColumns[1]} />
            </div>
          </section>

          <section className="min-h-0 rounded-lg border border-gray-800 bg-gray-900 p-1.5 xl:overflow-hidden">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wide xl:text-lg">Puljestillinger</h2>
              <span className="text-xs font-bold text-gray-500">{progress}% · {clubNight.pools.length} puljer</span>
            </div>
            <div className="grid gap-1.5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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
                    <div className="grid grid-cols-[20px_minmax(0,1fr)_22px_22px_22px_32px] gap-1 border-b border-gray-900 pb-0.5 text-[10px] font-black uppercase text-gray-600">
                      <div>#</div>
                      <div>Navn</div>
                      <div className="text-right">K</div>
                      <div className="text-right">V</div>
                      <div className="text-right">T</div>
                      <div className="text-right">+/-</div>
                    </div>
                    <div>
                      {standings.map((standing, index) => (
                        <div key={standing.player} className="grid grid-cols-[20px_minmax(0,1fr)_22px_22px_22px_32px] items-center gap-1 border-b border-gray-900/70 py-0.5 text-[11px] leading-none xl:text-xs">
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

          <section className="min-h-0 rounded-lg border border-gray-800 bg-gray-900 p-1.5 xl:overflow-hidden">
              <h2 className="mb-1 text-xs font-black uppercase tracking-wide text-gray-300">Dagens performance</h2>
              <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
                <PerformanceList title="180'ere" rows={oneEightyRows} />
                <PerformanceList title="Høje luk" rows={highCheckoutRows} />
                <PerformanceList title="Hurtige legs" rows={fastLegRows} />
                <PerformanceList title="Torsdagspoint i dag" rows={clubNightPointRows} />
              </div>
          </section>
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

function ActiveMatchTicker({
  clubNightId,
  isActive,
  liveMatches,
  allMatchesFinished,
}: {
  clubNightId: string;
  isActive: boolean;
  liveMatches: ClubMatch[];
  allMatchesFinished: boolean;
}) {
  const shouldScroll = liveMatches.length > 4;
  const emptyText = isActive
    ? allMatchesFinished ? "Alle kampe er færdigspillet" : "Ingen aktive kampe"
    : "Arkiv · read-only";
  const tickerItems = shouldScroll ? [...liveMatches, ...liveMatches] : liveMatches;

  return (
    <div className="mt-1 overflow-hidden rounded-md border border-orange-500/25 bg-gray-950/90 px-2 py-1">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
        <div className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-orange-300 2xl:text-xs">
          Aktive kampe
        </div>
        {liveMatches.length ? (
          <div className="overflow-hidden">
            <div className={shouldScroll ? "hesteng-live-ticker-track flex gap-2" : "flex flex-wrap gap-1.5"}>
              {tickerItems.map((match, index) => (
                <Link
                  key={`${match.id}-${index}`}
                  href={getClubNightMatchHref(match.id, clubNightId)}
                  className="inline-flex min-w-max items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[clamp(0.78rem,0.55vw+0.62rem,1rem)] font-black leading-none text-gray-100 transition hover:border-orange-400"
                >
                  <span className="text-orange-300">BANE {match.board}</span>
                  <span className="max-w-[13rem] truncate">{match.player1}</span>
                  <span className="rounded bg-orange-500 px-1.5 py-0.5 text-black tabular-nums">{match.score1}-{match.score2}</span>
                  <span className="max-w-[13rem] truncate">{match.player2}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="truncate text-sm font-black text-gray-500 2xl:text-base">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function LiveEloColumn({ rows }: { rows: Array<{ rank: number; rankDelta: number | null; player: string; elo: number; eloDelta: number | null }> }) {
  return (
    <div>
      <div className="grid grid-cols-[28px_24px_160px_42px_36px] gap-1 border-b border-gray-800 pb-0.5 text-[10px] font-black uppercase text-gray-600 2xl:grid-cols-[28px_24px_184px_42px_36px]">
        <div>#</div>
        <div>ΔR</div>
        <div>Navn</div>
        <div className="text-right">ELO</div>
        <div className="text-right">Δ</div>
      </div>
      {rows.map((row) => (
        <div key={row.player} className="grid grid-cols-[28px_24px_160px_42px_36px] items-center gap-1 border-b border-gray-800/70 py-0.5 text-xs leading-none 2xl:grid-cols-[28px_24px_184px_42px_36px] 2xl:text-[13px]">
          <div className="font-black tabular-nums text-gray-400">{row.rank}</div>
          <div className="font-black tabular-nums"><RankDelta value={row.rankDelta} /></div>
          <div className="truncate font-bold text-gray-100">{row.player}</div>
          <div className="text-right font-black tabular-nums">{row.elo}</div>
          <div className={`text-right font-black tabular-nums ${row.eloDelta === null ? "text-gray-600" : row.eloDelta > 0 ? "text-green-400" : row.eloDelta < 0 ? "text-red-400" : "text-gray-500"}`}>{row.eloDelta === null ? "–" : formatDelta(row.eloDelta)}</div>
        </div>
      ))}
    </div>
  );
}

function TopPill({ label, value, tone }: { label: string; value: string | number; tone: "green" | "orange" | "gray" }) {
  const toneClasses = {
    green: "border-green-500/40 bg-green-500/10 text-green-300",
    orange: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    gray: "border-gray-700 bg-gray-950 text-gray-200",
  };

  return (
    <div className={`rounded-md border px-2 py-1 ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-lg font-black leading-none tabular-nums">{value}</div>
    </div>
  );
}

function PerformanceList({ title, rows }: { title: string; rows: PerformanceRow[] }) {
  return (
    <div className="rounded-md bg-gray-950 p-1.5">
      <div className="mb-1 text-[10px] font-black uppercase text-gray-500">{title}</div>
      <div className="space-y-0.5">
        {rows.length ? rows.slice(0, 8).map((row) => (
          <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-1 text-[11px] leading-none 2xl:text-xs">
            <div className="truncate font-bold text-gray-200">{row.player}</div>
            <div className="font-black tabular-nums text-orange-300">{row.value}</div>
          </div>
        )) : (
          <div className="text-[11px] font-bold text-gray-600">Ingen endnu</div>
        )}
      </div>
    </div>
  );
}
