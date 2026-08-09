"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PlayerSearch from "@/components/PlayerSearch";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function SpillerePage() {
  const { selectedPlayers } = useKlubaften();

  const enabled = selectedPlayers.length >= 4;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-5xl p-10">
        <BackButton />

        <h1 className="mb-8 text-4xl font-bold">
          👥 Tilføj spillere
        </h1>

        <PlayerSearch />

        <Link
          href={enabled ? "/klubaften/puljer" : "#"}
          className={`mt-8 block w-full rounded-xl py-3 text-center text-lg font-semibold ${
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