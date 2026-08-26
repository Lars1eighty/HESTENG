"use client";

import { use, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { useKlubaften } from "@/context/KlubaftenContext";
import type { ClubMatch } from "@/lib/matchEngine";

const PREFERRED_BOARD_STORAGE_KEY = "hesteng.preferredBoardNumber";
const PREFERRED_BOARD_CHANGE_EVENT = "hesteng.preferredBoardNumberChanged";

function readPreferredBoardNumber() {
  if (typeof window === "undefined") return null;
  const value = Number.parseInt(window.localStorage.getItem(PREFERRED_BOARD_STORAGE_KEY) ?? "", 10);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function writePreferredBoardNumber(board: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFERRED_BOARD_STORAGE_KEY, board.toString());
  window.dispatchEvent(new Event(PREFERRED_BOARD_CHANGE_EVENT));
}

function subscribePreferredBoardNumber(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PREFERRED_BOARD_STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(PREFERRED_BOARD_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PREFERRED_BOARD_CHANGE_EVENT, callback);
  };
}

function getBoardMatchHref(clubNightId: string, matchId: string) {
  return `/klubaften/${encodeURIComponent(clubNightId)}/kamp/${encodeURIComponent(matchId)}?returnTo=board`;
}

function sortBoardMatches(a: ClubMatch, b: ClubMatch) {
  return a.scheduleSlot - b.scheduleSlot ||
    a.order - b.order ||
    a.round - b.round ||
    a.id.localeCompare(b.id, undefined, { numeric: true });
}

export default function ClubNightBoardPage({ params }: { params: Promise<{ clubNightId: string }> }) {
  const { clubNightId } = use(params);
  const { clubNights, setCurrentClubNightId } = useKlubaften();
  const preferredBoardNumber = useSyncExternalStore(subscribePreferredBoardNumber, readPreferredBoardNumber, () => null);
  const [isChangingBoard, setIsChangingBoard] = useState(false);
  const clubNight = clubNights.find((item) => item.id === clubNightId) ?? null;
  const boardCount = clubNight?.boardCount ?? 13;
  const boardOptions = useMemo(() => Array.from({ length: boardCount }, (_, index) => index + 1), [boardCount]);
  const isBoardNumberInRange = preferredBoardNumber !== null && preferredBoardNumber >= 1 && preferredBoardNumber <= boardCount;
  const boardMatches = useMemo(() => {
    if (!clubNight || !isBoardNumberInRange) return [];
    return clubNight.matches
      .filter((match) => match.board === preferredBoardNumber)
      .sort(sortBoardMatches);
  }, [clubNight, isBoardNumberInRange, preferredBoardNumber]);
  const isBoardUsedInClubNight = boardMatches.length > 0;
  const hasScheduledMatches = (clubNight?.matches.length ?? 0) > 0;
  const isBoardValid = isBoardNumberInRange && (!hasScheduledMatches || isBoardUsedInClubNight);
  const liveMatches = boardMatches.filter((match) => match.status === "live");
  const liveMatch = liveMatches[0] ?? null;
  const nextMatch = liveMatch ?? boardMatches.find((match) => match.status === "pending") ?? null;
  const completedCount = boardMatches.filter((match) => match.status === "finished").length;

  useEffect(() => {
    setCurrentClubNightId(clubNightId);
  }, [clubNightId, setCurrentClubNightId]);

  function chooseBoard(board: number) {
    writePreferredBoardNumber(board);
    setIsChangingBoard(false);
  }

  if (!clubNight) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-5xl items-center justify-center p-6">
          <div className="w-full rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">Banevisning</p>
            <h1 className="mt-3 text-4xl font-black">Klubaftenen blev ikke fundet</h1>
            <Link href="/klubaften" className="mt-6 inline-flex rounded-full bg-orange-500 px-6 py-3 font-black text-black">
              Til klubaften
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const shouldChooseBoard = !isBoardValid || isChangingBoard;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col p-4 sm:p-6 lg:p-8">
        {shouldChooseBoard ? (
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-6 text-center">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">{clubNight.name}</p>
              <h1 className="mt-3 text-4xl font-black sm:text-6xl">Vælg denne enheds bane</h1>
              <p className="mt-3 text-base font-semibold text-gray-400">
                Valget gemmes på denne iPad/browser og bruges også næste klubaften.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {boardOptions.map((board) => (
                <button
                  key={board}
                  type="button"
                  onClick={() => chooseBoard(board)}
                  className="min-h-24 rounded-3xl border border-gray-800 bg-gray-900 p-5 text-3xl font-black transition hover:border-orange-400 hover:bg-orange-500 hover:text-black sm:min-h-28 sm:text-4xl"
                >
                  BANE {board}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4">
            <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-gray-800 bg-gray-900 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">{clubNight.name}</p>
                <h1 className="mt-2 text-5xl font-black tracking-tight sm:text-7xl">BANE {preferredBoardNumber}</h1>
                <p className="mt-2 text-sm font-semibold text-gray-400">
                  {completedCount}/{boardMatches.length} kampe færdige på banen
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  href={`/klubaften/${clubNight.id}`}
                  className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-300 hover:border-orange-400 hover:text-orange-200"
                >
                  Tilbage
                </Link>
                <button
                  type="button"
                  onClick={() => setIsChangingBoard(true)}
                  className="rounded-full border border-gray-700 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-gray-300 hover:border-orange-400 hover:text-orange-200"
                >
                  Skift bane
                </button>
              </div>
            </header>

            <section className="flex flex-1 items-stretch">
              {nextMatch ? (
                <div className="grid w-full gap-4 rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0 text-center lg:text-left">
                    <p className={`text-sm font-black uppercase tracking-[0.24em] ${nextMatch.status === "live" ? "text-green-300" : "text-orange-300"}`}>
                      {nextMatch.status === "live" ? "Aktuel kamp" : "Næste kamp"}
                    </p>
                    <div className="mt-6 grid gap-5">
                      <div className="truncate text-5xl font-black tracking-tight sm:text-7xl xl:text-8xl" title={nextMatch.player1}>
                        {nextMatch.player1}
                      </div>
                      <div className="text-3xl font-black text-orange-400 sm:text-5xl">VS</div>
                      <div className="truncate text-5xl font-black tracking-tight sm:text-7xl xl:text-8xl" title={nextMatch.player2}>
                        {nextMatch.player2}
                      </div>
                    </div>
                    <p className="mt-7 text-xl font-bold text-gray-400 sm:text-2xl">
                      {nextMatch.pool} · Runde {nextMatch.round}
                    </p>
                    {liveMatches.length > 1 && (
                      <p className="mt-4 rounded-2xl border border-red-800 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                        Der er flere aktive kampe på Bane {preferredBoardNumber}. Fortsæt den øverste aktive kamp og luk ikke en ny op.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link
                      href={getBoardMatchHref(clubNight.id, nextMatch.id)}
                      className={`flex min-h-24 items-center justify-center rounded-3xl px-8 py-6 text-center text-2xl font-black uppercase tracking-[0.12em] text-black transition sm:min-h-32 sm:text-3xl ${
                        nextMatch.status === "live" ? "bg-green-400 hover:bg-green-300" : "bg-orange-500 hover:bg-orange-400"
                      }`}
                    >
                      {nextMatch.status === "live" ? "Fortsæt kamp" : "Start kamp"}
                    </Link>
                    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 text-center text-sm font-bold text-gray-400">
                      Status: {nextMatch.status === "live" ? "I gang" : "Ikke startet"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center rounded-3xl border border-gray-800 bg-gray-900 p-8 text-center">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">Bane {preferredBoardNumber}</p>
                  <h2 className="mt-3 text-4xl font-black sm:text-6xl">Bane {preferredBoardNumber} er færdig for i aften</h2>
                  <p className="mt-4 max-w-2xl text-lg font-semibold text-gray-400">
                    Der er ingen live eller kommende kampe tildelt denne bane.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
