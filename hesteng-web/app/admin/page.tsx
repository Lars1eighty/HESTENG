"use client";

import Link from "next/link";
import { useState } from "react";
import { useClub } from "@/context/ClubContext";
import { resetTestDataToBaseline, type ResetTestDataResult } from "@/lib/testDataReset";

export default function AdminPage() {
  const { currentClub } = useClub();
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ResetTestDataResult | null>(null);

  async function handleResetTestData() {
    setMessage(null);
    setLastResult(null);

    if (!window.confirm("Reset testdata?")) return;
    if (!window.confirm("Er du sikker? Alle HESTENG-testkampe og testresultater slettes.")) return;

    setIsResetting(true);
    try {
      const result = await resetTestDataToBaseline(currentClub.id);
      setLastResult(result);
      setMessage("Testdata nulstillet til baseline.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset testdata fejlede.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-5 py-8 text-neutral-100 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-300">Dev / admin</p>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">Administration</h1>
            <p className="mt-2 text-sm text-neutral-400">{currentClub.name}</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-neutral-200 transition hover:border-orange-300 hover:text-orange-200"
          >
            Til forsiden
          </Link>
        </header>

        <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">Destruktiv handling</p>
              <h2 className="mt-2 text-xl font-black uppercase">Reset testdata</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-300">
                Fjerner HESTENG-testklubaftner, kampresultater, ELO-events fra testkampe og Live Aktiv-snapshots efter baseline.
                Seed-data, officielle spillere og historiske ranglister bevares.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetTestData}
              disabled={isResetting}
              className="min-h-12 rounded-full bg-red-500 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResetting ? "Nulstiller..." : "Reset testdata"}
            </button>
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-bold text-neutral-100">
              {message}
            </p>
          )}

          {lastResult && (
            <dl className="mt-4 grid gap-3 text-sm text-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Shared klubaftner</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.removedSharedClubNights}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Shared resultater</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.removedSharedCompletedMatches}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">ELO seed-ratings</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.restoredEloRatings}</dd>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-neutral-500">Live Aktiv baseline</dt>
                <dd className="mt-1 text-xl font-black text-neutral-100">{lastResult.restoredLiveActiveSnapshot ? "OK" : "-"}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}
