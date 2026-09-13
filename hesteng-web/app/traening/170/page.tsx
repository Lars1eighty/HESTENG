"use client";

import Link from "next/link";
import { useState } from "react";

import Header from "@/components/Header";
import Checkout170Training from "@/components/training/Checkout170Training";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { CHECKOUT_170_EXERCISE_ID } from "@/data/trainingExercises";
import { saveTrainingResultToSharedStore } from "@/lib/trainingResultStore";
import type { TrainingResult } from "@/lib/trainingTypes";

export default function Checkout170Page() {
  const currentUserContext = useOptionalCurrentUser();
  const [savedResult, setSavedResult] = useState<TrainingResult | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!currentUserContext) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">170</div>
          <h1 className="mt-3 text-4xl font-black">Log ind for at træne</h1>
        </section>
      </main>
    );
  }

  const { currentPlayerId, currentUser } = currentUserContext;
  const trainingClubId = currentUser.memberships[0]?.clubId;

  async function handleComplete({ metrics, details }: { metrics: Record<string, number>; details: Record<string, unknown> }) {
    const result: TrainingResult = {
      id: `training-${CHECKOUT_170_EXERCISE_ID}-${currentPlayerId}-${Date.now()}`,
      clubId: trainingClubId,
      playerId: currentPlayerId,
      exerciseId: CHECKOUT_170_EXERCISE_ID,
      completedAt: new Date().toISOString(),
      metrics,
      details,
    };

    setSaving(true);
    setSaveError(null);

    try {
      await saveTrainingResultToSharedStore(result);
      setSavedResult(result);
    } catch (error) {
      console.error("Failed to save 170 training result", error);
      setSaveError("Resultatet kunne ikke gemmes. Genindlæs siden og prøv igen.");
    } finally {
      setSaving(false);
    }
  }

  function startNewSession() {
    setSavedResult(null);
    setSaveError(null);
    setSessionNumber((current) => current + 1);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">HESTENG Training</div>
            <h1 className="mt-1 text-3xl font-black sm:text-4xl">170</h1>
          </div>
          <Link href="/traening" className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-orange-400 hover:text-orange-300">
            Til træning
          </Link>
        </div>

        {savedResult ? (
          <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center sm:p-7">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Gennemført</div>
            <div className="mt-3 text-5xl font-black text-white">{savedResult.metrics.checkouts ?? 0} / 10</div>
            <div className="mt-1 text-sm text-gray-300">Lukkede 170</div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ResultStat label="Checkout %" value={formatPercent(savedResult.metrics.checkoutPercent)} />
              <ResultStat label="Bedste" value={formatDarts(savedResult.metrics.bestDarts)} />
              <ResultStat label="Snit pile" value={formatAverage(savedResult.metrics.averageDarts)} />
              <ResultStat label="Forsøg" value={savedResult.metrics.checkoutAttempts} />
            </div>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/player/historik" className="rounded-2xl bg-white px-5 py-3 font-bold text-gray-950 transition hover:bg-gray-200">
                Se historik
              </Link>
              <button type="button" onClick={startNewSession} className="rounded-2xl border border-white/20 px-5 py-3 font-bold text-white transition hover:bg-white/10">
                Træn 170 igen
              </button>
            </div>
          </section>
        ) : (
          <>
            <Checkout170Training key={sessionNumber} onComplete={handleComplete} />
            {saving ? <p className="mt-4 text-center text-sm text-gray-400">Gemmer resultat…</p> : null}
            {saveError ? <p className="mt-4 text-center text-sm font-semibold text-red-300">{saveError}</p> : null}
          </>
        )}
      </section>
    </main>
  );
}

function formatPercent(value: unknown) {
  return typeof value === "number" ? `${Math.round(value * 10) / 10}%` : "-";
}

function formatDarts(value: unknown) {
  return typeof value === "number" && value > 0 ? `${value} pile` : "-";
}

function formatAverage(value: unknown) {
  return typeof value === "number" && value > 0 ? Math.round(value * 100) / 100 : "-";
}

function ResultStat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-black text-white">
        {typeof value === "number" || typeof value === "string" ? value : "-"}
      </div>
    </div>
  );
}
