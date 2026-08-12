"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getNextMatchesByBoard } from "@/lib/liveEngine";

export default function LivePage() {
  const { matches, setMatches } = useKlubaften();
  const nextMatches = getNextMatchesByBoard(matches);
  const finishedCount = matches.filter((match) => match.status === "finished").length;

  function updateScore(id: string, player: 1 | 2, delta: number) {
    setMatches(matches.map((match) => {
      if (match.id !== id || match.status === "finished") return match;
      return {
        ...match,
        score1: player === 1 ? Math.max(0, match.score1 + delta) : match.score1,
        score2: player === 2 ? Math.max(0, match.score2 + delta) : match.score2,
        status: "live" as const,
      };
    }));
  }

  function finishMatch(id: string) {
    setMatches(matches.map((match) =>
      match.id === id ? { ...match, status: "finished" as const } : match
    ));
  }

  if (matches.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🔴 Live scoring</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Opret først puljer og kampe.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🔴 Live scoring</h1>
            <p className="mt-2 text-gray-400">
              {finishedCount} færdige · {nextMatches.length} aktive baner
            </p>
          </div>
          <Link href="/klubaften/kampe" className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
            Kampoversigt
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-orange-800 bg-orange-500/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wide text-orange-400">
            Næste kampe på banerne
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Når en kamp afsluttes, bliver den næste kamp på samme bane automatisk vist.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nextMatches.map((match) => (
            <article key={match.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-5 flex items-center justify-between text-sm text-gray-500">
                <span>{match.pool} · Runde {match.round}</span>
                <span className="rounded-full bg-gray-800 px-3 py-1">Bane {match.board}</span>
              </div>

              {[1, 2].map((player) => {
                const first = player === 1;
                const name = first ? match.player1 : match.player2;
                const score = first ? match.score1 : match.score2;
                return (
                  <div key={player} className="mb-4 rounded-xl bg-gray-800 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-semibold">{name}</span>
                      <span className="text-3xl font-bold tabular-nums">{score}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => updateScore(match.id, first ? 1 : 2, -1)} className="rounded-lg border border-gray-700 px-4 py-2 hover:bg-gray-700">−</button>
                      <button onClick={() => updateScore(match.id, first ? 1 : 2, 1)} className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-semibold hover:bg-orange-600">+1</button>
                    </div>
                  </div>
                );
              })}

              <button onClick={() => finishMatch(match.id)} className="w-full rounded-xl border border-green-700 px-4 py-3 font-semibold text-green-400 hover:bg-green-500/10">
                Afslut kamp → næste kamp
              </button>
            </article>
          ))}
        </div>

        {nextMatches.length === 0 && (
          <div className="rounded-2xl border border-green-800 bg-green-500/10 p-8 text-center text-green-400">
            Alle kampe er afsluttet. Torsdag er færdig.
          </div>
        )}
      </section>
    </main>
  );
}
