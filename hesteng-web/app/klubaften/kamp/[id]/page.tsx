"use client";

import { use, useCallback, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import MatchScorer from "@/components/MatchScorer";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getCompletedMatch, type CompletedMatch } from "@/lib/matchStore";
import { applyEloForCompletedMatch } from "@/lib/eloRatingEngine";

const LEG_OPTIONS = [3, 5, 7, 9];

export default function KampScoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { matches, setMatches } = useKlubaften();
  const match = matches.find((item) => item.id === id);
  const [selectedBestOfLegs, setSelectedBestOfLegs] = useState(5);

  const saveMatchResult = useCallback((completedMatch: CompletedMatch) => {
    applyEloForCompletedMatch(completedMatch);
    setMatches(matches.map((item) => {
      if (item.id !== completedMatch.id) return item;
      const loser = completedMatch.winner === item.player1 ? item.player2 : item.player1;
      return {
        ...item,
        bestOfLegs: completedMatch.bestOfLegs,
        score1: completedMatch.score1,
        score2: completedMatch.score2,
        winner: completedMatch.winner,
        loser,
        finishedAt: completedMatch.finishedAt,
        status: "finished",
      };
    }));
  }, [matches, setMatches]);

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
  const isSetupRequired = match.status === "pending";
  const isFinished = match.status === "finished";
  const matchId = match.id;
  const completedMatch = isFinished ? getCompletedMatch(match.id) : null;

  function startMatch() {
    setMatches(matches.map((item) => item.id === matchId ? {
      ...item,
      bestOfLegs: selectedBestOfLegs,
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
          <Link href="/klubaften/live" className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
            Tilbage til live
          </Link>
        </div>

        {isFinished ? (
          <div className="rounded-2xl border border-green-800 bg-green-500/10 p-6 text-center">
            <div className="text-sm font-semibold text-green-400">KAMP FÆRDIG</div>
            <div className="mt-2 text-3xl font-bold">{match.winner ?? "Vinderen"} vinder</div>
            <div className="mt-2 text-xl text-gray-300">{match.score1} – {match.score2}</div>
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
              <Link href="/klubaften/kampe" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-black hover:bg-orange-400">
                Tilbage til kampoversigt
              </Link>
              <Link href="/klubaften/stilling" className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold hover:bg-gray-800">
                Se puljestilling
              </Link>
            </div>
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
            <button onClick={startMatch} className="mt-4 w-full rounded-2xl bg-green-500 py-5 text-xl font-bold text-black">START KAMP</button>
          </div>
        ) : (
          <MatchScorer
            matchId={match.id}
            player1={match.player1}
            player2={match.player2}
            bestOfLegs={bestOfLegs}
            board={match.board}
            pool={match.pool}
            round={match.round}
            onMatchComplete={saveMatchResult}
          />
        )}
      </section>
    </main>
  );
}
