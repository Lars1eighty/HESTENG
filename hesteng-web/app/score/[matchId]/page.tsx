"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { useKlubaften } from "@/context/KlubaftenContext";

export default function SharedScorePage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const router = useRouter();
  const { clubNights, setCurrentClubNightId } = useKlubaften();
  const clubNight = clubNights.find((night) => night.matches.some((match) => match.id === matchId)) ?? null;

  useEffect(() => {
    if (!clubNight) return;
    setCurrentClubNightId(clubNight.id);
    router.replace(`/klubaften/${clubNight.id}/kamp/${matchId}`);
  }, [clubNight, matchId, router, setCurrentClubNightId]);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-5xl p-6 md:p-10">
        <BackButton />
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
          <div className="text-sm font-semibold uppercase tracking-wide text-orange-400">Scorer-link</div>
          <h1 className="mt-2 text-3xl font-bold">Finder kampen…</h1>
          <p className="mt-2 text-gray-400">
            Henter den delte klubaften-state. Hvis kampen findes, åbnes scoreren automatisk.
          </p>
        </div>
      </section>
    </main>
  );
}
