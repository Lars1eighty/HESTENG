"use client";

import { useMemo, useState } from "react";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getSelectablePlayerNames } from "@/lib/playerRegistry";

export default function PlayerSearch() {
  const [search, setSearch] = useState("");
  const { currentClubId } = useClub();
  const { selectedPlayers, setSelectedPlayers } = useKlubaften();
  const players = useMemo(() => getSelectablePlayerNames(currentClubId), [currentClubId]);

  const filteredPlayers = useMemo(() => {
    if (!search.trim()) return [];

    return players.filter(
      (player) =>
        player.toLowerCase().includes(search.toLowerCase()) &&
        !selectedPlayers.includes(player)
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
              key={player}
              onClick={() => addPlayer(player)}
              className="block w-full px-4 py-3 text-left hover:bg-gray-700"
            >
              {player}
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
            {selectedPlayers.map((player) => (
              <div
                key={player}
                className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3"
              >
                <span>{player}</span>

                <button
                  onClick={() => removePlayer(player)}
                  className="rounded-lg px-3 py-1 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
