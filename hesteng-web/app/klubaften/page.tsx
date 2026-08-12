"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function KlubaftenPage() {
  const { selectedPlayers, pools, matches } = useKlubaften();

  const finished = matches.filter((match) => match.status === "finished").length;
  const live = matches.filter((match) => match.status === "live").length;
  const open = matches.filter((match) => match.status === "pending").length;
  const total = matches.length;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  const boards = Array.from(
    { length: Math.max(...matches.map((match) => match.board), 0) },
    (_, index) => index + 1
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        {!matches.length ? (
          <div className="mx-auto max-w-3xl">
            <h1 className="mb-8 text-4xl font-bold">🏆 Klubaften</h1>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-2xl font-bold">Ny klubaften</h2>
              <p className="mt-3 text-gray-400">Start en torsdag og gå direkte til spillerne.</p>
              <Link href="/klubaften/ny" className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center font-semibold hover:bg-orange-600">
                Opret klubaften
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-orange-400">🔴 Aktiv torsdag</div>
                <h1 className="mt-1 text-4xl font-bold">Klubaften dashboard</h1>
                <p className="mt-2 text-gray-400">{selectedPlayers.length} spillere · {pools.length} puljer · {total} kampe</p>
              </div>
              <Link href="/klubaften/live" className="rounded-xl bg-orange-500 px-5 py-3 font-semibold hover:bg-orange-600">🔴 Åbn live scoring</Link>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat title="Spillere" value={selectedPlayers.length} />
              <Stat title="Puljer" value={pools.length} />
              <Stat title="Live" value={live} />
              <Stat title="Færdige" value={`${finished}/${total}`} />
            </div>

            <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-bold">Aftenens fremdrift</h2>
                <span className="font-semibold text-orange-400">{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-800">
                <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-3 text-sm text-gray-500">{finished} færdige · {live} i gang · {open} venter</p>
            </section>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">🎯 Boards</h2>
                  <Link href="/klubaften/kampe" className="text-sm text-orange-400 hover:text-orange-300">Alle kampe →</Link>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {boards.map((board) => {
                    const match = matches.find((item) => item.board === board && item.status !== "finished");
                    return (
                      <div key={board} className="rounded-xl bg-gray-800 p-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Bane {board}</div>
                        <div className="mt-2 font-semibold">{match ? `${match.player1} – ${match.player2}` : "Ledig"}</div>
                        {match && <div className="mt-1 text-xs text-gray-500">{match.pool} · Runde {match.round}</div>}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold">🏆 Puljer</h2>
                  <Link href="/klubaften/puljer" className="text-sm text-orange-400 hover:text-orange-300">Se puljer →</Link>
                </div>
                <div className="space-y-3">
                  {pools.map((pool) => {
                    const poolMatches = matches.filter((match) => match.pool === pool.name);
                    const poolFinished = poolMatches.filter((match) => match.status === "finished").length;
                    return (
                      <div key={pool.name} className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
                        <div><div className="font-semibold">{pool.name}</div><div className="text-xs text-gray-500">{pool.players.length} spillere</div></div>
                        <div className="text-right text-sm"><div className="font-semibold">{poolFinished}/{poolMatches.length}</div><div className="text-xs text-gray-500">færdige</div></div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/klubaften/live" className="rounded-2xl border border-gray-800 bg-gray-900 p-6 hover:border-orange-500"><div className="text-2xl">🔴</div><div className="mt-2 text-lg font-bold">Live scoring</div><div className="mt-1 text-sm text-gray-500">Registrér resultater på banerne.</div></Link>
              <Link href="/klubaften/kampe" className="rounded-2xl border border-gray-800 bg-gray-900 p-6 hover:border-orange-500"><div className="text-2xl">🎯</div><div className="mt-2 text-lg font-bold">Kampoversigt</div><div className="mt-1 text-sm text-gray-500">Se næste kampe og alle boards.</div></Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5"><div className="text-sm text-gray-500">{title}</div><div className="mt-1 text-3xl font-bold tabular-nums">{value}</div></div>;
}
