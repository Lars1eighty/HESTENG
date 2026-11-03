"use client";

import Link from "next/link";
import { useState } from "react";
import Header from "@/components/Header";
import Practice501Training from "@/components/training/Practice501Training";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { PRACTICE_501_EXERCISE_ID } from "@/data/trainingExercises";
import { saveTrainingResultToSharedStore } from "@/lib/trainingResultStore";
import type { TrainingResult } from "@/lib/trainingTypes";
import type { summarize501 } from "@/lib/solo501Engine";

type Scorecard = ReturnType<typeof summarize501>;
type SaveStatus = "idle" | "saving" | "saved" | "local";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-white">{value}</p>
    </div>
  );
}

export default function Practice501Page() {
  const context = useOptionalCurrentUser();
  const [result, setResult] = useState<TrainingResult | null>(null);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  if (!context) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-3xl font-black">Log ind for at træne 501</h1>
          <Link href="/traening" className="mt-5 inline-block text-orange-400 underline">Til træning</Link>
        </section>
      </main>
    );
  }

  const { currentPlayerId, currentUser } = context;
  const clubId = currentUser.memberships[0]?.clubId;

  async function persistResult(record: TrainingResult) {
    setSaveStatus("saving");
    try {
      // The shared store preserves an offline copy. Check the server explicitly because
      // older store versions also return that copy on an unsuccessful POST.
      await saveTrainingResultToSharedStore(record);
      const response = await fetch(
        "/api/training-results?playerId=" + encodeURIComponent(record.playerId),
        { method: "GET", cache: "no-store" },
      );
      if (!response.ok) throw new Error("Kunne ikke kontrollere den gemte træning.");
      const data = await response.json() as { results?: TrainingResult[] };
      if (!Array.isArray(data.results) || !data.results.some((saved) => saved.id === record.id)) {
        throw new Error("Træningsresultatet er ikke bekræftet af serveren.");
      }
      setSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save solo 501 training result", error);
      setSaveStatus("local");
    }
  }

  function handleComplete(scorecard: Scorecard) {
    const legs = scorecard.details.targetLegs;
    const record: TrainingResult = {
      id: "training-" + PRACTICE_501_EXERCISE_ID + "-" + currentPlayerId + "-" + crypto.randomUUID(),
      clubId,
      playerId: currentPlayerId,
      exerciseId: PRACTICE_501_EXERCISE_ID,
      variant: "solo-" + legs + "-legs-v2",
      completedAt: new Date().toISOString(),
      metrics: scorecard.metrics,
      details: scorecard.details,
    };
    setResult(record);
    void persistResult(record);
  }

  const metrics = result?.metrics;
  const detail = result?.details as Scorecard["details"] | undefined;
  const legs = detail?.legs ?? [];
  const targetLegs = detail?.targetLegs ?? 1;

  return (
    <main className="min-h-screen bg-[#0b0e14] text-white">
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-6 sm:py-9">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-orange-400">HESTENG TRAINING</p>
            <h1 className="mt-1 text-3xl font-black">501 Training</h1>
          </div>
          <Link href="/traening" className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-bold text-gray-200">Øvelser</Link>
        </div>

        {!result ? (
          <Practice501Training key={sessionNumber} onComplete={handleComplete} />
        ) : (
          <div className="space-y-4">
            <section className="rounded-3xl border border-orange-500/30 bg-[#19212c] p-5 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-orange-400">Gennemført · {targetLegs} {targetLegs === 1 ? "leg" : "legs"}</p>
              <div className="mt-3 text-6xl font-black tabular-nums text-white">
                {typeof metrics?.threeDartAverage === "number" ? metrics.threeDartAverage.toFixed(1) : "—"}
              </div>
              <p className="mt-1 text-sm font-semibold text-gray-400">3-pils gennemsnit</p>
              {saveStatus === "saving" ? <p className="mt-4 text-sm font-semibold text-gray-300">Gemmer på serveren…</p> : null}
              {saveStatus === "saved" ? <p className="mt-4 text-sm font-semibold text-emerald-300">Resultatet er gemt på din spillerprofil.</p> : null}
              {saveStatus === "local" ? (
                <div className="mt-4 rounded-xl border border-amber-600 bg-amber-950/40 p-3">
                  <p className="text-sm font-semibold text-amber-200">Resultatet er ikke bekræftet på serveren. Prøv at gemme det igen, før du forlader siden.</p>
                  <button type="button" onClick={() => void persistResult(result)} className="mt-3 rounded-lg bg-amber-400 px-5 py-3 font-black text-gray-950">Prøv at gemme igen</button>
                </div>
              ) : null}
            </section>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Første 9" value={typeof metrics?.first9Average === "number" ? metrics.first9Average.toFixed(1) : "—"} />
              <Stat label="Pile i alt" value={typeof metrics?.darts === "number" ? metrics.darts : "—"} />
              <Stat label="Bedste leg" value={typeof metrics?.bestLegDarts === "number" ? metrics.bestLegDarts + " pile" : "—"} />
              <Stat label="Double %" value={typeof metrics?.checkoutPercent === "number" ? metrics.checkoutPercent.toFixed(1) + "%" : "—"} />
              <Stat label="Doubleforsøg" value={typeof metrics?.checkoutAttempts === "number" ? metrics.checkoutAttempts : "—"} />
              <Stat label="Højeste luk" value={typeof metrics?.highestCheckout === "number" ? metrics.highestCheckout : "—"} />
              <Stat label="100+ / 140+" value={String(metrics?.high100 ?? 0) + " / " + String(metrics?.high140 ?? 0)} />
              <Stat label="180'ere" value={typeof metrics?.oneEighties === "number" ? metrics.oneEighties : 0} />
              <Stat label="Busts" value={typeof metrics?.busts === "number" ? metrics.busts : 0} />
            </div>
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
              <h2 className="text-lg font-black">Dine legs</h2>
              <div className="mt-3 divide-y divide-gray-800">
                {legs.map((leg) => (
                  <div key={leg.leg} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-bold text-gray-200">Leg {leg.leg}</span>
                    <span className="text-gray-400">{leg.darts} pile · Luk {leg.checkout}</span>
                    <span className="font-black tabular-nums text-orange-300">{leg.average.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </section>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={saveStatus !== "saved"}
                onClick={() => { setResult(null); setSaveStatus("idle"); setSessionNumber((n) => n + 1); }}
                className="rounded-xl bg-orange-500 px-5 py-4 font-black text-gray-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Spil igen
              </button>
              <Link href="/traening/udvikling" className="rounded-xl border border-gray-700 px-5 py-4 text-center font-bold text-gray-200">Se udvikling</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
