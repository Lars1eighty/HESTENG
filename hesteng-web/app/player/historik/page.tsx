"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { getTrainingExercise } from "@/data/trainingExercises";
import {
  getTrainingResultsForPlayer,
  subscribeToTrainingResults,
  syncTrainingResultsFromSharedStore,
} from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDefinition, TrainingMetricValue, TrainingResult } from "@/lib/trainingTypes";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMetricValue(value: TrainingMetricValue | undefined, metric: TrainingMetricDefinition) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    return metric.valueType === "percent" ? `${formatted}%` : formatted;
  }

  return value;
}

function getVisibleMetrics(result: TrainingResult, exercise: TrainingExercise | null) {
  if (!exercise) {
    return Object.entries(result.metrics)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => ({ label: key, value: String(value) }));
  }

  return exercise.metrics
    .map((metric) => {
      const value = formatMetricValue(result.metrics[metric.key], metric);
      return value ? { label: metric.label, value } : null;
    })
    .filter((metric): metric is { label: string; value: string } => metric !== null);
}

export default function PlayerHistoryPage() {
  const currentUserContext = useOptionalCurrentUser();

  if (!currentUserContext) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Historik</div>
          <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Log ind for at se din historik</h1>
          <p className="mt-4 text-lg text-gray-300">Dine gemte træninger vises her, når din spillerprofil er aktiv.</p>
          <div className="mt-6">
            <Link href="/login" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
              Log ind
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <PlayerHistoryContent currentPlayerId={currentUserContext.currentPlayerId} playerName={currentUserContext.currentPlayer.name} />;
}

function PlayerHistoryContent({ currentPlayerId, playerName }: { currentPlayerId: string; playerName: string }) {
  const [results, setResults] = useState<TrainingResult[]>([]);

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

  const sortedResults = useMemo(
    () => [...results].filter((result) => result.playerId === currentPlayerId).sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [currentPlayerId, results]
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Historik</div>
            <h1 className="mt-2 text-4xl font-black tracking-normal sm:text-5xl">Min træningshistorik</h1>
            <p className="mt-3 text-lg text-gray-300">{playerName}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/player" className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-gray-300 transition hover:border-orange-500/70 hover:text-orange-300">
              Mit HESTENG
            </Link>
            <Link href="/traening" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
              Min træning
            </Link>
          </div>
        </div>

        {sortedResults.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center">
            <h2 className="text-2xl font-black">Ingen træninger gemt endnu.</h2>
            <div className="mt-5">
              <Link href="/traening" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black transition hover:bg-orange-400">
                Gå til træning
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {sortedResults.map((result) => {
              const exercise = getTrainingExercise(result.exerciseId);
              const metrics = getVisibleMetrics(result, exercise);

              return (
                <article key={result.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <time className="text-xs font-black uppercase tracking-wide text-gray-500" dateTime={result.completedAt}>
                        {formatDate(result.completedAt)}
                      </time>
                      <h2 className="mt-2 text-2xl font-black">{exercise?.name ?? result.exerciseId}</h2>
                      {result.variant ? (
                        <div className="mt-1 text-sm font-bold uppercase tracking-wide text-orange-300">{result.variant}</div>
                      ) : null}
                    </div>
                  </div>

                  {metrics.length > 0 ? (
                    <dl className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {metrics.map((metric) => (
                        <div key={metric.label} className="rounded-xl bg-gray-950 px-3 py-2">
                          <dt className="text-[0.65rem] font-black uppercase tracking-wide text-gray-500">{metric.label}</dt>
                          <dd className="mt-1 truncate font-bold text-gray-100" title={metric.value}>{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
