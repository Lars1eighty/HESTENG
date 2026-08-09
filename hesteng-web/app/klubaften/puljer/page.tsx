"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { useKlubaften } from "@/context/KlubaftenContext";
import { createPools } from "@/lib/poolEngine";

export default function PuljerPage() {
  const { selectedPlayers } = useKlubaften();

  if (selectedPlayers.length < 10) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />

        <section className="mx-auto max-w-5xl p-10">
          <BackButton />

          <h1 className="mb-8 text-4xl font-bold">
            🏆 Puljer
          </h1>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Vælg mindst <strong>10 spillere</strong> for at oprette puljer.
          </div>
        </section>
      </main>
    );
  }

  const pools = createPools(selectedPlayers);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-6xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">
          🏆 Puljer
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          {pools.map((pool) => (
            <div
              key={pool.name}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
            >
              <h2 className="mb-4 text-2xl font-bold">
                {pool.name}
              </h2>

              <div className="space-y-2">
                {pool.players.map((player) => (
                  <div
                    key={player}
                    className="rounded-lg bg-gray-800 px-4 py-3"
                  >
                    {player}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}