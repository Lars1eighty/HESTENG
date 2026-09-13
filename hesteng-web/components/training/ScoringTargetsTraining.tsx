"use client";

import { useMemo, useState } from "react";

type Target = "T20" | "T19" | "Bull";

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

const targetValues: Record<Target, number> = {
  T20: 60,
  T19: 57,
  Bull: 50,
};

export default function ScoringTargetsTraining({ onComplete }: Props) {
  const [targetIndex, setTargetIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [stats, setStats] = useState<TargetStats[]>(
    TARGETS.map((target) => ({ target, hits: 0, attempts: 0, points: 0 })),
  );
  const [finished, setFinished] = useState(false);

  const currentTarget = TARGETS[targetIndex];
  const totalRounds = TARGETS.length * ROUNDS_PER_TARGET;
  const completedRounds = targetIndex * ROUNDS_PER_TARGET + round - 1;

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

  async function registerRound(hits: number) {
    if (finished || hits < 0 || hits > 3) return;

    const nextStats = stats.map((item, index) =>
      index === targetIndex
        ? {
            ...item,
            hits: item.hits + hits,
            attempts: item.attempts + DARTS_PER_ROUND,
            points: item.points + hits * targetValues[currentTarget],
          }
        : item,
    );

    setStats(nextStats);

    const isLastRound = round === ROUNDS_PER_TARGET;
    const isLastTarget = targetIndex === TARGETS.length - 1;

    if (isLastRound && isLastTarget) {
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
          targets: nextStats,
          roundsPerTarget: ROUNDS_PER_TARGET,
          dartsPerRound: DARTS_PER_ROUND,
        },
      });
      return;
    }

    if (isLastRound) {
      setTargetIndex((current) => current + 1);
      setRound(1);
    } else {
      setRound((current) => current + 1);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Scoring Targets</div>
          <h2 className="mt-2 text-4xl font-black text-white">{currentTarget}</h2>
          <p className="mt-2 text-sm font-semibold text-gray-400">
            10 runder på T20, derefter T19 og Bull. 3 pile pr. runde.
          </p>
        </div>
        <div className="rounded-2xl bg-gray-950 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">Runde</div>
          <div className="text-2xl font-black text-white">{completedRounds + 1} / {totalRounds}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {stats.map((item, index) => (
          <div
            key={item.target}
            className={`rounded-2xl border p-3 text-center ${index === targetIndex ? "border-orange-500 bg-orange-500/10" : "border-gray-800 bg-gray-950"}`}
          >
            <div className="text-sm font-black text-white">{item.target}</div>
            <div className="mt-1 text-xs text-gray-400">{item.hits} hits</div>
          </div>
        ))}
      </div>

      <div className="mt-7 text-center">
        <div className="text-sm font-bold text-gray-300">Hvor mange af de 3 pile ramte {currentTarget}?</div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((hits) => (
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
