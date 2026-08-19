"use client";

import { useMemo, useState } from "react";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getPlayerRegistry } from "@/lib/playerRegistry";

export default function PlayerSearch() {
  const [search, setSearch] = useState("");
  const { currentClubId } = useClub();
  const { selectedPlayers, setSelectedPlayers } = useKlubaften();
  const players = useMemo(() => getPlayerRegistry(currentClubId), [currentClubId]);
  const playerByName = useMemo(() => new Map(players.map((player) => [player.name, player])), [players]);

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return [];

    return players.filter(
      (player) =>
        player.name.toLowerCase().includes(search.toLowerCase()) &&
        !selectedPlayers.includes(player.name)
    );
  }, [players, search, selectedPlayers]);

  function addPlayer(player: string) {
    setSelectedPlayers([...selectedPlayers, player]);
    setSearch("");
  }

  function removePlayer(player: string) {
    setSelectedPlayers(selectedPlayers.filter((p) => p !== player));
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
      <h2 className="mb-6 text-2xl font-bold">Spillere</h2>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Søg spiller..."
        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
      />

      {filteredPlayers.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-700 bg-gray-800">
          {filteredPlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => addPlayer(player.name)}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-700"
            >
              <span>{player.name}</span>
              {player.requiresAccessibleBoard ? (
                <span className="shrink-0 rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-1 text-[0.65rem] font-black uppercase tracking-wide text-orange-300">
                  Handicapbane
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h3 className="mb-4 text-lg font-semibold">
          Valgte spillere ({selectedPlayers.length})
        </h3>

        {selectedPlayers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center text-gray-500">
            Ingen spillere valgt.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedPlayers.map((player) => {
              const profile = playerByName.get(player);

              return (
              <div
                key={player}
                className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate">{player}</div>
                  {profile?.requiresAccessibleBoard ? (
                    <span className="mt-1 inline-flex rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-orange-300">
                      Handicapbane
                    </span>
                  ) : null}
                </div>

                <button
                  onClick={() => removePlayer(player)}
                  className="rounded-lg px-3 py-1 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
