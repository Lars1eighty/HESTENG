"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { trainingExercises } from "@/data/trainingExercises";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import {
  getTrainingResultsForPlayer,
  subscribeToTrainingResults,
  syncTrainingResultsFromSharedStore,
} from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingResult } from "@/lib/trainingTypes";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatValue(value: number | string | boolean | null | undefined, suffix = "") {
  if (typeof value === "number") return `${Number(value.toFixed(2))}${suffix}`;
  if (typeof value === "string") return value;
  return "Ingen";
}

function getPrimaryMetric(exercise: TrainingExercise) {
  return exercise.metrics.find((metric) => metric.personalBest) ?? exercise.metrics[0] ?? null;
}

function getResultValue(result: TrainingResult | undefined, exercise: TrainingExercise) {
  const primaryMetric = getPrimaryMetric(exercise);
  if (!result || !primaryMetric) return "Ingen endnu";

  const suffix = primaryMetric.valueType === "percent" ? "%" : "";
  return `${primaryMetric.label}: ${formatValue(result.metrics[primaryMetric.key], suffix)}`;
}

function getLatestResult(results: TrainingResult[], exerciseId: string) {
  return results.find((result) => result.exerciseId === exerciseId);
}

export default function PlayerPage() {
  const currentUserContext = useOptionalCurrentUser();

  if (!currentUserContext) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Player</div>
          <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Log ind for at åbne dit HESTENG</h1>
          <p className="mt-4 text-lg text-gray-300">
            Player-området er klar til rigtig session og PlayerProfile. Lokal development bruger fortsat demo-spiller.
          </p>
          <div className="mt-6">
            <Link href="/login" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
              Log ind
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <PlayerPageContent currentUserContext={currentUserContext} />;
}

function PlayerPageContent({ currentUserContext }: { currentUserContext: NonNullable<ReturnType<typeof useOptionalCurrentUser>> }) {
  const { currentPlayer, currentPlayerId } = currentUserContext;
  const [results, setResults] = useState<TrainingResult[]>([]);
  const month = useMemo(() => currentMonthKey(), []);
  const activeExercises = trainingExercises.filter((exercise) => exercise.isActive);

  useEffect(() => {
    let cancelled = false;
    void syncTrainingResultsFromSharedStore(currentPlayerId).then((nextResults) => {
      if (!cancelled) setResults(nextResults);
    });

    const unsubscribe = subscribeToTrainingResults(() => {
      setResults(getTrainingResultsForPlayer(currentPlayerId));
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentPlayerId]);

  const totalThisMonth = useMemo(
    () => results.filter((result) => result.completedAt.startsWith(month)).length,
    [month, results]
  );
  const latestResult = results[0];
  const exerciseSummaries = activeExercises.map((exercise) => {
    const latest = getLatestResult(results, exercise.id);
    const primaryMetric = getPrimaryMetric(exercise);
    const variant = latest?.variant;
    const monthly = calculateTrainingMonthlyStats(results, exercise, {
      playerId: currentPlayerId,
      variant,
      month,
    });
    const primaryStats = primaryMetric
      ? monthly.metrics.find((metric) => metric.key === primaryMetric.key) ?? null
      : null;

    return {
      exercise,
      latest,
      primaryMetric,
      primaryStats,
      monthly,
    };
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Player</div>
            <h1 className="mt-2 text-4xl font-black tracking-normal sm:text-5xl">
              Mit HESTENG
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-gray-300">
              Træner som <span className="font-bold text-white">{currentPlayer.name}</span>. Herfra går du direkte til din egen træning, udvikling og historik.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/traening" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
                Åbn Min træning
              </Link>
              <Link href="/dashboard" className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-gray-300 transition hover:border-orange-500/70 hover:text-orange-300">
                Gå til Club
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div className="text-xs font-black uppercase tracking-wide text-gray-500">Personlig status</div>
            <dl className="mt-4 grid gap-3">
              <div className="rounded-xl bg-gray-950 p-4">
                <dt className="text-xs font-bold uppercase text-gray-500">Træninger denne måned</dt>
                <dd className="mt-1 text-3xl font-black text-orange-300">{totalThisMonth}</dd>
              </div>
              <div className="rounded-xl bg-gray-950 p-4">
                <dt className="text-xs font-bold uppercase text-gray-500">Seneste træning</dt>
                <dd className="mt-1 text-lg font-bold text-white">
                  {latestResult ? trainingExercises.find((exercise) => exercise.id === latestResult.exerciseId)?.name ?? latestResult.exerciseId : "Ingen endnu"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">Min træning</h2>
              <p className="mt-1 text-sm text-gray-400">Eksisterende træningsspil, PR og månedsstatistik ligger fortsat i den fælles Training-motor.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {exerciseSummaries.map(({ exercise, latest, primaryMetric, primaryStats, monthly }) => (
              <Link
                key={exercise.id}
                href="/traening"
                className="group rounded-2xl border border-gray-800 bg-gray-900 p-5 transition hover:border-orange-500/60 hover:bg-gray-900/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black group-hover:text-orange-300">{exercise.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{exercise.description}</p>
                  </div>
                  <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black uppercase text-orange-300">
                    Start
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <MetricBox label="Seneste" value={getResultValue(latest, exercise)} />
                  <MetricBox label="Denne måned" value={`${monthly.completedCount} træninger`} />
                  <MetricBox
                    label={primaryMetric?.personalBest === "lowerIsBetter" ? "Bedst" : "PR"}
                    value={primaryStats?.currentBest === null || primaryStats?.currentBest === undefined
                      ? "Ingen"
                      : formatValue(primaryStats.currentBest, primaryMetric?.valueType === "percent" ? "%" : "")}
                  />
                  <MetricBox
                    label="Månedssnit"
                    value={primaryStats?.currentAverage === null || primaryStats?.currentAverage === undefined
                      ? "Ingen"
                      : formatValue(primaryStats.currentAverage, primaryMetric?.valueType === "percent" ? "%" : "")}
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-950 px-3 py-2">
      <div className="text-[0.65rem] font-black uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 truncate font-bold text-gray-100" title={value}>{value}</div>
    </div>
  );
}
