"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKlubaften } from "@/context/KlubaftenContext";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { calculatePoolStandings } from "@/lib/standingsEngine";
import { deleteCompletedMatches } from "@/lib/matchStore";
import { removeEloEventsAndRebuildRatings } from "@/lib/eloRatingEngine";

export default function AfslutKlubaftenPage() {
  const router = useRouter();
  const { pools, matches, setMatches, isFinished, finishKlubaften } = useKlubaften();
  const [abortStep, setAbortStep] = useState<"closed" | "choice" | "confirmDelete">("closed");
  const unfinished = matches.filter((match) => match.status !== "finished").length;
  const currentFinishedMatchIds = matches.filter((match) => match.status === "finished").map((match) => match.id);

  function abortAndKeepResults() {
    finishKlubaften();
    router.push("/");
  }

  function abortAndDeleteResults() {
    const ids = new Set(currentFinishedMatchIds);

    deleteCompletedMatches(currentFinishedMatchIds);
    removeEloEventsAndRebuildRatings(currentFinishedMatchIds);
    setMatches(matches.map((match) => {
      if (!ids.has(match.id)) return match;
      const { winner, loser, finishedAt, ...rest } = match;
      void winner;
      void loser;
      void finishedAt;
      return {
        ...rest,
        score1: 0,
        score2: 0,
        status: "pending",
      };
    }));
    finishKlubaften();
    router.push("/");
  }

  if (isFinished) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <div className="rounded-2xl border border-green-800 bg-green-950/30 p-10 text-center">
            <div className="text-5xl">🏁</div>
            <h1 className="mt-4 text-4xl font-bold">Klubaften afsluttet</h1>
            <p className="mt-3 text-gray-400">Resultaterne er låst for denne klubaften.</p>
            <Link href="/klubaften/stilling" className="mt-8 inline-block rounded-xl bg-orange-500 px-6 py-3 font-semibold hover:bg-orange-600">
              Se endelig stilling
            </Link>
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
        <h1 className="mb-2 text-4xl font-bold">🏁 Afslut klubaften</h1>
        <p className="mb-8 text-gray-400">Gennemgå resultaterne og afslut aftenen.</p>

        {unfinished > 0 && (
          <div className="mb-8 rounded-2xl border border-yellow-800 bg-yellow-950/30 p-6 text-yellow-300">
            Der mangler stadig {unfinished} kampe. Du kan afslutte alligevel, men de manglende kampe kommer ikke med i den endelige stilling.
          </div>
        )}

        <div className="mb-8 grid gap-6 md:grid-cols-2">
          {pools.map((pool) => {
            const standings = calculatePoolStandings(pool.name, pool.players, matches);
            return (
              <section key={pool.name} className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="mb-4 text-2xl font-bold">{pool.name}</h2>
                <div className="space-y-2">
                  {standings.map((standing, index) => (
                    <div key={standing.player} className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
                      <span><strong className="mr-3">{index + 1}.</strong>{standing.player}</span>
                      <span className="font-bold">{standing.points} point</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={finishKlubaften}
          className="w-full rounded-xl bg-red-600 py-4 text-lg font-bold hover:bg-red-700"
        >
          🏁 Afslut klubaften
        </button>

        <button
          type="button"
          onClick={() => setAbortStep("choice")}
          className="mt-4 w-full rounded-xl border border-red-800 bg-red-950/30 py-4 text-lg font-bold text-red-300 hover:bg-red-900/40"
        >
          Afbryd klubaften
        </button>

        {abortStep !== "closed" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
            <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-950 p-7 shadow-2xl">
              {abortStep === "choice" ? (
                <>
                  <h2 className="text-3xl font-bold">Vil du afbryde klubaftenen?</h2>
                  <p className="mt-3 text-gray-400">
                    Vælg om færdige resultater fra denne klubaften skal blive stående, eller om de skal fjernes og ELO genberegnes.
                  </p>
                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      onClick={abortAndKeepResults}
                      className="w-full rounded-xl border border-green-700 bg-green-500/10 px-5 py-4 text-left font-bold text-green-300 hover:bg-green-500/20"
                    >
                      AFBRYD OG BEHOLD RESULTATER
                      <span className="mt-1 block text-sm font-normal text-gray-400">
                        Færdige kampe, statistik, puljeresultater og ELO-events bevares.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbortStep("confirmDelete")}
                      className="w-full rounded-xl border border-red-700 bg-red-500/10 px-5 py-4 text-left font-bold text-red-300 hover:bg-red-500/20"
                    >
                      AFBRYD OG SLET AFTENENS RESULTATER
                      <span className="mt-1 block text-sm font-normal text-gray-400">
                        {currentFinishedMatchIds.length} færdige kampe fra denne klubaften fjernes.
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-red-300">Er du sikker?</h2>
                  <p className="mt-3 text-gray-300">
                    Kampresultater, statistik og ELO fra denne klubaften føres tilbage. Handlingen påvirker kun de færdige kampe i den aktuelle klubaften.
                  </p>
                  <button
                    type="button"
                    onClick={abortAndDeleteResults}
                    className="mt-6 w-full rounded-xl bg-red-600 px-5 py-4 font-bold text-white hover:bg-red-700"
                  >
                    Ja, slet aftenens resultater og afbryd
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setAbortStep("closed")}
                className="mt-4 w-full rounded-xl border border-gray-700 px-5 py-3 font-semibold text-gray-300 hover:bg-gray-800"
              >
                Annuller
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
