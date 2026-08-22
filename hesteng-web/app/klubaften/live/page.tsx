"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useKlubaften } from "@/context/KlubaftenContext";
import { getClubNightMatchHref } from "@/lib/clubNightRoutes";
import { getNextMatchesByBoard } from "@/lib/liveEngine";

export default function LivePage() {
  const params = useParams<{ clubNightId?: string }>();
  const routeClubNightId = typeof params.clubNightId === "string" ? params.clubNightId : null;
  const { matches, currentClubNightId, setCurrentClubNightId } = useKlubaften();
  const clubNightId = routeClubNightId ?? currentClubNightId;

  useEffect(() => {
    if (routeClubNightId) setCurrentClubNightId(routeClubNightId);
  }, [routeClubNightId, setCurrentClubNightId]);
  const nextMatches = getNextMatchesByBoard(matches);
  const finishedCount = matches.filter((match) => match.status === "finished").length;

  if (matches.length === 0) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-5xl p-10">
          <BackButton />
          <h1 className="mb-8 text-4xl font-bold">🔴 Live scoring</h1>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-400">
            Opret først puljer og kampe.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl p-10">
        <BackButton />

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">🔴 Live scoring</h1>
            <p className="mt-2 text-gray-400">
              {finishedCount} færdige · {nextMatches.length} aktive baner
            </p>
          </div>
          <Link href={clubNightId ? `/klubaften/${clubNightId}/kampe` : "/klubaften/kampe"} className="rounded-xl border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800">
            Kampoversigt
          </Link>
        </div>

        <div className="mb-8 rounded-2xl border border-orange-800 bg-orange-500/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wide text-orange-400">
            Næste kampe på banerne
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Tryk på en kamp for at åbne den rigtige scoringsskærm.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nextMatches.map((match) => (
            <Link
              key={match.id}
              href={getClubNightMatchHref(match.id, clubNightId)}
              className="group block rounded-2xl border border-gray-800 bg-gray-900 p-6 transition hover:border-orange-500 hover:bg-gray-800"
            >
              <div className="mb-5 flex items-center justify-between text-sm text-gray-500">
                <span>{match.pool} · Runde {match.round}</span>
                <span className="rounded-full bg-gray-800 px-3 py-1">Bane {match.board}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
                  <span className="font-semibold">{match.player1}</span>
                  <span className="text-2xl font-bold tabular-nums">{match.score1}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gray-800 p-4">
                  <span className="font-semibold">{match.player2}</span>
                  <span className="text-2xl font-bold tabular-nums">{match.score2}</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-orange-700/70 bg-orange-500/10 px-4 py-3 text-center font-semibold text-orange-400 group-hover:bg-orange-500 group-hover:text-white">
                Åbn scoring →
              </div>
            </Link>
          ))}
        </div>

        {nextMatches.length === 0 && (
          <div className="rounded-2xl border border-green-800 bg-green-500/10 p-8 text-center text-green-400">
            Alle kampe er afsluttet. Klubaften er færdig.
          </div>
        )}
      </section>
    </main>
  );
}
