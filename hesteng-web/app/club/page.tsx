"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";

export default function ClubPage() {
  const router = useRouter();
  const { clubs, setCurrentClubId } = useClub();

  useEffect(() => {
    if (clubs.length === 1) {
      setCurrentClubId(clubs[0].id);
      router.replace("/dashboard");
    }
  }, [clubs, router, setCurrentClubId]);

  if (clubs.length === 1) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-4xl p-10 text-gray-400">Åbner klub…</section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-4xl p-10">
        <h2 className="text-4xl font-bold">Vælg klub</h2>
        <p className="mt-2 text-gray-400">Hvilken klub vil du åbne?</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {clubs.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => {
                setCurrentClubId(club.id);
                router.push("/dashboard");
              }}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-left transition hover:border-orange-500"
            >
              <div className="text-xl font-bold">{club.name}</div>
              <div className="mt-2 text-sm text-gray-500">Åbn klub →</div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
