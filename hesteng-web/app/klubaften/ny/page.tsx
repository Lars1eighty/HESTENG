"use client";

import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useKlubaften } from "@/context/KlubaftenContext";
import { useClub } from "@/context/ClubContext";

export default function NyKlubaftenPage() {
  const router = useRouter();
  const { createClubNight } = useKlubaften();
  const { currentClubId, currentClub } = useClub();
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [boardCount, setBoardCount] = useState(1);
  const [clubBoardCount, setClubBoardCount] = useState<number | null>(null);
  const [clubHandicapBoards, setClubHandicapBoards] = useState<number[]>([]);
  const [handicapBoards, setHandicapBoards] = useState<number[]>([]);
  const [setupLoaded, setSetupLoaded] = useState(false);
  const [setupMissing, setSetupMissing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadClubSetup() {
      setSetupLoaded(false);
      setSetupError(null);

      try {
        const response = await fetch(`/api/clubs?clubId=${encodeURIComponent(currentClubId)}`);
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "Kunne ikke hente klubopsætningen.");
        }

        if (cancelled) return;

        const configuredBoardCount = Number.isInteger(body.club?.boardCount)
          ? Number(body.club.boardCount)
          : null;
        const configuredHandicapBoards: number[] = Array.isArray(body.club?.handicapBoards)
          ? body.club.handicapBoards.filter((board: unknown): board is number => Number.isInteger(board))
          : [];

        setClubBoardCount(configuredBoardCount);
        setClubHandicapBoards(configuredHandicapBoards);
        setSetupMissing(configuredBoardCount === null);

        if (configuredBoardCount !== null) {
          setBoardCount(configuredBoardCount);
          setHandicapBoards(configuredHandicapBoards.filter((board) => board <= configuredBoardCount));
        } else {
          setBoardCount(1);
          setHandicapBoards([]);
        }
      } catch (error) {
        if (!cancelled) {
          setSetupError(error instanceof Error ? error.message : "Kunne ikke hente klubopsætningen.");
        }
      } finally {
        if (!cancelled) setSetupLoaded(true);
      }
    }

    void loadClubSetup();

    return () => {
      cancelled = true;
    };
  }, [currentClubId]);

  const toggleHandicap = (board: number) => {
    setHandicapBoards((current) => (
      current.includes(board)
        ? current.filter((item) => item !== board)
        : [...current, board].sort((a, b) => a - b)
    ));
  };

  async function submitClubNight() {
    setSetupError(null);

    if (setupMissing) {
      const response = await fetch("/api/clubs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubId: currentClubId,
          boardCount,
          handicapBoards,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSetupError(typeof body.error === "string" ? body.error : "Klubopsætningen kunne ikke gemmes.");
        return;
      }

      setClubBoardCount(boardCount);
      setClubHandicapBoards(handicapBoards);
      setSetupMissing(false);
    }

    const clubNight = createClubNight({
      name: name.trim() || "Klubaften",
      date,
      boardCount,
      handicapBoards,
    });
    router.push(`/klubaften/${clubNight.id}/spillere`);
  }

  const availableHandicapBoards = setupMissing
    ? Array.from({ length: boardCount }, (_, index) => index + 1)
    : clubHandicapBoards.filter((board) => board <= boardCount);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-3xl p-10">
        <BackButton />

        <h1 className="mb-2 text-4xl font-bold">
          Ny klubaften
        </h1>
        <p className="mb-8 text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
          {currentClub.name}
        </p>

        <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-8">
          {!setupLoaded ? (
            <p className="text-sm text-gray-400">Henter klubopsætning...</p>
          ) : null}

          {setupMissing ? (
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4">
              <p className="font-bold text-orange-300">Klubbens baner er ikke sat op endnu</p>
              <p className="mt-1 text-sm text-gray-400">
                Angiv antal baner og eventuelle handicapbaner. Det gemmes som {currentClub.name}s klubopsætning.
              </p>
            </div>
          ) : null}

          {setupError ? (
            <p className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm font-semibold text-red-300">
              {setupError}
            </p>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Navn
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="F.eks. Klubaften d. 6. august"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Dato
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Antal baner {setupMissing ? "i klubben" : "i brug denne aften"}
            </label>

            <input
              type="number"
              min={1}
              max={setupMissing ? 50 : (clubBoardCount ?? 50)}
              value={boardCount}
              onChange={(event) => {
                const maximum = setupMissing ? 50 : (clubBoardCount ?? 50);
                const count = Math.max(1, Math.min(maximum, Number(event.target.value) || 1));
                setBoardCount(count);
                setHandicapBoards((current) => current.filter((board) => board <= count));
              }}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {availableHandicapBoards.length > 0 ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Handicapbaner
              </label>
              <p className="mb-3 text-sm text-gray-500">
                {setupMissing
                  ? "Vælg de baner i klubben, der er indrettet til handicapspillere."
                  : "Kun klubbens registrerede handicapbaner kan vælges."}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableHandicapBoards.map((board) => (
                  <label
                    key={board}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-4"
                  >
                    <input
                      type="checkbox"
                      checked={handicapBoards.includes(board)}
                      onChange={() => toggleHandicap(board)}
                      className="h-5 w-5 accent-orange-500"
                    />
                    <span className="font-semibold">Bane {board} — handicap</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            setupLoaded && !setupMissing ? (
              <p className="text-sm text-gray-500">Klubben har ingen registrerede handicapbaner.</p>
            ) : null
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Spilleform
            </label>

            <select className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 outline-none focus:border-orange-500">
              <option>501 Double Out</option>
              <option>501 Single Out</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void submitClubNight()}
            disabled={!setupLoaded}
            className="block w-full rounded-xl bg-orange-500 py-3 text-center text-lg font-semibold text-black hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Opret klubaften
          </button>
        </div>
      </section>
    </main>
  );
}
