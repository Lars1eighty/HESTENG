import Link from "next/link";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

export default function CompetitionPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <BackButton />

        <div className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-orange-400">HESTENG Competition</p>
          <h1 className="mt-2 text-4xl font-black sm:text-5xl">Opret turnering</h1>
          <p className="mt-3 max-w-2xl text-gray-400">
            Competition kan bruges både i en klub og privat. Vælg hvordan turneringen skal oprettes.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/klubaften"
            className="rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-orange-500"
          >
            <div className="text-xs font-black uppercase tracking-widest text-orange-400">Club</div>
            <h2 className="mt-2 text-2xl font-black">Klubturnering</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Brug klubbens spillere, baner og eksisterende HESTENG Club-flow.
            </p>
            <div className="mt-6 font-black text-orange-300">Fortsæt med klub →</div>
          </Link>

          <Link
            href="/competition/private"
            className="rounded-2xl border border-orange-500/40 bg-gray-900 p-6 transition hover:border-orange-500"
          >
            <div className="text-xs font-black uppercase tracking-widest text-orange-400">Private</div>
            <h2 className="mt-2 text-2xl font-black">Privat turnering</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Til venner, familie eller en spontan turnering. Ingen klub nødvendig.
            </p>
            <div className="mt-6 font-black text-orange-300">Opret privat turnering →</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
