"use client";

import { useRef, useState } from "react";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { useCurrentUser } from "@/context/CurrentUserContext";
import {
  BOBS_27_EXERCISE_ID,
  CATCH_40_EXERCISE_ID,
  GAME_420_EXERCISE_ID,
  JDC_CHALLENGE_EXERCISE_ID,
  getTrainingExercise,
  trainingExercises,
} from "@/data/trainingExercises";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import { getTrainingResultsForPlayer, saveTrainingResult } from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDirection, TrainingResult } from "@/lib/trainingTypes";

type ExerciseId =
  | typeof JDC_CHALLENGE_EXERCISE_ID
  | typeof CATCH_40_EXERCISE_ID
  | typeof BOBS_27_EXERCISE_ID
  | typeof GAME_420_EXERCISE_ID;
type JdcThrow = "single" | "double" | "triple" | "miss";

type JdcStep = {
  phase: "shanghai" | "double";
  label: string;
  target: number | "bull";
  darts: number;
};

type JdcDetail = {
  phase: "shanghai" | "double";
  target: number | "bull";
  darts: JdcThrow[];
  points: number;
  shanghai?: boolean;
};

type Catch40Result = {
  checkoutValue: number;
  hit: boolean;
  dartsUsed: number;
  points: number;
};

type Bobs27Target = {
  target: string;
  value: number;
  hits: number;
  attempts: number;
  scoreChange: number;
};

type Game420Target = {
  target: string;
  value: number;
  hits: number;
  attempts: number;
  scoreChange: number;
};

const JDC_STEPS: JdcStep[] = [
  ...[10, 11, 12, 13, 14, 15].map((target) => ({
    phase: "shanghai" as const,
    label: String(target),
    target,
    darts: 3,
  })),
  ...[...Array.from({ length: 20 }, (_, index) => index + 1), "bull" as const].map((target) => ({
    phase: "double" as const,
    label: target === "bull" ? "BULL" : `D${target}`,
    target,
    darts: 1,
  })),
  ...[15, 16, 17, 18, 19, 20].map((target) => ({
    phase: "shanghai" as const,
    label: String(target),
    target,
    darts: 3,
  })),
];
const JDC_TOTAL_DARTS = JDC_STEPS.reduce((sum, step) => sum + step.darts, 0);
const CATCH_40_TARGETS = Array.from({ length: 40 }, (_, index) => index + 61);
const BOBS_27_TARGETS = [
  ...Array.from({ length: 20 }, (_, index) => ({
    target: `D${index + 1}`,
    value: (index + 1) * 2,
  })),
  {
    target: "BULL",
    value: 50,
  },
];
const GAME_420_TARGETS = [
  ...Array.from({ length: 20 }, (_, index) => ({
    target: `D${index + 1}`,
    value: (index + 1) * 2,
  })),
  {
    target: "BULL",
    value: 50,
  },
];

function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function numericMetric(result: TrainingResult, key: string) {
  const value = result.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function personalBest(results: TrainingResult[], key: string, direction: TrainingMetricDirection) {
  const values = results
    .map((result) => numericMetric(result, key))
    .filter((value): value is number => value !== null);

  if (values.length === 0) return null;
  return direction === "higherIsBetter" ? Math.max(...values) : Math.min(...values);
}

function percent(done: number, attempts: number) {
  return attempts > 0 ? Math.round((done / attempts) * 100) : 0;
}

function isPlayableExerciseId(exerciseId: string): exerciseId is ExerciseId {
  return [
    JDC_CHALLENGE_EXERCISE_ID,
    CATCH_40_EXERCISE_ID,
    BOBS_27_EXERCISE_ID,
    GAME_420_EXERCISE_ID,
  ].includes(exerciseId);
}

export default function TrainingPage() {
  const { currentClubId, currentClub } = useClub();
  const { currentPlayer, currentPlayerId } = useCurrentUser();
  const [activeExerciseId, setActiveExerciseId] = useState<ExerciseId | null>(null);
  const activeExercise = activeExerciseId ? getTrainingExercise(activeExerciseId) : null;
  const [results, setResults] = useState<TrainingResult[]>(() => getTrainingResultsForPlayer(currentPlayerId));
  const [lastSavedResult, setLastSavedResult] = useState<TrainingResult | null>(null);
  const [jdcThrows, setJdcThrows] = useState<JdcThrow[]>([]);
  const [catch40Results, setCatch40Results] = useState<Catch40Result[]>([]);
  const [bobs27Results, setBobs27Results] = useState<Bobs27Target[]>([]);
  const [game420Results, setGame420Results] = useState<Game420Target[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const selectedPlayerResults = results.filter(
    (result) => result.playerId === currentPlayerId && result.exerciseId === activeExerciseId
  );
  const monthlyStats = activeExercise
    ? calculateTrainingMonthlyStats(results, activeExercise, {
        playerId: currentPlayerId,
        month: currentMonthKey(),
      })
    : null;
  const scoreStats = monthlyStats?.metrics.find((metric) => metric.key === "score") ?? null;
  const shanghaiStats = monthlyStats?.metrics.find((metric) => metric.key === "shanghaiCount") ?? null;
  const checkoutPercentStats = monthlyStats?.metrics.find((metric) => metric.key === "checkoutPercent") ?? null;
  const hitPercentStats = monthlyStats?.metrics.find((metric) => metric.key === "hitPercent") ?? null;
  const scorePersonalBest = personalBest(selectedPlayerResults, "score", "higherIsBetter");
  const checkoutPercentPersonalBest = personalBest(selectedPlayerResults, "checkoutPercent", "higherIsBetter");
  const highestCheckoutPersonalBest = personalBest(selectedPlayerResults, "highestCheckout", "higherIsBetter");
  const hitPercentPersonalBest = personalBest(selectedPlayerResults, "hitPercent", "higherIsBetter");
  const remaining420PersonalBest = personalBest(selectedPlayerResults, "remaining420", "lowerIsBetter");
  const jdcState = calculateJdcState(jdcThrows);
  const catch40State = calculateCatch40State(catch40Results);
  const bobs27State = calculateBobs27State(bobs27Results);
  const game420State = calculateGame420State(game420Results);

  function refreshResults() {
    setResults(getTrainingResultsForPlayer(currentPlayerId));
  }

  function handleExerciseChange(exerciseId: ExerciseId) {
    if ((jdcThrows.length > 0 || catch40Results.length > 0 || bobs27Results.length > 0 || game420Results.length > 0) && !lastSavedResult) {
      const confirmed = window.confirm("Afbryd den aktive træning?");
      if (!confirmed) return;
    }

    setActiveExerciseId(exerciseId);
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
  }

  function handleBackToDashboard() {
    setActiveExerciseId(null);
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
    refreshResults();
  }

  function buildTrainingResult(exerciseId: ExerciseId, metrics: TrainingResult["metrics"], details?: TrainingResult["details"]) {
    return {
      id: `training-${exerciseId}-${currentPlayerId}-${Date.now()}`,
      clubId: currentClubId,
      playerId: currentPlayerId,
      exerciseId,
      completedAt: new Date().toISOString(),
      metrics,
      details,
    };
  }

  function saveFinishedResult(result: TrainingResult) {
    saveTrainingResult(result);
    refreshResults();
    setLastSavedResult(result);
    setShowDetails(false);
  }

  function handleJdcInput(value: JdcThrow) {
    if (lastSavedResult || jdcState.isComplete) return;
    const nextThrows = [...jdcThrows, value];
    setJdcThrows(nextThrows);

    const nextState = calculateJdcState(nextThrows);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        JDC_CHALLENGE_EXERCISE_ID,
        {
          score: nextState.score,
          shanghaiCount: nextState.shanghaiCount,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
        },
        {
          rounds: nextState.details,
          throws: nextThrows,
          totalDarts: JDC_TOTAL_DARTS,
        }
      ));
    }
  }

  function handleCatch40Input(dartsUsed: number | "no") {
    if (lastSavedResult || catch40State.isComplete) return;
    const checkoutValue = CATCH_40_TARGETS[catch40Results.length];
    if (!checkoutValue) return;

    const hit = dartsUsed !== "no";
    const resolvedDartsUsed = dartsUsed === "no" ? 6 : dartsUsed;
    const points = calculateCatch40Points(checkoutValue, dartsUsed);
    const nextResults = [
      ...catch40Results,
      {
        checkoutValue,
        hit,
        dartsUsed: resolvedDartsUsed,
        points,
      },
    ];
    setCatch40Results(nextResults);

    const nextState = calculateCatch40State(nextResults);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        CATCH_40_EXERCISE_ID,
        {
          score: nextState.score,
          checkouts: nextState.checkouts,
          checkoutAttempts: nextState.checkoutAttempts,
          checkoutPercent: nextState.checkoutPercent,
          highestCheckout: nextState.highestCheckout,
        },
        {
          checkouts: nextResults,
        }
      ));
    }
  }

  function handleUndo() {
    if (lastSavedResult) return;

    if (activeExerciseId === JDC_CHALLENGE_EXERCISE_ID) {
      setJdcThrows((throws) => throws.slice(0, -1));
    }

    if (activeExerciseId === CATCH_40_EXERCISE_ID) {
      setCatch40Results((items) => items.slice(0, -1));
    }

    if (activeExerciseId === BOBS_27_EXERCISE_ID) {
      setBobs27Results((items) => items.slice(0, -1));
    }

    if (activeExerciseId === GAME_420_EXERCISE_ID) {
      setGame420Results((items) => items.slice(0, -1));
    }
  }

  function handleAbort() {
    if (lastSavedResult) {
      handlePlayAgain();
      return;
    }

    if (!jdcThrows.length && !catch40Results.length && !bobs27Results.length && !game420Results.length) return;
    const confirmed = window.confirm("Afbryd træningen? Resultatet gemmes ikke.");
    if (!confirmed) return;
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
    setShowDetails(false);
  }

  function handlePlayAgain() {
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
    refreshResults();
  }

  function handleBobs27Input(hits: number) {
    if (lastSavedResult || bobs27State.isComplete) return;
    const target = BOBS_27_TARGETS[bobs27Results.length];
    if (!target) return;

    const nextResult = {
      target: target.target,
      value: target.value,
      hits,
      attempts: 3,
      scoreChange: hits > 0 ? hits * target.value : -target.value,
    };
    const nextResults = [...bobs27Results, nextResult];
    setBobs27Results(nextResults);

    const nextState = calculateBobs27State(nextResults);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        BOBS_27_EXERCISE_ID,
        {
          score: nextState.score,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
        },
        {
          doubles: nextResults,
        }
      ));
    }
  }

  function handleGame420Input(hits: number) {
    if (lastSavedResult || game420State.isComplete) return;
    const target = GAME_420_TARGETS[game420Results.length];
    if (!target) return;

    const nextResult = {
      target: target.target,
      value: target.value,
      hits,
      attempts: 3,
      scoreChange: hits * target.value,
    };
    const nextResults = [...game420Results, nextResult];
    setGame420Results(nextResults);

    const nextState = calculateGame420State(nextResults);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        GAME_420_EXERCISE_ID,
        {
          score: nextState.score,
          remaining420: nextState.remaining420,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
        },
        {
          targets: nextResults,
        }
      ));
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className={activeExerciseId === null ? "" : "[&>button]:mb-2 [&>button]:px-3 [&>button]:py-2"}>
          <BackButton />
        </div>

        <div className={activeExerciseId === null ? "mb-4 sm:mb-5" : "mb-2 sm:mb-4"}>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-400">Træning</p>
          <h1 className={`${activeExerciseId === null ? "mt-2 text-3xl sm:text-4xl" : "mt-1 text-2xl sm:mt-2 sm:text-4xl"} font-black leading-tight`}>
            {activeExercise?.name ?? "Træning"}
          </h1>
          <p className={`${activeExerciseId === null ? "mt-2" : "mt-1 hidden sm:block"} text-base text-gray-400`}>
            {currentClub.name} · træner som {currentPlayer.name}
          </p>
        </div>

        {activeExerciseId === null ? (
          <TrainingDashboard
            results={results}
            currentPlayerId={currentPlayerId}
            onStartExercise={handleExerciseChange}
          />
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-gray-800 bg-gray-900 p-1 sm:mb-5 sm:grid-cols-4 sm:gap-2 sm:p-2">
            <ExerciseTab
              active={activeExerciseId === JDC_CHALLENGE_EXERCISE_ID}
              title="JDC Challenge"
              description="57 pile"
              onClick={() => handleExerciseChange(JDC_CHALLENGE_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === CATCH_40_EXERCISE_ID}
              title="Catch 40"
              description="61-100"
              onClick={() => handleExerciseChange(CATCH_40_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === BOBS_27_EXERCISE_ID}
              title="Bob's 27"
              description="D1-D20"
              onClick={() => handleExerciseChange(BOBS_27_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === GAME_420_EXERCISE_ID}
              title="Game 420"
              description="420 remaining"
              onClick={() => handleExerciseChange(GAME_420_EXERCISE_ID)}
            />
          </div>
        )}

        {activeExerciseId === null ? null : lastSavedResult ? (
          <ResultScreen
            result={lastSavedResult}
            exercise={activeExercise}
            checkoutPercentPersonalBest={checkoutPercentPersonalBest}
            highestCheckoutPersonalBest={highestCheckoutPersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            remaining420PersonalBest={remaining420PersonalBest}
            monthlyStats={monthlyStats}
            scoreStats={scoreStats}
            shanghaiStats={shanghaiStats}
            checkoutPercentStats={checkoutPercentStats}
            hitPercentStats={hitPercentStats}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails((value) => !value)}
            onPlayAgain={handlePlayAgain}
            onBackToDashboard={handleBackToDashboard}
          />
        ) : activeExerciseId === JDC_CHALLENGE_EXERCISE_ID ? (
          <JdcGameplay
            state={jdcState}
            scorePersonalBest={scorePersonalBest}
            onInput={handleJdcInput}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === CATCH_40_EXERCISE_ID ? (
          <Catch40Gameplay
            state={catch40State}
            scorePersonalBest={scorePersonalBest}
            onInput={handleCatch40Input}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === GAME_420_EXERCISE_ID ? (
          <Game420Gameplay
            state={game420State}
            scorePersonalBest={scorePersonalBest}
            remaining420PersonalBest={remaining420PersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onInput={handleGame420Input}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : (
          <Bobs27Gameplay
            state={bobs27State}
            scorePersonalBest={scorePersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onInput={handleBobs27Input}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        )}
      </section>
    </main>
  );
}

function TrainingDashboard({
  results,
  currentPlayerId,
  onStartExercise,
}: {
  results: TrainingResult[];
  currentPlayerId: string;
  onStartExercise: (exerciseId: ExerciseId) => void;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const exercises = trainingExercises.filter((exercise) => exercise.isActive && isPlayableExerciseId(exercise.id));
  const exerciseSummaries = exercises.map((exercise) => buildExerciseSummary(exercise, results, currentPlayerId));
  const totalThisMonth = exerciseSummaries.reduce((sum, summary) => sum + summary.monthly.completedCount, 0);
  const improving = exerciseSummaries.filter((summary) => (summary.primaryStats?.changeFromPreviousAverage ?? 0) > 0).length;
  const declining = exerciseSummaries.filter((summary) => (summary.primaryStats?.changeFromPreviousAverage ?? 0) < 0).length;
  const bestDevelopment = [...exerciseSummaries]
    .filter((summary) => summary.primaryStats?.changeFromPreviousAverage !== null)
    .sort((a, b) => (b.primaryStats?.changeFromPreviousAverage ?? -Infinity) - (a.primaryStats?.changeFromPreviousAverage ?? -Infinity))[0];

  return (
    <div className="grid gap-4 sm:gap-5">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Min træning</h2>
            <p className="mt-1 text-sm font-semibold text-gray-500">Overblik, udvikling og næste mål</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-full sm:max-w-md">
            <StatTile label="Denne måned" value={totalThisMonth} />
            <StatTile label="Fremgang" value={improving} />
            <StatTile label="Tilbage" value={declining} />
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm font-bold text-gray-300">
          Bedste udvikling:{" "}
          <span className="text-orange-400">
            {bestDevelopment?.primaryStats?.changeFromPreviousAverage !== null && bestDevelopment
              ? `${bestDevelopment.exercise.name} ${formatChange(bestDevelopment.primaryStats?.changeFromPreviousAverage ?? null)}`
              : "-"}
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        {exerciseSummaries.map((summary) => (
          <TrainingExerciseCard
            key={summary.exercise.id}
            summary={summary}
            expanded={selectedExerciseId === summary.exercise.id}
            onToggle={() => setSelectedExerciseId((current) => current === summary.exercise.id ? null : summary.exercise.id)}
            onStart={() => onStartExercise(summary.exercise.id as ExerciseId)}
          />
        ))}
      </section>
    </div>
  );
}

function buildExerciseSummary(exercise: TrainingExercise, results: TrainingResult[], currentPlayerId: string) {
  const exerciseResults = results
    .filter((result) => result.playerId === currentPlayerId && result.exerciseId === exercise.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const primaryMetric = getPrimaryMetric(exercise);
  const monthly = calculateTrainingMonthlyStats(results, exercise, {
    playerId: currentPlayerId,
    month: currentMonthKey(),
  });
  const primaryStats = primaryMetric
    ? monthly.metrics.find((metric) => metric.key === primaryMetric.key) ?? null
    : null;
  const latest = exerciseResults[0] ?? null;
  const personalRecord = primaryMetric
    ? personalBest(exerciseResults, primaryMetric.key, primaryMetric.personalBest ?? "higherIsBetter")
    : null;
  const focus = buildFocusRecommendation(exercise.name, primaryStats, primaryMetric?.personalBest);

  return {
    exercise,
    results: exerciseResults,
    primaryMetric,
    primaryStats,
    latest,
    personalRecord,
    monthly,
    focus,
  };
}

function getPrimaryMetric(exercise: TrainingExercise) {
  return exercise.metrics.find((metric) => metric.key === "score") ?? exercise.metrics.find((metric) => metric.personalBest) ?? null;
}

function buildFocusRecommendation(
  exerciseName: string,
  stats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null,
  direction: TrainingMetricDirection | undefined
) {
  if (!stats || !direction || stats.currentAverage === null) {
    return "Spil en runde og få dit første pejlemærke.";
  }

  if (stats.currentBottomAverage !== null) {
    const gap = direction === "lowerIsBetter"
      ? stats.currentBottomAverage - stats.currentAverage
      : stats.currentAverage - stats.currentBottomAverage;
    const threshold = Math.max(5, Math.abs(stats.currentAverage) * 0.08);

    if (gap > threshold) {
      return direction === "lowerIsBetter"
        ? `Forsøg at holde næste ${exerciseName} under ${formatValue(stats.currentBottomAverage)}.`
        : `Forsøg at holde næste ${exerciseName} over ${formatValue(stats.currentBottomAverage)}.`;
    }
  }

  if (stats.currentBest !== null) {
    const nearBest = direction === "lowerIsBetter"
      ? stats.currentAverage <= stats.currentBest * 1.08
      : stats.currentAverage >= stats.currentBest * 0.92;

    if (nearBest) return "Du nærmer dig dit topniveau.";
  }

  return direction === "lowerIsBetter"
    ? `Forsøg at slå dit måneds-snit: under ${formatValue(stats.currentAverage)}.`
    : `Forsøg at slå dit måneds-snit: over ${formatValue(stats.currentAverage)}.`;
}

function TrainingExerciseCard({
  summary,
  expanded,
  onToggle,
  onStart,
}: {
  summary: ReturnType<typeof buildExerciseSummary>;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const latestValue = summary.latest && summary.primaryMetric ? numericMetric(summary.latest, summary.primaryMetric.key) : null;
  const hasResults = summary.results.length > 0;
  const isJdc = summary.exercise.id === JDC_CHALLENGE_EXERCISE_ID;
  const latestHits = summary.latest ? numericMetric(summary.latest, "hits") : null;
  const latestAttempts = summary.latest ? numericMetric(summary.latest, "attempts") : null;
  const latestHitPercent = summary.latest ? numericMetric(summary.latest, "hitPercent") : null;
  const monthlyHitPercent = summary.monthly.metrics.find((metric) => metric.key === "hitPercent") ?? null;

  function handleCardKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onStart();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={handleCardKeyDown}
      className="min-w-0 cursor-pointer rounded-2xl border border-gray-800 bg-gray-900 p-3 transition hover:border-orange-500/70 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Træningsspil</div>
          <h3 className="mt-1 text-2xl font-black leading-tight">{summary.exercise.name}</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500">{summary.exercise.description}</p>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onStart();
          }}
          className="min-h-11 rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-orange-400 sm:shrink-0"
        >
          Start
        </button>
      </div>

      {hasResults ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <CompactStat label="Seneste" value={latestValue ?? "-"} />
            <CompactStat label="PR" value={summary.personalRecord ?? "-"} />
            <CompactStat label="Månedssnit" value={summary.primaryStats?.currentAverage ?? "-"} />
            <CompactStat label="Ændring" value={formatChange(summary.primaryStats?.changeFromPreviousAverage ?? null)} />
            <CompactStat label="Gennemført" value={summary.monthly.completedCount} />
          </div>

          {isJdc ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <CompactStat label="Hits / forsøg" value={latestHits !== null && latestAttempts !== null ? `${latestHits}/${latestAttempts}` : "-"} />
              <CompactStat label="Hit %" value={latestHitPercent !== null ? `${latestHitPercent}%` : monthlyHitPercent?.currentAverage != null ? `${monthlyHitPercent.currentAverage}% snit` : "-"} />
            </div>
          ) : null}

          <LevelGrid stats={summary.primaryStats} />

          <div className="mt-3 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 text-sm font-bold text-gray-300 sm:px-4">
            Fokus: <span className="text-orange-300">{summary.focus}</span>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950 px-3 py-4 text-sm font-bold text-gray-500 sm:px-4 sm:py-5">
          Ingen resultater endnu
        </div>
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="mt-4 min-h-11 rounded-xl border border-gray-700 px-4 py-2 text-sm font-black text-gray-300 transition hover:border-orange-500 hover:text-white"
      >
        {expanded ? "Skjul detaljer" : "Vis detaljer"}
      </button>

      {expanded ? <TrainingExerciseDetails summary={summary} /> : null}
    </article>
  );
}

function LevelGrid({ stats }: { stats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <LevelTile label="Top" value={stats?.currentBest ?? "-"} change={stats?.changeFromPreviousBest ?? null} />
      <LevelTile label="Normal" value={stats?.currentAverage ?? "-"} change={stats?.changeFromPreviousAverage ?? null} />
      <LevelTile label="Bund" value={stats?.currentBottomAverage ?? "-"} change={stats?.changeFromPreviousBottom ?? null} />
    </div>
  );
}

function LevelTile({ label, value, change }: { label: string; value: string | number; change: number | null }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-800 bg-gray-950 p-2 sm:p-3">
      <div className="text-[0.65rem] font-black uppercase tracking-wide text-gray-500 sm:text-xs">{label}</div>
      <div className="mt-1 text-xl font-black tabular-nums text-white sm:text-2xl">{value}</div>
      <div className={`mt-1 text-xs font-black ${change === null ? "text-gray-600" : change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
        {formatChange(change)}
      </div>
    </div>
  );
}

function TrainingExerciseDetails({ summary }: { summary: ReturnType<typeof buildExerciseSummary> }) {
  return (
    <section className="mt-4 grid gap-4">
      <div className="rounded-xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
        <h4 className="text-sm font-black uppercase tracking-wide text-gray-500">Historik</h4>
        <div className="mt-3 grid gap-2">
          {summary.results.slice(0, 12).map((result) => (
            <TrainingHistoryRow
              key={result.id}
              result={result}
              primaryKey={summary.primaryMetric?.key ?? "score"}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrainingHistoryRow({ result, primaryKey }: { result: TrainingResult; primaryKey: string }) {
  const secondary = getSecondaryMetrics(result);

  return (
    <div className="grid gap-1 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-sm font-bold sm:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-2">
      <div className="text-gray-500">{formatDate(result.completedAt)}</div>
      <div className="text-white">{numericMetric(result, primaryKey) ?? "-"}</div>
      <div className="truncate text-gray-400">{secondary}</div>
    </div>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatChange(value: number | null) {
  if (value === null) return "-";
  if (value > 0) return `↑${formatValue(value)}`;
  if (value < 0) return `↓${formatValue(Math.abs(value))}`;
  return "0";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSecondaryMetrics(result: TrainingResult) {
  if (result.exerciseId === JDC_CHALLENGE_EXERCISE_ID) {
    return `Hits ${numericMetric(result, "hits") ?? "-"}/${numericMetric(result, "attempts") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  if (result.exerciseId === CATCH_40_EXERCISE_ID) {
    return `Finishes ${numericMetric(result, "checkouts") ?? "-"} · Lukke ${numericMetric(result, "checkoutPercent") ?? "-"}%`;
  }

  if (result.exerciseId === GAME_420_EXERCISE_ID) {
    return `Remaining ${numericMetric(result, "remaining420") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  return `Hits ${numericMetric(result, "hits") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
}

function calculateJdcState(throws: JdcThrow[]) {
  let cursor = 0;
  let score = 0;
  let shanghaiCount = 0;
  const hits = throws.filter((value) => value !== "miss").length;
  const attempts = throws.length;
  const details: JdcDetail[] = [];
  let currentStep: JdcStep | null = null;
  let currentDart = 1;

  for (const step of JDC_STEPS) {
    const stepThrows = throws.slice(cursor, cursor + step.darts);
    const complete = stepThrows.length === step.darts;

    if (step.phase === "shanghai") {
      const target = step.target as number;
      const basePoints = stepThrows.reduce((sum, value) => sum + jdcThrowPoints(target, value), 0);
      const shanghai = complete && ["single", "double", "triple"].every((value) => stepThrows.includes(value as JdcThrow));
      const points = basePoints + (shanghai ? 100 : 0);
      score += points;
      shanghaiCount += shanghai ? 1 : 0;
      details.push({ phase: step.phase, target, darts: stepThrows, points, shanghai });
    } else {
      const hit = stepThrows[0] && stepThrows[0] !== "miss";
      const points = hit ? (step.target === "bull" ? 100 : 50) : 0;
      score += points;
      details.push({ phase: step.phase, target: step.target, darts: stepThrows, points });
    }

    if (!complete) {
      currentStep = step;
      currentDart = stepThrows.length + 1;
      break;
    }

    cursor += step.darts;
  }

  return {
    score,
    shanghaiCount,
    hits,
    attempts,
    hitPercent: percent(hits, attempts),
    details,
    throwsUsed: throws.length,
    dartsRemaining: JDC_TOTAL_DARTS - throws.length,
    currentStep,
    currentDart,
    isComplete: throws.length >= JDC_TOTAL_DARTS,
  };
}

function jdcThrowPoints(target: number, value: JdcThrow) {
  if (value === "single") return target;
  if (value === "double") return target * 2;
  if (value === "triple") return target * 3;
  return 0;
}

function calculateCatch40Points(checkoutValue: number, dartsUsed: number | "no") {
  if (dartsUsed === "no") return 0;
  if (checkoutValue === 99 && dartsUsed === 3) return 3;
  if (dartsUsed === 2) return 3;
  if (dartsUsed === 3) return 2;
  return 1;
}

function calculateCatch40State(results: Catch40Result[]) {
  const checkouts = results.filter((result) => result.hit).length;
  const highestCheckout = results.reduce(
    (highest, result) => result.hit ? Math.max(highest, result.checkoutValue) : highest,
    0
  );

  return {
    score: results.reduce((sum, result) => sum + result.points, 0),
    checkouts,
    checkoutAttempts: results.length,
    checkoutPercent: percent(checkouts, results.length),
    highestCheckout,
    currentTarget: CATCH_40_TARGETS[results.length] ?? null,
    completedTargets: results.length,
    remainingTargets: CATCH_40_TARGETS.length - results.length,
    isComplete: results.length >= CATCH_40_TARGETS.length,
    details: results,
  };
}

function calculateBobs27State(results: Bobs27Target[]) {
  const hits = results.reduce((sum, target) => sum + target.hits, 0);
  const attempts = results.reduce((sum, target) => sum + target.attempts, 0);

  return {
    score: 27 + results.reduce((sum, target) => sum + target.scoreChange, 0),
    hits,
    attempts,
    hitPercent: percent(hits, attempts),
    currentTarget: BOBS_27_TARGETS[results.length] ?? null,
    completedTargets: results.length,
    remainingTargets: BOBS_27_TARGETS.length - results.length,
    isComplete: results.length >= BOBS_27_TARGETS.length,
    details: results,
  };
}

function calculateGame420State(results: Game420Target[]) {
  const hits = results.reduce((sum, target) => sum + target.hits, 0);
  const attempts = results.reduce((sum, target) => sum + target.attempts, 0);
  const score = results.reduce((sum, target) => sum + target.scoreChange, 0);

  return {
    score,
    remaining420: 420 - score,
    hits,
    attempts,
    hitPercent: percent(hits, attempts),
    currentTarget: GAME_420_TARGETS[results.length] ?? null,
    completedTargets: results.length,
    remainingTargets: GAME_420_TARGETS.length - results.length,
    isComplete: results.length >= GAME_420_TARGETS.length,
    details: results,
  };
}

function getCatch40Details(result: TrainingResult): Catch40Result[] {
  const checkouts = result.details?.checkouts;
  if (!Array.isArray(checkouts)) return [];

  return checkouts.filter((target): target is Catch40Result => {
    return (
      typeof target === "object" &&
      target !== null &&
      "checkoutValue" in target &&
      "hit" in target &&
      "dartsUsed" in target &&
      "points" in target &&
      typeof target.checkoutValue === "number" &&
      typeof target.hit === "boolean" &&
      typeof target.dartsUsed === "number" &&
      typeof target.points === "number"
    );
  });
}

function getBobs27Details(result: TrainingResult): Bobs27Target[] {
  const doubles = result.details?.doubles;
  if (!Array.isArray(doubles)) return [];

  return doubles.filter((double): double is Bobs27Target => {
    return (
      typeof double === "object" &&
      double !== null &&
      "target" in double &&
      "value" in double &&
      "hits" in double &&
      "attempts" in double &&
      "scoreChange" in double &&
      typeof double.target === "string" &&
      typeof double.value === "number" &&
      typeof double.hits === "number" &&
      typeof double.attempts === "number" &&
      typeof double.scoreChange === "number"
    );
  });
}

function getGame420Details(result: TrainingResult): Game420Target[] {
  const targets = result.details?.targets;
  if (!Array.isArray(targets)) return [];

  return targets.filter((target): target is Game420Target => {
    return (
      typeof target === "object" &&
      target !== null &&
      "target" in target &&
      "value" in target &&
      "hits" in target &&
      "attempts" in target &&
      "scoreChange" in target &&
      typeof target.target === "string" &&
      typeof target.value === "number" &&
      typeof target.hits === "number" &&
      typeof target.attempts === "number" &&
      typeof target.scoreChange === "number"
    );
  });
}

function ExerciseTab({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-2 text-left transition sm:px-4 sm:py-3 ${
        active ? "bg-orange-500 text-gray-950" : "bg-gray-950 text-gray-300 hover:bg-gray-800"
      }`}
    >
      <div className="text-sm font-black leading-tight sm:text-base">{title}</div>
      <div className={`hidden text-xs font-semibold sm:block sm:text-sm ${active ? "text-gray-900" : "text-gray-500"}`}>{description}</div>
    </button>
  );
}

function JdcGameplay({
  state,
  scorePersonalBest,
  onInput,
  onUndo,
  onAbort,
}: {
  state: ReturnType<typeof calculateJdcState>;
  scorePersonalBest: number | null;
  onInput: (value: JdcThrow) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  const isDoublePhase = state.currentStep?.phase === "double";

  return (
    <GameplayShell
      eyebrow={isDoublePhase ? "Doubles around the world" : "Shanghai"}
      target={state.currentStep?.label ?? "Færdig"}
      meta={`${state.throwsUsed}/${JDC_TOTAL_DARTS} pile · ${state.dartsRemaining} tilbage`}
      stats={[
        { label: "Score", value: state.score },
        { label: "Shanghai", value: state.shanghaiCount },
        { label: "Hits", value: `${state.hits}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.throwsUsed > 0}
    >
      {isDoublePhase ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <TouchButton label="HIT" tone="green" onClick={() => onInput("single")} />
          <TouchButton label="NO HIT" tone="red" onClick={() => onInput("miss")} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <TouchButton label="SINGLE" tone="green" onClick={() => onInput("single")} />
          <TouchButton label="DOUBLE" tone="amber" onClick={() => onInput("double")} />
          <TouchButton label="TRIPLE" tone="orange" onClick={() => onInput("triple")} />
          <TouchButton label="NO HIT" tone="red" onClick={() => onInput("miss")} />
        </div>
      )}
    </GameplayShell>
  );
}

function Catch40Gameplay({
  state,
  scorePersonalBest,
  onInput,
  onUndo,
  onAbort,
}: {
  state: ReturnType<typeof calculateCatch40State>;
  scorePersonalBest: number | null;
  onInput: (dartsUsed: number | "no") => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  return (
    <GameplayShell
      eyebrow="Catch 40"
      target={state.currentTarget ? String(state.currentTarget) : "Færdig"}
      meta={`${state.completedTargets}/${CATCH_40_TARGETS.length} targets · ${state.remainingTargets} tilbage`}
      stats={[
        { label: "Score", value: state.score },
        { label: "Finishes", value: state.checkouts },
        { label: "Lukke %", value: `${state.checkoutPercent}%` },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.completedTargets > 0}
    >
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <TouchButton label="2 DARTS" tone="green" onClick={() => onInput(2)} />
        <TouchButton label="3 DARTS" tone="green" onClick={() => onInput(3)} />
        <TouchButton label="4 DARTS" tone="amber" onClick={() => onInput(4)} />
        <TouchButton label="5 DARTS" tone="amber" onClick={() => onInput(5)} />
        <TouchButton label="6 DARTS" tone="orange" onClick={() => onInput(6)} />
        <TouchButton label="NO" tone="red" onClick={() => onInput("no")} />
      </div>
    </GameplayShell>
  );
}

function GameplayShell({
  eyebrow,
  target,
  meta,
  stats,
  children,
  canUndo,
  onUndo,
  onAbort,
}: {
  eyebrow: string;
  target: string;
  meta: string;
  stats: { label: string; value: string | number }[];
  children: React.ReactNode;
  canUndo: boolean;
  onUndo: () => void;
  onAbort: () => void;
}) {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4 xl:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">{eyebrow}</div>
            <div className="mt-1 break-words text-5xl font-black leading-none text-white sm:mt-2 sm:text-6xl xl:text-8xl">{target}</div>
            <div className="mt-2 text-sm font-bold text-gray-500">{meta}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-28 sm:grid-cols-1 sm:shrink-0">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="rounded-xl border border-gray-700 px-3 py-3 text-sm font-black text-gray-300 transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4"
            >
              UNDO
            </button>
            <button
              type="button"
              onClick={onAbort}
              className="rounded-xl border border-red-900 px-3 py-3 text-sm font-black text-red-300 transition hover:bg-red-950 sm:px-4"
            >
              AFBRYD
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {stats.map((stat) => (
            <StatTile key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-3 sm:p-4 xl:p-6">
        {children}
      </section>
    </div>
  );
}

function TouchButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "green" | "amber" | "orange" | "red";
  onClick: () => void;
}) {
  const classes = {
    green: "bg-emerald-500 text-gray-950 hover:bg-emerald-400",
    amber: "bg-yellow-400 text-gray-950 hover:bg-yellow-300",
    orange: "bg-orange-500 text-gray-950 hover:bg-orange-400",
    red: "bg-red-600 text-white hover:bg-red-500",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-16 rounded-xl px-2 py-3 text-lg font-black leading-tight transition active:scale-[0.98] sm:min-h-20 sm:rounded-2xl sm:px-4 sm:py-4 sm:text-2xl xl:min-h-24 xl:py-5 ${classes[tone]}`}
    >
      {label}
    </button>
  );
}

function Bobs27Gameplay({
  state,
  scorePersonalBest,
  hitPercentPersonalBest,
  onInput,
  onUndo,
  onAbort,
}: {
  state: ReturnType<typeof calculateBobs27State>;
  scorePersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  onInput: (hits: number) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  return (
    <GameplayShell
      eyebrow="Bob's 27"
      target={state.currentTarget?.target ?? "Færdig"}
      meta={`${state.completedTargets}/${BOBS_27_TARGETS.length} targets · ${state.remainingTargets} tilbage`}
      stats={[
        { label: "Score", value: state.score },
        { label: "Hits", value: state.hits },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.completedTargets > 0}
    >
      <div className="mb-3 hidden rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 xl:block xl:px-4">
        <div className="text-xs font-black uppercase tracking-wide text-gray-500">Personlig rekord træf %</div>
        <div className="mt-1 text-xl font-black text-orange-400">
          {hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <TouchButton label="0 HITS" tone="red" onClick={() => onInput(0)} />
        <TouchButton label="1 HIT" tone="amber" onClick={() => onInput(1)} />
        <TouchButton label="2 HITS" tone="orange" onClick={() => onInput(2)} />
        <TouchButton label="3 HITS" tone="green" onClick={() => onInput(3)} />
      </div>
    </GameplayShell>
  );
}

function Game420Gameplay({
  state,
  scorePersonalBest,
  remaining420PersonalBest,
  hitPercentPersonalBest,
  onInput,
  onUndo,
  onAbort,
}: {
  state: ReturnType<typeof calculateGame420State>;
  scorePersonalBest: number | null;
  remaining420PersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  onInput: (hits: number) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  return (
    <GameplayShell
      eyebrow="Game 420"
      target={state.currentTarget?.target ?? "Færdig"}
      meta={`${state.completedTargets}/${GAME_420_TARGETS.length} targets · ${state.remainingTargets} tilbage`}
      stats={[
        { label: "Remaining", value: state.remaining420 },
        { label: "Score", value: state.score },
        { label: "Hits", value: `${state.hits}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.completedTargets > 0}
    >
      <div className="mb-3 hidden gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 xl:grid xl:grid-cols-3 xl:px-4">
        <CompactStat label="PR score" value={scorePersonalBest ?? "-"} />
        <CompactStat label="PR remaining" value={remaining420PersonalBest ?? "-"} />
        <CompactStat label="PR træf %" value={hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"} />
      </div>
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <TouchButton label="0 HITS" tone="red" onClick={() => onInput(0)} />
        <TouchButton label="1 HIT" tone="amber" onClick={() => onInput(1)} />
        <TouchButton label="2 HITS" tone="orange" onClick={() => onInput(2)} />
        <TouchButton label="3 HITS" tone="green" onClick={() => onInput(3)} />
      </div>
    </GameplayShell>
  );
}

function ResultScreen({
  result,
  exercise,
  checkoutPercentPersonalBest,
  highestCheckoutPersonalBest,
  hitPercentPersonalBest,
  remaining420PersonalBest,
  monthlyStats,
  scoreStats,
  shanghaiStats,
  checkoutPercentStats,
  hitPercentStats,
  showDetails,
  onToggleDetails,
  onPlayAgain,
  onBackToDashboard,
}: {
  result: TrainingResult;
  exercise: TrainingExercise | null;
  checkoutPercentPersonalBest: number | null;
  highestCheckoutPersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  remaining420PersonalBest: number | null;
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  shanghaiStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  checkoutPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  hitPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onPlayAgain: () => void;
  onBackToDashboard: () => void;
}) {
  const isJdc = result.exerciseId === JDC_CHALLENGE_EXERCISE_ID;
  const isCatch40 = result.exerciseId === CATCH_40_EXERCISE_ID;
  const isBobs27 = result.exerciseId === BOBS_27_EXERCISE_ID;
  const isGame420 = result.exerciseId === GAME_420_EXERCISE_ID;

  return (
    <div className="grid gap-4 sm:gap-5">
      <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Gennemført</p>
        <h2 className="mt-1 text-3xl font-black">{exercise?.name ?? "Træning"}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile label="Score" value={numericMetric(result, "score") ?? "-"} />
          {isJdc ? (
            <>
              <StatTile label="Shanghai" value={numericMetric(result, "shanghaiCount") ?? 0} />
              <StatTile label="Hits" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Træf %" value={`${numericMetric(result, "hitPercent") ?? 0}%`} />
            </>
          ) : isCatch40 ? (
            <>
              <StatTile label="Finishes" value={numericMetric(result, "checkouts") ?? 0} />
              <StatTile label="Lukke %" value={`${numericMetric(result, "checkoutPercent") ?? 0}%`} />
              <StatTile label="Højeste" value={numericMetric(result, "highestCheckout") || "-"} />
            </>
          ) : isBobs27 || isGame420 ? (
            <>
              <StatTile label="Hits" value={numericMetric(result, "hits") ?? 0} />
              <StatTile label="Forsøg" value={numericMetric(result, "attempts") ?? 0} />
              <StatTile label={isGame420 ? "Remaining" : "Træf %"} value={isGame420 ? numericMetric(result, "remaining420") ?? "-" : `${numericMetric(result, "hitPercent") ?? 0}%`} />
            </>
          ) : null}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-orange-500 px-5 py-3 text-base font-black text-gray-950 transition hover:bg-orange-400 sm:py-4"
          >
            Spil igen
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="rounded-xl border border-gray-700 px-5 py-3 text-base font-black text-gray-300 transition hover:border-orange-500 hover:text-white sm:py-4"
          >
            Tilbage til træning
          </button>
          {(isCatch40 || isBobs27 || isGame420) ? (
            <button
              type="button"
              onClick={onToggleDetails}
              className="rounded-xl border border-emerald-600 px-5 py-3 text-base font-black text-emerald-200 transition hover:bg-emerald-900 sm:py-4"
            >
              {showDetails ? "Skjul detaljer" : "Se detaljer"}
            </button>
          ) : null}
        </div>
      </section>

      <MonthlyStatsPanel
        monthlyStats={monthlyStats}
        scoreStats={scoreStats}
        extraStats={
          isJdc
            ? [
                { label: "Shanghai total", value: shanghaiStats?.currentTotal ?? "-" },
                { label: "Shanghai snit", value: shanghaiStats?.currentAverage ?? "-" },
                { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
              ]
            : isCatch40
              ? [
                  { label: "Snit lukke %", value: checkoutPercentStats?.currentAverage ?? "-" },
                  { label: "PR lukke %", value: checkoutPercentPersonalBest !== null ? `${checkoutPercentPersonalBest}%` : "-" },
                  { label: "PR højeste luk", value: highestCheckoutPersonalBest ?? "-" },
                ]
              : isGame420
                ? [
                    { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                    { label: "PR remaining", value: remaining420PersonalBest ?? "-" },
                    { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                  ]
                : [
                    { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                    { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                  ]
        }
      />

      {showDetails && isCatch40 ? <Catch40DetailsTable details={getCatch40Details(result)} /> : null}
      {showDetails && isBobs27 ? <Bobs27DetailsTable details={getBobs27Details(result)} /> : null}
      {showDetails && isGame420 ? <Game420DetailsTable details={getGame420Details(result)} /> : null}
    </div>
  );
}

function MonthlyStatsPanel({
  monthlyStats,
  scoreStats,
  extraStats,
}: {
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  extraStats: { label: string; value: string | number }[];
}) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <h2 className="text-lg font-black">Denne måned</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <CompactStat label="Gennemført" value={monthlyStats?.completedCount ?? 0} />
        <CompactStat label="Snit score" value={scoreStats?.currentAverage ?? "-"} />
        <CompactStat label="Bedste score" value={scoreStats?.currentBest ?? "-"} />
        <CompactStat label="Forrige måned" value={scoreStats?.previousAverage ?? "-"} />
        <CompactStat label="Ændring" value={scoreStats?.changeFromPreviousAverage ?? "-"} />
        {extraStats.map((stat) => (
          <CompactStat key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>
    </section>
  );
}

function Catch40DetailsTable({ details }: { details: Catch40Result[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <TableHeader columns={["CO", "Resultat", "Pile", "Point"]} />
      {details.map((target) => (
        <div key={target.checkoutValue} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
          <div>{target.checkoutValue}</div>
          <div className={target.hit ? "text-emerald-300" : "text-red-300"}>{target.hit ? "Hit" : "No"}</div>
          <div>{target.dartsUsed}</div>
          <div>{target.points}</div>
        </div>
      ))}
    </section>
  );
}

function Bobs27DetailsTable({ details }: { details: Bobs27Target[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <TableHeader columns={["Target", "Hits", "Forsøg", "+/-"]} />
      {details.map((target) => (
        <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
          <div>{target.target}</div>
          <div>{target.hits}</div>
          <div>{target.attempts}</div>
          <div className={target.scoreChange >= 0 ? "text-emerald-300" : "text-red-300"}>{target.scoreChange}</div>
        </div>
      ))}
    </section>
  );
}

function Game420DetailsTable({ details }: { details: Game420Target[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <TableHeader columns={["Target", "Hits", "Forsøg", "Score"]} />
      {details.map((target) => (
        <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
          <div>{target.target}</div>
          <div>{target.hits}</div>
          <div>{target.attempts}</div>
          <div className="text-emerald-300">{target.scoreChange}</div>
        </div>
      ))}
    </section>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div className="grid grid-cols-4 bg-gray-950 px-3 py-2 text-xs font-black uppercase tracking-wide text-gray-500 sm:px-4">
      {columns.map((column) => (
        <div key={column}>{column}</div>
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
      <div className="text-[0.65rem] font-black uppercase tracking-wide text-gray-500 sm:text-xs">{label}</div>
      <div className="mt-1 break-words text-2xl font-black tabular-nums text-orange-400 sm:text-3xl">{value}</div>
    </div>
  );
}

function getCompactStatTooltip(label: string | number) {
  const normalizedLabel = String(label).trim().toLowerCase();
  const tooltips: Record<string, string> = {
    s: "Seneste resultat",
    seneste: "Seneste resultat",
    m: "Måned",
    måned: "Måned",
    pr: "Personlig rekord",
    "pr score": "Personlig rekord i score",
    "pr remaining": "Personlig rekord i remaining",
    "pr træf %": "Personlig rekord i træfprocent",
    "pr lukke %": "Personlig rekord i lukkeprocent",
    "pr højeste luk": "Personlig rekord i højeste lukning",
    gen: "Gennemsnit",
    gennemsnit: "Gennemsnit",
    månedssnit: "Månedens gennemsnit",
    ændring: "Ændring fra foregående måned",
    gennemført: "Gennemførte træninger denne måned",
    "hits / forsøg": "Hits ud af forsøg",
    "hit %": "Træfprocent",
    "snit score": "Gennemsnitlig score denne måned",
    "bedste score": "Bedste score denne måned",
    "forrige måned": "Foregående måneds gennemsnit",
    "shanghai total": "Samlet antal Shanghai denne måned",
    "shanghai snit": "Gennemsnitligt antal Shanghai denne måned",
    "snit træf %": "Gennemsnitlig træfprocent denne måned",
    "snit lukke %": "Gennemsnitlig lukkeprocent denne måned",
  };

  return tooltips[normalizedLabel] ?? String(label);
}

function CompactStat({ label, value }: { label: string | number; value: string | number }) {
  const [touchTooltipVisible, setTouchTooltipVisible] = useState(false);
  const hideTooltipTimer = useRef<number | null>(null);
  const tooltip = getCompactStatTooltip(label);

  function showTouchTooltip(event: React.MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    setTouchTooltipVisible(true);

    if (hideTooltipTimer.current !== null) {
      window.clearTimeout(hideTooltipTimer.current);
    }

    hideTooltipTimer.current = window.setTimeout(() => {
      setTouchTooltipVisible(false);
      hideTooltipTimer.current = null;
    }, 1600);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    setTouchTooltipVisible(true);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${tooltip}`}
      onClick={showTouchTooltip}
      onKeyDown={handleKeyDown}
      className="group relative flex min-w-0 items-center justify-between gap-2 rounded-lg bg-gray-950 px-3 py-2 outline-none ring-orange-500 transition focus:ring-2"
    >
      <span className="min-w-0 truncate text-sm font-semibold text-gray-400">{label}</span>
      <span className="shrink-0 text-base font-black tabular-nums text-white">{value}</span>
      <span
        className={`pointer-events-none absolute left-3 top-0 z-30 max-w-[calc(100vw-2rem)] -translate-y-[calc(100%+0.4rem)] rounded-lg border border-gray-700 bg-gray-950 px-2.5 py-1.5 text-xs font-bold text-white shadow-2xl shadow-black/40 transition-opacity ${
          touchTooltipVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
        }`}
      >
        {tooltip}
      </span>
    </div>
  );
}
