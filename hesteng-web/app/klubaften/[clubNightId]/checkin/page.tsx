"use client";

import { use, useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { normalizeName } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import type { ClubMatch } from "@/lib/matchEngine";

function playerHasMatch(player: string, matches: ClubMatch[]) {
  const playerKey = normalizeName(player);

  return matches.some((match) =>
    normalizeName(match.player1) === playerKey ||
    normalizeName(match.player2) === playerKey
  );
}

export default function ClubNightCheckInPage({ params }: { params: Promise<{ clubNightId: string }> }) {
  const { clubNightId } = use(params);
  const { currentClubId } = useClub();
  const { clubNights, setCurrentClubNightId, selectedPlayers, setSelectedPlayers, matches, updateClubNight } = useKlubaften();
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clubNight = clubNights.find((item) => item.id === clubNightId) ?? null;
  const checkInPlayers = clubNight?.selectedPlayers ?? selectedPlayers;
  const checkInMatches = clubNight?.matches ?? matches;
  const players = useMemo(() => getPlayerRegistry(currentClubId), [currentClubId]);
  const selectedKeys = new Set(checkInPlayers.map(normalizeName));
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return players.filter((player) => !query || player.name.toLowerCase().includes(query));
  }, [players, search]);

  useEffect(() => {
    setCurrentClubNightId(clubNightId);
  }, [clubNightId, setCurrentClubNightId]);

  function checkIn(player: string) {
    if (selectedKeys.has(normalizeName(player))) return;

    const nextPlayers = [...checkInPlayers, player];
    if (clubNight) {
      updateClubNight(clubNight.id, (current) => ({ ...current, selectedPlayers: nextPlayers }));
    } else {
      setSelectedPlayers(nextPlayers);
    }
    setMessage(`Velkommen, ${player} ✓`);
    setError(null);
    setSearch("");
  }

  function checkOut(player: string) {
    if (!selectedKeys.has(normalizeName(player))) return;

    if (!window.confirm(`Fjern ${player} fra klubaftenen?`)) return;

    if (playerHasMatch(player, checkInMatches)) {
      setError(`Kan ikke fjerne ${player}: spilleren har allerede genererede, live eller færdige kampe.`);
      setMessage(null);
      return;
    }

    const nextPlayers = checkInPlayers.filter((name) => normalizeName(name) !== normalizeName(player));
    if (clubNight) {
      updateClubNight(clubNight.id, (current) => ({ ...current, selectedPlayers: nextPlayers }));
    } else {
      setSelectedPlayers(nextPlayers);
    }
    setMessage(`${player} er fjernet fra klubaftenen.`);
    setError(null);
    setSearch("");
  }

  function togglePlayer(player: string) {
    if (selectedKeys.has(normalizeName(player))) {
      checkOut(player);
      return;
    }

    checkIn(player);
  }

  if (!clubNight) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center p-6">
          <div className="w-full rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">Check-in</p>
            <h1 className="mt-3 text-4xl font-black">Klubaftenen blev ikke fundet</h1>
            <Link href="/klubaften" className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 font-black text-black">
              Til klubaften
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <header className="rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">{clubNight.name}</p>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight sm:text-6xl">
                Tjek ind til klubaften
              </h1>
              <p className="mt-3 text-xl font-black text-gray-200">
                {checkInPlayers.length} spillere tjekket ind
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/klubaften/${clubNight.id}`}
                className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-300 hover:border-orange-400 hover:text-orange-200"
                >
                  Tilbage
                </Link>
              <Link
                href={`/klubaften/${clubNight.id}/spillere`}
                className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-300 hover:border-orange-400 hover:text-orange-200"
              >
                Admin
              </Link>
            </div>
          </div>

          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setMessage(null);
              setError(null);
            }}
            placeholder="Søg dit navn..."
            className="mt-6 min-h-16 w-full rounded-3xl border border-gray-700 bg-gray-950 px-5 text-2xl font-bold outline-none placeholder:text-gray-600 focus:border-orange-500"
            autoFocus
          />

          {message && (
            <div className="mt-4 rounded-2xl border border-green-700 bg-green-500/10 px-5 py-4 text-xl font-black text-green-200">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-red-800 bg-red-500/10 px-5 py-4 text-lg font-bold text-red-200">
              {error}
            </div>
          )}
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto rounded-3xl border border-gray-800 bg-gray-900 p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-2">
            {filteredPlayers.map((player) => {
              const checkedIn = selectedKeys.has(normalizeName(player.name));

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.name)}
                  className={`flex min-h-20 items-center justify-between gap-4 rounded-3xl border px-5 py-4 text-left transition ${
                    checkedIn
                      ? "border-green-500/70 bg-green-500/15 text-white"
                      : "border-gray-800 bg-gray-950 text-gray-100 hover:border-orange-400 hover:bg-orange-500/10"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-2xl font-black sm:text-3xl">{player.name}</span>
                    {player.requiresAccessibleBoard ? (
                      <span className="mt-2 inline-flex rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-orange-300">
                        Handicapbane
                      </span>
                    ) : null}
                  </span>
                  {checkedIn ? (
                    <span className="shrink-0 text-right text-sm font-black uppercase tracking-wide text-green-300 sm:text-base">
                      ✓ Tjekket ind
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-gray-700 px-3 py-2 text-xs font-black uppercase tracking-wide text-gray-400">
                      Tjek ind
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
