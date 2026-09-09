"use client";

import { use, useEffect } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import GuestAccessControl from "@/components/GuestAccessControl";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getCompletedMatchesForClubNightInClub } from "@/lib/matchStore";

export default function GuestAccessPage({ params }: { params: Promise<{ clubNightId: string }> }) {
  const { clubNightId } = use(params);
  const { currentClubId, clubNights, setCurrentClubNightId } = useKlubaften();
  const clubNight = clubNights.find((item) => item.id === clubNightId) ?? null;

  useEffect(() => {
    setCurrentClubNightId(clubNightId);
  }, [clubNightId, setCurrentClubNightId]);

  if (!clubNight) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-4xl p-6 sm:p-10">
          <BackButton />
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">Klubaftenen blev ikke fundet.</div>
        </section>
      </main>
    );
  }

  const matchIds = clubNight.matches.map((match) => match.id);
  const completedMatches = getCompletedMatchesForClubNightInClub(currentClubId, clubNight.id, matchIds);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-4xl p-6 sm:p-10">
        <BackButton />
        <div className="rounded-3xl border border-gray-800 bg-gray-900 p-6 sm:p-8">
          <div className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">Gæsteadgang</div>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{clubNight.name}</h1>
          <p className="mt-3 max-w-2xl text-gray-400">Ét link til aftenens turnering. Ingen spiller-login: find kampen og spil.</p>

          <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-300">Aftenens spillerlink</div>
            <GuestAccessControl clubNight={clubNight} completedMatches={completedMatches} />
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <InfoCard title="Puljer" value={clubNight.pools.length} />
            <InfoCard title="Kampe" value={clubNight.matches.length} />
            <InfoCard title="Færdige" value={completedMatches.length} />
          </div>

          <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-950 p-5 text-sm text-gray-400">
            Linket gælder kun denne klubaften. Når klubaftenen afsluttes, lukkes gæstescoring.
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/klubaften/${clubNight.id}`} className="rounded-xl border border-gray-700 px-4 py-3 font-bold text-gray-300 hover:border-orange-500 hover:text-orange-300">Tilbage til live-overblik</Link>
            <Link href={`/klubaften/${clubNight.id}/kampe`} className="rounded-xl bg-orange-500 px-4 py-3 font-black text-black hover:bg-orange-400">Se kampe</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, value }: { title: string; value: number }) {
  return <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5"><div className="text-xs font-black uppercase tracking-wide text-gray-500">{title}</div><div className="mt-1 text-3xl font-black text-white">{value}</div></div>;
}
