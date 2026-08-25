"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import {
  calculateLiveActiveRows,
  getLatestLiveActiveSnapshotFromStorageValue,
  getLiveActiveSnapshotStorageValue,
  subscribeLiveActiveSnapshots,
} from "@/lib/liveActiveEngine";
import { normalizeName } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";

export default function PlayerSearch() {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [draftPlayers, setDraftPlayers] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { currentClubId } = useClub();
  const { clubNights, currentClubNightId, selectedPlayers, setSelectedPlayers, matches } = useKlubaften();
  const players = useMemo(() => getPlayerRegistry(currentClubId), [currentClubId]);
  const playerByName = useMemo(() => new Map(players.map((player) => [normalizeName(player.name), player])), [players]);
  const liveActiveSnapshotStore = useSyncExternalStore(
    subscribeLiveActiveSnapshots,
    getLiveActiveSnapshotStorageValue,
    () => "[]"
  );
  const liveActiveSnapshot = useMemo(
    () => getLatestLiveActiveSnapshotFromStorageValue(currentClubId, liveActiveSnapshotStore),
    [currentClubId, liveActiveSnapshotStore]
  );
  const liveActiveRows = useMemo(
    () => calculateLiveActiveRows(clubNights, currentClubId, liveActiveSnapshot, currentClubNightId ?? undefined),
    [clubNights, currentClubId, currentClubNightId, liveActiveSnapshot]
  );
  const draftPlayerKeys = useMemo(() => new Set(draftPlayers.map(normalizeName)), [draftPlayers]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return players.filter((player) => !query || player.name.toLowerCase().includes(query));
  }, [players, search]);

  function openPlayerSelector() {
    setDraftPlayers(selectedPlayers);
    setSearch("");
    setSaveError(null);
    setIsOpen(true);
  }

  function toggleDraftPlayer(player: string) {
    const playerKey = normalizeName(player);

    setDraftPlayers((current) => {
      if (current.some((name) => normalizeName(name) === playerKey)) {
        return current.filter((name) => normalizeName(name) !== playerKey);
      }

      return [...current, player];
    });
    setSaveError(null);
  }

  function selectLiveActive() {
    const registryNames = new Map(players.map((player) => [normalizeName(player.name), player.name]));
    const next = new Map(draftPlayers.map((player) => [normalizeName(player), player]));

    liveActiveRows.forEach((row) => {
      const playerName = row.playerName ?? row.player;
      const canonicalName = registryNames.get(normalizeName(playerName)) ?? playerName;
      next.set(normalizeName(canonicalName), canonicalName);
    });

    setDraftPlayers([...next.values()]);
    setSearch("");
    setSaveError(null);
  }

  function clearDraft() {
    setDraftPlayers([]);
    setSaveError(null);
  }

  function savePlayers() {
    const draftKeys = new Set(draftPlayers.map(normalizeName));
    const removedPlayersWithMatches = selectedPlayers.filter((player) => {
      if (draftKeys.has(normalizeName(player))) return false;
      return matches.some((match) => (
        normalizeName(match.player1) === normalizeName(player) ||
        normalizeName(match.player2) === normalizeName(player)
      ));
    });

    if (removedPlayersWithMatches.length > 0) {
      setSaveError(`Kan ikke fjerne ${removedPlayersWithMatches.join(", ")}: spilleren har allerede genererede, live eller færdige kampe.`);
      return;
    }

    setSelectedPlayers(draftPlayers);
    setIsOpen(false);
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Spillere</h2>
          <p className="mt-1 text-sm text-gray-400">{selectedPlayers.length} spillere valgt til klubaftenen</p>
        </div>
        <button
          type="button"
          onClick={openPlayerSelector}
          className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-orange-400"
        >
          Tilføj spillere
        </button>
      </div>

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
              const profile = playerByName.get(normalizeName(player));

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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-6">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black">
            <div className="border-b border-gray-800 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">Klubaften</p>
                  <h2 className="mt-1 text-2xl font-black sm:text-3xl">Tilføj spillere</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 hover:border-orange-400 hover:text-orange-200"
                >
                  Annuller
                </button>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Søg spiller..."
                className="mt-4 min-h-12 w-full rounded-2xl border border-gray-700 bg-gray-900 px-4 py-3 text-base outline-none focus:border-orange-500"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectLiveActive}
                  className="rounded-full border border-green-500/50 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-200 hover:bg-green-500/20"
                >
                  Vælg Live Aktiv
                </button>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-300 hover:border-red-400 hover:text-red-200"
                >
                  Ryd valg
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredPlayers.map((player) => {
                  const checked = draftPlayerKeys.has(normalizeName(player.name));

                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => toggleDraftPlayer(player.name)}
                      className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        checked
                          ? "border-orange-400 bg-orange-500/15 text-white"
                          : "border-gray-800 bg-gray-900 text-gray-200 hover:border-gray-600"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        tabIndex={-1}
                        className="h-5 w-5 shrink-0 accent-orange-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{player.name}</span>
                        {player.requiresAccessibleBoard ? (
                          <span className="mt-1 inline-flex rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-orange-300">
                            Handicapbane
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-800 bg-gray-950 p-4 sm:p-5">
              {saveError && (
                <div className="mb-3 rounded-2xl border border-red-800 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                  {saveError}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-black text-white">{draftPlayers.length} spillere valgt</div>
                <button
                  type="button"
                  onClick={savePlayers}
                  className="min-h-12 rounded-2xl bg-green-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-green-400"
                >
                  Gem spillere
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
