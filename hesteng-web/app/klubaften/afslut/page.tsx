"use client";

import { useKlubaften } from "@/context/KlubaftenContext";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { calculatePoolStandings } from "@/lib/standingsEngine";

export default function AfslutKlubaftenPage() {
  const { pools, matches, isFinished, finishKlubaften } = useKlubaften();
  const unfinished = matches.filter((match) => match.status !== "finished").length;

  if (isFinished) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <div className="rounded-2xl border border-green-800 bg-green-950/30 p-10 text-center">
            <div className="text-5xl">🏁</div>
            <h1 className="mt-4 text-4xl font-bold">Torsdag afsluttet</h1>
            <p className="mt-3 text-gray-400">Resultaterne er låst for denne klubaften.</p>
            <Link href="/klubaften/stilling" className="mt-8 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-600">
              Se endelig stilling
            </Link>
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
        <h1 className="mb-2 text-4xl font-bold">🏁 Afslut torsdag</h1>
        <p className="mb-8 text-gray-400">Gennemgå resultaterne og afslut aftenen.</p>

        {unfinished > 0 && (
          <div className="mb-8 rounded-2xl border border-yellow-800 bg-yellow-950/30 p-6 text-yellow-300">
            Der mangler stadig {unfinished} kampe. Du kan afslutte alligevel, men de manglende kampe kommer ikke med i den endelige stilling.
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {pools.map((pool) => {
            const standings = calculatePoolStandings(pool.name, pool.players, matches);
            return (
              <section key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-4 text-2xl font-bold">{pool.name}</h2>
                <div className="space-y-2">
                  {standings.map((standing, index) => (
                    <div key={standing.player} className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                      <span><strong className="mr-3">{index + 1}.</strong>{standing.player}</span>
                      <span className="font-bold">{standing.points} point</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={finishKlubaften}
          className="w-full rounded-xl bg-red-600 py-4 text-lg font-bold hover:bg-red-700"
        >
          🏁 Afslut torsdag
        </button>
      </section>
    </main>
  );
}
