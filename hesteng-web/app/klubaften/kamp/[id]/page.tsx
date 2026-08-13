"use client";

import { use } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import MatchScorer from "@/components/MatchScorer";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function KampScoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { matches } = useKlubaften();
  const match = matches.find((item) => item.id === id);

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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-5xl p-6 md:p-10">
        <BackButton />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">{match.pool} · Runde {match.round} · Bane {match.board}</div>
            <h1 className="mt-2 text-4xl font-bold">{match.player1} – {match.player2}</h1>
            <p className="mt-2 text-gray-400">501 Double Out · Bedst af 3 legs</p>
          </div>
          <Link href="/klubaften/live" className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
            Tilbage til live
          </Link>
        </div>

        <MatchScorer
          matchId={match.id}
          player1={match.player1}
          player2={match.player2}
          bestOfLegs={3}
          board={match.board}
          pool={match.pool}
          round={match.round}
        />
      </section>
    </main>
  );
}
