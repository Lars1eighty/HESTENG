"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import { trainingExercises } from "@/data/trainingExercises";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import { getTrainingResultsForPlayer, subscribeToTrainingResults, syncTrainingResultsFromSharedStore } from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDefinition, TrainingMetricValue, TrainingResult } from "@/lib/trainingTypes";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("da-DK", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}

function getPrimaryMetric(exercise: TrainingExercise) {
  return exercise.metrics.find((metric) => metric.personalBest) ?? exercise.metrics[0] ?? null;
}

function formatMetricValue(value: TrainingMetricValue | undefined, metric: TrainingMetricDefinition | null) {
  if (value === undefined || value === null || value === "") return "Ingen";
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    return metric?.valueType === "percent" ? `${formatted}%` : formatted;
  }
  return value;
}

function formatNumberValue(value: number | null | undefined, metric: TrainingMetricDefinition | null) {
  if (value === null || value === undefined) return "Ingen";
  const formatted = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return metric?.valueType === "percent" ? `${formatted}%` : formatted;
}

function formatChange(value: number | null | undefined, metric: TrainingMetricDefinition | null) {
  if (value === null || value === undefined) return "Ikke nok data";
  if (value === 0) return "Uændret";
  const formatted = Number.isInteger(value) ? String(Math.abs(value)) : String(Number(Math.abs(value).toFixed(2)));
  return `${value > 0 ? "+" : "-"}${formatted}${metric?.valueType === "percent" ? "%" : ""}`;
}

function monthResults(results: TrainingResult[], exerciseId: string, month: string) {
  return results.filter((result) => result.exerciseId === exerciseId && result.completedAt.slice(0, 7) === month);
}

function getLatestResult(results: TrainingResult[]) {
  return [...results].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
}

export default function PlayerDevelopmentPage() {
  const currentUserContext = useOptionalCurrentUser();

  if (!currentUserContext) {
    return <main className="min-h-screen bg-gray-950 text-white"><Header /><section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8"><div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Udvikling</div><h1 className="mt-3 text-4xl font-black sm:text-5xl">Log ind for at se din udvikling</h1><p className="mt-4 text-lg text-gray-300">Dine træningsresultater vises her, når din spillerprofil er aktiv.</p><div className="mt-6"><Link href="/login" className="inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black">Log ind</Link></div></section></main>;
  }

  return <PlayerDevelopmentContent currentPlayerId={currentUserContext.currentPlayerId} playerName={currentUserContext.currentPlayer.name} />;
}

function PlayerDevelopmentContent({ currentPlayerId, playerName }: { currentPlayerId: string; playerName: string }) {
  const [results, setResults] = useState<TrainingResult[]>([]);
  const [resultsLoaded, setResultsLoaded] = useState(false);
  const [month, setMonth] = useState(currentMonthKey);
  const currentMonth = useMemo(() => currentMonthKey(), []);

  useEffect(() => {
    let cancelled = false;
    setResultsLoaded(false);
    void syncTrainingResultsFromSharedStore(currentPlayerId).then((nextResults) => {
      if (!cancelled) {
        setResults(nextResults);
        setResultsLoaded(true);
      }
    });
    const unsubscribe = subscribeToTrainingResults(() => setResults(getTrainingResultsForPlayer(currentPlayerId)));
    return () => { cancelled = true; unsubscribe(); };
  }, [currentPlayerId]);

  const playerResults = useMemo(() => results.filter((result) => result.playerId === currentPlayerId), [currentPlayerId, results]);
  const summaries = useMemo(() => trainingExercises.filter((exercise) => exercise.isActive).map((exercise) => {
    const selectedResults = monthResults(playerResults, exercise.id, month);
    if (selectedResults.length === 0) return null;
    const latest = getLatestResult(selectedResults);
    const primaryMetric = getPrimaryMetric(exercise);
    const monthly = calculateTrainingMonthlyStats(playerResults, exercise, { playerId: currentPlayerId, variant: latest?.variant, month });
    const primaryStats = primaryMetric ? monthly.metrics.find((metric) => metric.key === primaryMetric.key) ?? null : null;
    return { exercise, latest, primaryMetric, monthly, primaryStats };
  }).filter((summary): summary is NonNullable<typeof summary> => summary !== null), [currentPlayerId, month, playerResults]);

  const canGoNext = month < currentMonth;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Udvikling</div><h1 className="mt-2 text-4xl font-black sm:text-5xl">Udvikling over tid</h1><p className="mt-3 text-lg text-gray-300">{playerName}</p></div>
          <div className="flex flex-wrap gap-3"><Link href="/player" className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-gray-300">Mit HESTENG</Link><Link href="/traening" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-black">Min træning</Link></div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:justify-center">
          <button type="button" onClick={() => setMonth((value) => shiftMonth(value, -1))} className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-black text-gray-200 transition hover:border-orange-500/70">← Forrige</button>
          <div className="min-w-0 flex-1 text-center text-base font-black capitalize sm:max-w-56">{formatMonth(month)}</div>
          <button type="button" disabled={!canGoNext} onClick={() => canGoNext && setMonth((value) => shiftMonth(value, 1))} className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-black text-gray-200 transition hover:border-orange-500/70 disabled:cursor-not-allowed disabled:opacity-35">Næste →</button>
        </div>

        {!resultsLoaded ? (
          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-300">Henter udvikling…</div>
        ) : summaries.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center"><h2 className="text-2xl font-black">Ingen træninger i {formatMonth(month)}.</h2><p className="mt-3 text-gray-400">Vælg en anden måned eller gennemfør en træning.</p></div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {summaries.map(({ exercise, latest, primaryMetric, monthly, primaryStats }) => {
              const latestValue = latest && primaryMetric ? formatMetricValue(latest.metrics[primaryMetric.key], primaryMetric) : "Ingen";
              const hasPreviousData = primaryStats?.previousAverage !== null && primaryStats?.previousAverage !== undefined;
              return (
                <article key={exercise.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-2xl font-black">{exercise.name}</h2><p className="mt-1 text-sm text-gray-400">{primaryMetric?.label ?? "Resultat"}</p></div>{latest?.variant ? <span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-black uppercase text-orange-300">{latest.variant}</span> : null}</div>
                  <dl className="mt-5 grid grid-cols-2 gap-2 text-sm lg:grid-cols-3">
                    <MetricBox label="Træninger" value={String(monthly.completedCount)} />
                    <MetricBox label="Seneste" value={latestValue} />
                    <MetricBox label="Bedste" value={formatNumberValue(primaryStats?.currentBest, primaryMetric)} />
                    <MetricBox label="Gennemsnit" value={formatNumberValue(primaryStats?.currentAverage, primaryMetric)} />
                    <MetricBox label="Ændring mod måneden før" value={hasPreviousData ? formatChange(primaryStats?.changeFromPreviousAverage, primaryMetric) : "Ikke nok data"} valueClassName={primaryStats?.changeFromPreviousAverage && primaryStats.changeFromPreviousAverage > 0 ? "text-emerald-300" : primaryStats?.changeFromPreviousAverage && primaryStats.changeFromPreviousAverage < 0 ? "text-red-300" : undefined} />
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricBox({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return <div className="rounded-xl bg-gray-950 px-3 py-2"><dt className="text-[0.65rem] font-black uppercase tracking-wide text-gray-500">{label}</dt><dd className={`mt-1 truncate font-bold text-gray-100 ${valueClassName ?? ""}`} title={value}>{value}</dd></div>;
}
