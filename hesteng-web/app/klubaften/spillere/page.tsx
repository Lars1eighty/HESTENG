"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PlayerSearch from "@/components/PlayerSearch";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function SpillerePage() {
  const params = useParams<{ clubNightId?: string }>();
  const routeClubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;
  const { selectedPlayers, currentClubNightId, setCurrentClubNightId } = useKlubaften();
  const [mounted, setMounted] = useState(false);
  const clubNightId = routeClubNightId ?? currentClubNightId;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (routeClubNightId) setCurrentClubNightId(routeClubNightId);
  }, [routeClubNightId, setCurrentClubNightId]);

  const enabled = mounted && selectedPlayers.length >= 10;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-5xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">👥 Tilføj spillere</h1>

        <PlayerSearch />

        <p className="mt-4 text-sm text-gray-500">
          Vælg mindst 10 spillere for at kunne oprette puljerne.
        </p>

        <Link
          href={enabled && clubNightId ? `/klubaften/${clubNightId}/puljer` : "#"}
          className={`mt-4 block w-full rounded-xl py-3 text-center text-lg font-semibold ${
            enabled
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "pointer-events-none bg-gray-700 text-gray-400"
          }`}
        >
          Lav puljer
        </Link>
      </section>
    </main>
  );
}
