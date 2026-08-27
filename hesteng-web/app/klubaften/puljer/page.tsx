"use client";

import { useEffect } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useClub } from "@/context/ClubContext";
import { useKlubaften } from "@/context/KlubaftenContext";
import { DEFAULT_ELO, getEloRatings } from "@/lib/eloRatingEngine";
import { normalizeName } from "@/lib/playerIdentity";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { createClubNightPools } from "@/lib/thuPoolEngine";

export default function PuljerPage() {
  const params = useParams<{ clubNightId?: string }>();
  const routeClubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;
  const { currentClubId } = useClub();
  const { selectedPlayers, pools, setPools, currentClubNightId, setCurrentClubNightId } = useKlubaften();
  const clubNightId = routeClubNightId ?? currentClubNightId;
  const playerRegistry = getPlayerRegistry(currentClubId);
  const eloRatings = getEloRatings(currentClubId);

  useEffect(() => {
    if (routeClubNightId) setCurrentClubNightId(routeClubNightId);
  }, [routeClubNightId, setCurrentClubNightId]);

  useEffect(() => {
    if (selectedPlayers.length >= 10 && pools.length === 0) {
      setPools(createClubNightPools(selectedPlayers, currentClubId));
    }
  }, [currentClubId, pools.length, selectedPlayers, setPools]);

  function getPlayerInfo(playerName: string) {
    const profile = playerRegistry.find((player) => player.name === playerName);
    const rating = eloRatings.find((item) => (
      (profile?.id && item.playerId === profile.id) ||
      normalizeName(item.player) === normalizeName(playerName)
    ));

    return {
      elo: rating?.elo ?? DEFAULT_ELO,
      requiresAccessibleBoard: profile?.requiresAccessibleBoard ?? false,
    };
  }

  if (selectedPlayers.length < 10) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🏆 Puljer</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Vælg mindst <strong>10 spillere</strong> for at oprette puljer.
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
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🏆 Puljer</h1>
            <p className="mt-2 text-gray-400">
              {selectedPlayers.length} spillere fordelt i {pools.length} puljer.
            </p>
          </div>
          <div className="rounded-xl bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-400">
            ✓ Puljer oprettet
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <div key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold">{pool.name}</h2>
                <span className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300">
                  {pool.players.length} spillere
                </span>
              </div>
              <div className="space-y-2">
                {pool.players.map((player) => {
                  const playerInfo = getPlayerInfo(player);

                  return (
                    <div key={player} className="flex items-center justify-between gap-3 rounded-lg bg-gray-800 px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{player}</div>
                        {playerInfo.requiresAccessibleBoard ? (
                          <span className="mt-1 inline-flex rounded-full border border-orange-500/50 bg-orange-500/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-wide text-orange-300">
                            Handicapbane
                          </span>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right text-lg font-black tabular-nums text-orange-400">{playerInfo.elo}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <Link
          href={clubNightId ? `/klubaften/${clubNightId}/kampe` : "/klubaften/kampe"}
          className="mt-8 block w-full rounded-xl bg-orange-500 py-3 text-center text-lg font-semibold hover:bg-orange-600"
        >
          Generér kampe + tildel baner
        </Link>
      </section>
    </main>
  );
}
