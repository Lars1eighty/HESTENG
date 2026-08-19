"use client";

import { useState } from "react";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { getPlayerElo } from "@/lib/eloRatingEngine";
import { getPlayerRegistry, setPlayerAccessibleBoardNeed } from "@/lib/playerRegistry";

export default function SpillerePage() {
  const { currentClubId, currentClub } = useClub();
  const [, setRegistryVersion] = useState(0);
  const players = getPlayerRegistry(currentClubId)
    .map((player) => ({
      ...player,
      elo: getPlayerElo(player.name, currentClubId).elo,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const accessibleBoardCount = players.filter((player) => player.requiresAccessibleBoard).length;

  function toggleAccessibleBoard(playerId: string, currentValue: boolean) {
    setPlayerAccessibleBoardNeed(currentClubId, playerId, !currentValue);
    setRegistryVersion((version) => version + 1);
  }

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

        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-400">
          <span className="font-black text-orange-400">{accessibleBoardCount}</span> spillere markeret til handicapbane-prioritet.
          Bane 4 og 13 kan stadig bruges normalt.
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem_8rem] gap-3 border-b border-gray-800 bg-gray-950/60 px-4 py-2 text-[0.68rem] font-black uppercase tracking-wide text-gray-500">
            <div>Navn</div>
            <div className="text-right">Aktuel ELO</div>
            <div className="text-right">Bane-behov</div>
          </div>

          <div className="divide-y divide-gray-800">
            {players.map((player) => (
              <div key={player.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_7rem_8rem] items-center gap-3 px-4 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white sm:text-base">{player.name}</div>
                  {player.requiresAccessibleBoard ? (
                    <span className="mt-1 inline-flex rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-orange-300">
                      Handicapbane
                    </span>
                  ) : null}
                </div>
                <div className="text-right text-lg font-black tabular-nums text-orange-400">{player.elo}</div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-pressed={player.requiresAccessibleBoard}
                    onClick={() => toggleAccessibleBoard(player.id, !!player.requiresAccessibleBoard)}
                    className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                      player.requiresAccessibleBoard
                        ? "border-orange-500 bg-orange-500 text-gray-950"
                        : "border-gray-700 bg-gray-950 text-gray-400 hover:border-orange-500 hover:text-white"
                    }`}
                  >
                    {player.requiresAccessibleBoard ? "Til" : "Fra"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
