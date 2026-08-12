"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import { createThursdayMatches } from "@/lib/matchEngine";

export default function KampePage() {
  const { pools, matches, setMatches } = useKlubaften();

  useEffect(() => {
    if (pools.length > 0 && matches.length === 0) {
      setMatches(createThursdayMatches(pools));
    }
  }, [pools, matches.length, setMatches]);

  if (pools.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🎯 Kampe</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Opret først puljerne.
          </div>
        </section>
      </main>
    );
  }

  const boards = Array.from(
    { length: Math.max(...matches.map((match) => match.board), 6) },
    (_, index) => index + 1
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🎯 Kampe + baner</h1>
            <p className="mt-2 text-gray-400">
              {matches.length} kampe er genereret fra {pools.length} puljer.
            </p>
          </div>
          <Link
            href="/klubaften/puljer"
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Se puljer
          </Link>
        </div>

        <div className="mb-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {boards.map((board) => {
            const next = matches.find((match) => match.board === board);
            return (
              <div
                key={board}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className="text-sm text-gray-500">Bane</div>
                <div className="mt-1 text-2xl font-bold">{board}</div>
                <div className="mt-4 text-sm text-gray-300">
                  {next ? `${next.player1} – ${next.player2}` : "Ledig"}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-8">
          {pools.map((pool) => {
            const poolMatches = matches.filter((match) => match.pool === pool.name);
            return (
              <section
                key={pool.name}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">{pool.name}</h2>
                  <span className="text-sm text-gray-500">
                    {poolMatches.length} kampe
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="pb-3 pr-4">Runde</th>
                        <th className="pb-3 pr-4">Bane</th>
                        <th className="pb-3">Kamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poolMatches.map((match) => (
                        <tr key={match.id} className="border-t border-gray-800">
                          <td className="py-3 pr-4">{match.round}</td>
                          <td className="py-3 pr-4 font-semibold">{match.board}</td>
                          <td className="py-3">
                            {match.player1} <span className="text-gray-600">vs.</span> {match.player2}
                          </td>
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
