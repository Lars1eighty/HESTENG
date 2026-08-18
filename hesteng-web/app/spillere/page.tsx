"use client";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { getPlayerElo } from "@/lib/eloRatingEngine";
import { getPlayerRegistry } from "@/lib/playerRegistry";

export default function SpillerePage() {
  const { currentClubId, currentClub } = useClub();
  const players = getPlayerRegistry(currentClubId)
    .map((player) => ({
      ...player,
      elo: getPlayerElo(player.name, currentClubId).elo,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <BackButton />

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">Spillere</h1>
            <p className="mt-2 text-base text-gray-400">{currentClub.name} · spillerregister</p>
          </div>
          <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
            {players.length} spillere
          </span>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3 border-b border-gray-800 bg-gray-950/60 px-4 py-2 text-[0.68rem] font-black uppercase tracking-wide text-gray-500">
            <div>Navn</div>
            <div className="text-right">Aktuel ELO</div>
          </div>

          <div className="divide-y divide-gray-800">
            {players.map((player) => (
              <div key={player.id} className="grid min-h-11 grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 px-4 py-2">
                <div className="min-w-0 truncate text-sm font-semibold text-white sm:text-base">{player.name}</div>
                <div className="text-right text-lg font-black tabular-nums text-orange-400">{player.elo}</div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
