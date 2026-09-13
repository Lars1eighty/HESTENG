"use client";

import { useMemo, useState } from "react";

type Target = "T20" | "T19" | "Bull";
type Mode = "mixed-90" | "hundred-darts";

type TargetStats = {
  target: Target;
  hits: number;
  attempts: number;
  points: number;
};

type Props = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void | Promise<void>;
};

const TARGETS: Target[] = ["T20", "T19", "Bull"];
const ROUNDS_PER_TARGET = 10;
const DARTS_PER_ROUND = 3;
const HUNDRED_DARTS = 100;

const targetValues: Record<Target, number> = {
  T20: 60,
  T19: 57,
  Bull: 50,
};

function emptyStats(): TargetStats[] {
  return TARGETS.map((target) => ({ target, hits: 0, attempts: 0, points: 0 }));
}

export default function ScoringTargetsTraining({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>("mixed-90");
  const [hundredTarget, setHundredTarget] = useState<Target>("T20");
  const [started, setStarted] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [stats, setStats] = useState<TargetStats[]>(emptyStats);
  const [finished, setFinished] = useState(false);

  const totals = useMemo(
    () =>
      stats.reduce(
        (sum, item) => ({
          hits: sum.hits + item.hits,
          attempts: sum.attempts + item.attempts,
          points: sum.points + item.points,
        }),
        { hits: 0, attempts: 0, points: 0 },
      ),
    [stats],
  );

  const currentTarget = mode === "hundred-darts" ? hundredTarget : TARGETS[targetIndex];
  const totalRounds = TARGETS.length * ROUNDS_PER_TARGET;
  const completedRounds = targetIndex * ROUNDS_PER_TARGET + round - 1;
  const dartsLeft = HUNDRED_DARTS - totals.attempts;
  const dartsThisVisit = mode === "hundred-darts" ? Math.min(DARTS_PER_ROUND, dartsLeft) : DARTS_PER_ROUND;

  function startSession() {
    setStats(emptyStats());
    setTargetIndex(0);
    setRound(1);
    setFinished(false);
    setStarted(true);
  }

  async function complete(nextStats: TargetStats[]) {
    setFinished(true);
    const finalTotals = nextStats.reduce(
      (sum, item) => ({
        hits: sum.hits + item.hits,
        attempts: sum.attempts + item.attempts,
        points: sum.points + item.points,
      }),
      { hits: 0, attempts: 0, points: 0 },
    );
    const hitPercent = finalTotals.attempts > 0 ? (finalTotals.hits / finalTotals.attempts) * 100 : 0;

    await onComplete({
      metrics: {
        score: finalTotals.points,
        hits: finalTotals.hits,
        attempts: finalTotals.attempts,
        hitPercent,
        t20Hits: nextStats[0].hits,
        t19Hits: nextStats[1].hits,
        bullHits: nextStats[2].hits,
      },
      details: {
        mode,
        selectedTarget: mode === "hundred-darts" ? hundredTarget : null,
        targets: nextStats,
        roundsPerTarget: mode === "mixed-90" ? ROUNDS_PER_TARGET : null,
        dartsPerRound: DARTS_PER_ROUND,
        totalDarts: finalTotals.attempts,
      },
    });
  }

  async function registerRound(hits: number) {
    if (!started || finished || hits < 0 || hits > dartsThisVisit) return;

    const activeIndex = TARGETS.indexOf(currentTarget);
    const nextStats = stats.map((item, index) =>
      index === activeIndex
        ? {
            ...item,
            hits: item.hits + hits,
            attempts: item.attempts + dartsThisVisit,
            points: item.points + hits * targetValues[currentTarget],
          }
        : item,
    );

    setStats(nextStats);

    if (mode === "hundred-darts") {
      if (totals.attempts + dartsThisVisit >= HUNDRED_DARTS) {
        await complete(nextStats);
      }
      return;
    }

    const isLastRound = round === ROUNDS_PER_TARGET;
    const isLastTarget = targetIndex === TARGETS.length - 1;

    if (isLastRound && isLastTarget) {
      await complete(nextStats);
      return;
    }

    if (isLastRound) {
      setTargetIndex((current) => current + 1);
      setRound(1);
    } else {
      setRound((current) => current + 1);
    }
  }

  if (!started) {
    return (
      <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Scoring Targets</div>
        <h2 className="mt-2 text-3xl font-black text-white">Vælg træning</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("mixed-90")}
            className={`rounded-2xl border p-4 text-left transition ${mode === "mixed-90" ? "border-orange-500 bg-orange-500/10" : "border-gray-700 bg-gray-950"}`}
          >
            <div className="font-black text-white">T20 + T19 + Bull</div>
            <div className="mt-1 text-sm text-gray-400">10 runder på hver · 90 pile</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("hundred-darts")}
            className={`rounded-2xl border p-4 text-left transition ${mode === "hundred-darts" ? "border-orange-500 bg-orange-500/10" : "border-gray-700 bg-gray-950"}`}
          >
            <div className="font-black text-white">100 pile</div>
            <div className="mt-1 text-sm text-gray-400">100 pile på ét valgt scoring-target</div>
          </button>
        </div>

        {mode === "hundred-darts" ? (
          <div className="mt-5">
            <div className="text-sm font-bold text-gray-300">Vælg target</div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {TARGETS.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setHundredTarget(target)}
                  className={`rounded-2xl border px-4 py-4 font-black transition ${hundredTarget === target ? "border-orange-500 bg-orange-500 text-gray-950" : "border-gray-700 bg-gray-950 text-white"}`}
                >
                  {target}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={startSession}
          className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 font-black uppercase tracking-wide text-gray-950 transition hover:bg-orange-400"
        >
          Start træning
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Scoring Targets</div>
          <h2 className="mt-2 text-4xl font-black text-white">{currentTarget}</h2>
          <p className="mt-2 text-sm font-semibold text-gray-400">
            {mode === "hundred-darts"
              ? `100 pile på ${hundredTarget}. Registrér hits efter hver visit.`
              : "10 runder på T20, derefter T19 og Bull. 3 pile pr. runde."}
          </p>
        </div>
        <div className="rounded-2xl bg-gray-950 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">{mode === "hundred-darts" ? "Pile" : "Runde"}</div>
          <div className="text-2xl font-black text-white">
            {mode === "hundred-darts" ? `${totals.attempts} / ${HUNDRED_DARTS}` : `${completedRounds + 1} / ${totalRounds}`}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((item) => (
          <div
            key={item.target}
            className={`rounded-2xl border p-3 text-center ${item.target === currentTarget ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-950"}`}
          >
            <div className="text-sm font-black text-white">{item.target}</div>
            <div className="mt-1 text-xs text-gray-400">{item.hits} hits</div>
          </div>
        ))}
      </div>

      <div className="mt-7 text-center">
        <div className="text-sm font-bold text-gray-300">
          Hvor mange af de {dartsThisVisit} {dartsThisVisit === 1 ? "pil" : "pile"} ramte {currentTarget}?
        </div>
        <div className={`mt-4 grid gap-3 ${dartsThisVisit === 1 ? "grid-cols-2" : "grid-cols-4"}`}>
          {Array.from({ length: dartsThisVisit + 1 }, (_, hits) => hits).map((hits) => (
            <button
              key={hits}
              type="button"
              disabled={finished}
              onClick={() => void registerRound(hits)}
              className="rounded-2xl border border-gray-700 bg-gray-950 px-3 py-5 text-2xl font-black text-white transition hover:border-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
            >
              {hits}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-3 border-t border-gray-800 pt-5 text-center">
        <Stat label="Hits" value={totals.hits} />
        <Stat label="Pile" value={totals.attempts} />
        <Stat label="Point" value={totals.points} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}
