"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import MatchScorer from "@/components/MatchScorer";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getCompletedMatchInClub, type CompletedMatch } from "@/lib/matchStore";
import { applyEloForCompletedMatch } from "@/lib/eloRatingEngine";
import type { ClubMatch } from "@/lib/matchEngine";

const LEG_OPTIONS = [3, 5, 7, 9];
const SCORING_MODE_OPTIONS: Array<{ value: NonNullable<ClubMatch["scoringMode"]>; label: string }> = [
  { value: "total", label: "Samlet score" },
  { value: "dart-by-dart", label: "Pil for pil" },
];

function formatMatchDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return null;
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function KampScoringPage() {
  const params = useParams<{ id?: string; clubNightId?: string }>();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const routeClubNightId = typeof params.clubNightId === "string"
    ? params.clubNightId
    : searchParams.get("clubNightId");
  const { currentClubId, clubNights, matches, setMatches, currentClubNightId, setCurrentClubNightId } = useKlubaften();
  const clubNightId = routeClubNightId ?? currentClubNightId;
  const clubNight = clubNights.find((item) => item.id === clubNightId) ?? null;
  const scopedMatches = clubNight?.matches ?? matches;
  const match = scopedMatches.find((item) => item.id === id);
  const [selectedBestOfLegs, setSelectedBestOfLegs] = useState(5);
  const [selectedScoringMode, setSelectedScoringMode] = useState<NonNullable<ClubMatch["scoringMode"]>>("total");

  useEffect(() => {
    if (routeClubNightId) setCurrentClubNightId(routeClubNightId);
  }, [routeClubNightId, setCurrentClubNightId]);

  const saveMatchResult = useCallback((completedMatch: CompletedMatch) => {
    const scopedCompletedMatch = {
      ...completedMatch,
      clubId: completedMatch.clubId ?? clubNight?.clubId ?? currentClubId,
      clubNightId: completedMatch.clubNightId ?? clubNightId ?? undefined,
    };
    applyEloForCompletedMatch(scopedCompletedMatch);
    setMatches(scopedMatches.map((item) => {
      if (item.id !== scopedCompletedMatch.id) return item;
      const loser = completedMatch.winner === item.player1 ? item.player2 : item.player1;
      return {
        ...item,
        clubId: item.clubId ?? clubNight?.clubId ?? currentClubId,
        clubNightId: item.clubNightId ?? clubNightId ?? undefined,
        bestOfLegs: scopedCompletedMatch.bestOfLegs,
        scoringMode: scopedCompletedMatch.scoringMode ?? item.scoringMode ?? "total",
        score1: scopedCompletedMatch.score1,
        score2: scopedCompletedMatch.score2,
        winner: scopedCompletedMatch.winner,
        loser,
        startedAt: scopedCompletedMatch.startedAt,
        completedAt: scopedCompletedMatch.completedAt,
        finishedAt: scopedCompletedMatch.finishedAt,
        durationSeconds: scopedCompletedMatch.durationSeconds,
        legsPlayed: scopedCompletedMatch.legsPlayed,
        avgSecondsPerLeg: scopedCompletedMatch.avgSecondsPerLeg,
        timingSource: scopedCompletedMatch.timingSource,
        status: "finished",
      };
    }));
  }, [clubNight?.clubId, clubNightId, currentClubId, scopedMatches, setMatches]);

  if (!match) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Kampen blev ikke fundet.
          </div>
        </section>
      </main>
    );
  }

  const bestOfLegs = match.bestOfLegs ?? 5;
  const scoringMode = match.scoringMode ?? "total";
  const isReadOnly = clubNight?.status !== "active";
  const isSetupRequired = match.status === "pending" && !isReadOnly;
  const isFinished = match.status === "finished";
  const matchId = match.id;
  const completedMatch = isFinished ? getCompletedMatchInClub(currentClubId, match.id) : null;
  const matchDuration = formatMatchDuration(completedMatch?.durationSeconds ?? match.durationSeconds);

  function startMatch() {
    if (isReadOnly) return;
    setMatches(scopedMatches.map((item) => item.id === matchId ? {
      ...item,
      clubId: item.clubId ?? clubNight?.clubId ?? currentClubId,
      clubNightId: item.clubNightId ?? clubNightId ?? undefined,
      bestOfLegs: selectedBestOfLegs,
      scoringMode: selectedScoringMode,
      startedAt: item.startedAt ?? new Date().toISOString(),
      status: "live",
    } : item));
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-5xl p-6 md:p-10">
        <BackButton />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">{match.pool} · Runde {match.round} · Bane {match.board}</div>
            <h1 className="mt-2 text-4xl font-bold">{match.player1} – {match.player2}</h1>
            <p className="mt-2 text-gray-400">501 Double Out · Bedst af {isSetupRequired ? selectedBestOfLegs : bestOfLegs} legs</p>
          </div>
          <Link href={clubNightId ? `/klubaften/${clubNightId}/live` : "/klubaften/live"} className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
            Tilbage til live
          </Link>
        </div>

        {isFinished ? (
          <div className="rounded-2xl border border-green-800 bg-green-500/10 p-6 text-center">
            <div className="text-sm font-semibold text-green-400">KAMP FÆRDIG</div>
            <div className="mt-2 text-3xl font-bold">{match.winner ?? "Vinderen"} vinder</div>
            <div className="mt-2 text-xl text-gray-300">{match.score1} – {match.score2}</div>
            {matchDuration && (
              <div className="mx-auto mt-4 max-w-xs rounded-xl border border-green-800/60 bg-gray-950/40 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Kampvarighed</div>
                <div className="mt-1 text-2xl font-black tabular-nums text-white">{matchDuration}</div>
              </div>
            )}
            {completedMatch && (
              <div className="mx-auto mt-6 max-w-md rounded-xl border border-green-800/60 bg-gray-950/40 p-4 text-sm">
                <div className="grid grid-cols-[90px_1fr_1fr] gap-3 text-center">
                  <div />
                  {completedMatch.players.map((player) => (
                    <div key={player.name} className="font-bold text-white">{player.name}</div>
                  ))}
                  <div className="text-left font-semibold text-gray-400">SNIT</div>
                  {completedMatch.players.map((player) => (
                    <div key={`${player.name}-avg`} className="font-semibold tabular-nums">{player.average.toFixed(2)}</div>
                  ))}
                  <div className="text-left font-semibold text-gray-400">LUKKE %</div>
                  {completedMatch.players.map((player) => (
                    <div key={`${player.name}-checkout`} className="font-semibold tabular-nums">{player.checkoutPercent}%</div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href={clubNightId ? `/klubaften/${clubNightId}/kampe` : "/klubaften/kampe"} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black hover:bg-orange-400">
                Tilbage til kampoversigt
              </Link>
              <Link href={clubNightId ? `/klubaften/${clubNightId}/stilling` : "/klubaften/stilling"} className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold hover:bg-gray-800">
                Se puljestilling
              </Link>
            </div>
          </div>
        ) : isReadOnly ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Denne klubaften ligger i arkiv og kan kun åbnes som historik.
          </div>
        ) : isSetupRequired ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <div className="text-sm font-semibold text-orange-400">KAMPOPSÆTNING</div>
            <h2 className="mt-2 text-2xl font-bold">Vælg antal legs før kampstart</h2>
            <div className="mt-5 grid grid-cols-4 gap-2">
              {LEG_OPTIONS.map((legs) => (
                <button key={legs} onClick={() => setSelectedBestOfLegs(legs)} className={`rounded-2xl border py-6 text-3xl font-bold ${selectedBestOfLegs === legs ? "border-orange-400 bg-orange-500 text-black" : "border-gray-800 bg-gray-950 text-white hover:border-gray-600"}`}>{legs}</button>
              ))}
            </div>
            <div className="mt-6">
              <div className="text-sm font-semibold uppercase tracking-wide text-gray-400">Scoring</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SCORING_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedScoringMode(option.value)}
                    className={`rounded-2xl border py-5 text-lg font-bold ${selectedScoringMode === option.value ? "border-orange-400 bg-orange-500 text-black" : "border-gray-800 bg-gray-950 text-white hover:border-gray-600"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={startMatch} className="mt-4 w-full rounded-2xl bg-green-500 py-5 text-xl font-bold text-black">START KAMP</button>
          </div>
        ) : (
          <MatchScorer
            matchId={match.id}
            clubId={clubNight?.clubId ?? currentClubId}
            clubNightId={clubNightId ?? undefined}
            player1={match.player1}
            player2={match.player2}
            bestOfLegs={bestOfLegs}
            scoringMode={scoringMode}
            board={match.board}
            pool={match.pool}
            round={match.round}
            startedAt={match.startedAt}
            onMatchComplete={saveMatchResult}
          />
        )}
      </section>
    </main>
  );
}
