"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { createThursdayPools } from "@/lib/thuPoolEngine";

export default function PuljerPage() {
  const { selectedPlayers, pools, setPools } = useKlubaften();

  useEffect(() => {
    if (selectedPlayers.length >= 10) {
      setPools(createThursdayPools(selectedPlayers));
    }
  }, [selectedPlayers, setPools]);

  if (selectedPlayers.length < 10) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🏆 Puljer</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Vælg mindst <strong>10 spillere</strong> for at oprette puljer.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-6xl p-10">
        <BackButton />
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🏆 Puljer</h1>
            <p className="mt-2 text-gray-400">
              {selectedPlayers.length} spillere fordelt i {pools.length} puljer.
            </p>
          </div>
          <div className="rounded-xl bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
            ✓ Puljer oprettet
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <div key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{pool.name}</h2>
                <span className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300">
                  {pool.players.length} spillere
                </span>
              </div>
              <div className="space-y-2">
                {pool.players.map((player) => (
                  <div key={player} className="rounded-lg bg-gray-800 px-4 py-3">
                    {player}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/klubaften/kampe"
          className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center text-lg font-semibold hover:bg-orange-600"
        >
          Generér kampe + tildel baner
        </Link>
      </section>
    </main>
  );
}
