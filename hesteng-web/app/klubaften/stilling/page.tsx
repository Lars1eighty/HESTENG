"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { calculatePoolStandings } from "@/lib/standingsEngine";

export default function StillingPage() {
  const { pools, matches } = useKlubaften();

  if (pools.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🏆 Puljestilling</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Opret først puljerne.</div>
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
            <h1 className="text-4xl font-bold">🏆 Puljestilling</h1>
            <p className="mt-2 text-gray-400">Live rangering baseret på afsluttede kampe.</p>
          </div>
          <Link href="/klubaften/live" className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600">🔴 Live scoring</Link>
        </div>

        <div className="space-y-8">
          {pools.map((pool) => {
            const standings = calculatePoolStandings(pool.name, pool.players, matches);
            return (
              <section key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{pool.name}</h2>
                  <span className="text-sm text-gray-500">{pool.players.length} spillere</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-500">
                      <tr><th className="pb-3 pr-4">#</th><th className="pb-3 pr-4">Spiller</th><th className="pb-3 pr-4 text-center">K</th><th className="pb-3 pr-4 text-center">V</th><th className="pb-3 pr-4 text-center">T</th><th className="pb-3 pr-4 text-center">Point</th><th className="pb-3 text-center">+/-</th></tr>
                    </thead>
                    <tbody>
                      {standings.map((standing, index) => (
                        <tr key={standing.player} className="border-t border-gray-800">
                          <td className="py-3 pr-4 font-bold">{index + 1}</td>
                          <td className="py-3 pr-4 font-semibold">{standing.player}</td>
                          <td className="py-3 pr-4 text-center">{standing.played}</td>
                          <td className="py-3 pr-4 text-center text-green-400">{standing.wins}</td>
                          <td className="py-3 pr-4 text-center text-red-400">{standing.losses}</td>
                          <td className="py-3 pr-4 text-center font-bold">{standing.points}</td>
                          <td className="py-3 text-center">{standing.legsFor - standing.legsAgainst}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
