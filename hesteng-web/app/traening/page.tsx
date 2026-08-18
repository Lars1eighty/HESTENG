"use client";

import { useState } from "react";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { useCurrentUser } from "@/context/CurrentUserContext";
import {
  BOBS_27_EXERCISE_ID,
  CATCH_40_EXERCISE_ID,
  JDC_CHALLENGE_EXERCISE_ID,
  getTrainingExercise,
} from "@/data/trainingExercises";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import { getTrainingResultsForPlayer, saveTrainingResult } from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDirection, TrainingResult } from "@/lib/trainingTypes";

type ExerciseId = typeof JDC_CHALLENGE_EXERCISE_ID | typeof CATCH_40_EXERCISE_ID | typeof BOBS_27_EXERCISE_ID;
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
    value: index + 1,
  })),
  {
    target: "BULL",
    value: 25,
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

export default function TrainingPage() {
  const { currentClubId, currentClub } = useClub();
  const { currentPlayer, currentPlayerId } = useCurrentUser();
  const [activeExerciseId, setActiveExerciseId] = useState<ExerciseId>(JDC_CHALLENGE_EXERCISE_ID);
  const activeExercise = getTrainingExercise(activeExerciseId);
  const [results, setResults] = useState<TrainingResult[]>(() => getTrainingResultsForPlayer(currentPlayerId));
  const [lastSavedResult, setLastSavedResult] = useState<TrainingResult | null>(null);
  const [jdcThrows, setJdcThrows] = useState<JdcThrow[]>([]);
  const [catch40Results, setCatch40Results] = useState<Catch40Result[]>([]);
  const [bobs27Results, setBobs27Results] = useState<Bobs27Target[]>([]);
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
  const shanghaiPersonalBest = personalBest(selectedPlayerResults, "shanghaiCount", "higherIsBetter");
  const checkoutPercentPersonalBest = personalBest(selectedPlayerResults, "checkoutPercent", "higherIsBetter");
  const highestCheckoutPersonalBest = personalBest(selectedPlayerResults, "highestCheckout", "higherIsBetter");
  const hitPercentPersonalBest = personalBest(selectedPlayerResults, "hitPercent", "higherIsBetter");
  const jdcState = calculateJdcState(jdcThrows);
  const catch40State = calculateCatch40State(catch40Results);
  const bobs27State = calculateBobs27State(bobs27Results);

  function refreshResults() {
    setResults(getTrainingResultsForPlayer(currentPlayerId));
  }

  function handleExerciseChange(exerciseId: ExerciseId) {
    if ((jdcThrows.length > 0 || catch40Results.length > 0 || bobs27Results.length > 0) && !lastSavedResult) {
      const confirmed = window.confirm("Afbryd den aktive træning?");
      if (!confirmed) return;
    }

    setActiveExerciseId(exerciseId);
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
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
  }

  function handleAbort() {
    if (lastSavedResult) {
      handlePlayAgain();
      return;
    }

    if (!jdcThrows.length && !catch40Results.length && !bobs27Results.length) return;
    const confirmed = window.confirm("Afbryd træningen? Resultatet gemmes ikke.");
    if (!confirmed) return;
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setShowDetails(false);
  }

  function handlePlayAgain() {
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
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

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <BackButton />

        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-400">Træning</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{activeExercise?.name ?? "Træning"}</h1>
          <p className="mt-2 text-base text-gray-400">{currentClub.name} · træner som {currentPlayer.name}</p>
        </div>

        <div className="mb-5 grid gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-2 sm:grid-cols-3">
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
        </div>

        {lastSavedResult ? (
          <ResultScreen
            result={lastSavedResult}
            exercise={activeExercise}
            scorePersonalBest={scorePersonalBest}
            shanghaiPersonalBest={shanghaiPersonalBest}
            checkoutPercentPersonalBest={checkoutPercentPersonalBest}
            highestCheckoutPersonalBest={highestCheckoutPersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            monthlyStats={monthlyStats}
            scoreStats={scoreStats}
            shanghaiStats={shanghaiStats}
            checkoutPercentStats={checkoutPercentStats}
            hitPercentStats={hitPercentStats}
            showDetails={showDetails}
            onToggleDetails={() => setShowDetails((value) => !value)}
            onPlayAgain={handlePlayAgain}
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

function calculateJdcState(throws: JdcThrow[]) {
  let cursor = 0;
  let score = 0;
  let shanghaiCount = 0;
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
      className={`rounded-xl px-4 py-3 text-left transition ${
        active ? "bg-orange-500 text-gray-950" : "bg-gray-950 text-gray-300 hover:bg-gray-800"
      }`}
    >
      <div className="text-base font-black">{title}</div>
      <div className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-500"}`}>{description}</div>
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
        { label: "Pil", value: state.currentStep ? `${state.currentDart}/${state.currentStep.darts}` : "-" },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.throwsUsed > 0}
    >
      {isDoublePhase ? (
        <div className="grid grid-cols-2 gap-3">
          <TouchButton label="HIT" tone="green" onClick={() => onInput("single")} />
          <TouchButton label="NO HIT" tone="red" onClick={() => onInput("miss")} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">{eyebrow}</div>
            <div className="mt-2 text-7xl font-black leading-none text-white sm:text-8xl">{target}</div>
            <div className="mt-2 text-sm font-bold text-gray-500">{meta}</div>
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="rounded-xl border border-gray-700 px-4 py-3 text-sm font-black text-gray-300 transition hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              UNDO
            </button>
            <button
              type="button"
              onClick={onAbort}
              className="rounded-xl border border-red-900 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-950"
            >
              AFBRYD
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <StatTile key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
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
      className={`min-h-24 rounded-2xl px-4 py-5 text-2xl font-black transition active:scale-[0.98] ${classes[tone]}`}
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
      <div className="mb-3 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
        <div className="text-xs font-black uppercase tracking-wide text-gray-500">Personlig rekord træf %</div>
        <div className="mt-1 text-xl font-black text-orange-400">
          {hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
  scorePersonalBest,
  shanghaiPersonalBest,
  checkoutPercentPersonalBest,
  highestCheckoutPersonalBest,
  hitPercentPersonalBest,
  monthlyStats,
  scoreStats,
  shanghaiStats,
  checkoutPercentStats,
  hitPercentStats,
  showDetails,
  onToggleDetails,
  onPlayAgain,
}: {
  result: TrainingResult;
  exercise: TrainingExercise | null;
  scorePersonalBest: number | null;
  shanghaiPersonalBest: number | null;
  checkoutPercentPersonalBest: number | null;
  highestCheckoutPersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  shanghaiStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  checkoutPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  hitPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onPlayAgain: () => void;
}) {
  const isJdc = result.exerciseId === JDC_CHALLENGE_EXERCISE_ID;
  const isCatch40 = result.exerciseId === CATCH_40_EXERCISE_ID;
  const isBobs27 = result.exerciseId === BOBS_27_EXERCISE_ID;

  return (
    <div className="grid gap-5">
      <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-5">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Gennemført</p>
        <h2 className="mt-1 text-3xl font-black">{exercise?.name ?? "Træning"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatTile label="Score" value={numericMetric(result, "score") ?? "-"} />
          {isJdc ? (
            <>
              <StatTile label="Shanghai" value={numericMetric(result, "shanghaiCount") ?? 0} />
              <StatTile label="PR score" value={scorePersonalBest ?? "-"} />
              <StatTile label="PR Shanghai" value={shanghaiPersonalBest ?? "-"} />
            </>
          ) : isCatch40 ? (
            <>
              <StatTile label="Finishes" value={numericMetric(result, "checkouts") ?? 0} />
              <StatTile label="Lukke %" value={`${numericMetric(result, "checkoutPercent") ?? 0}%`} />
              <StatTile label="Højeste" value={numericMetric(result, "highestCheckout") || "-"} />
            </>
          ) : isBobs27 ? (
            <>
              <StatTile label="Hits" value={numericMetric(result, "hits") ?? 0} />
              <StatTile label="Forsøg" value={numericMetric(result, "attempts") ?? 0} />
              <StatTile label="Træf %" value={`${numericMetric(result, "hitPercent") ?? 0}%`} />
            </>
          ) : null}
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl bg-orange-500 px-5 py-4 text-base font-black text-gray-950 transition hover:bg-orange-400"
          >
            Spil igen
          </button>
          <button
            type="button"
            onClick={onPlayAgain}
            className="rounded-xl border border-gray-700 px-5 py-4 text-base font-black text-gray-300 transition hover:border-orange-500 hover:text-white"
          >
            Tilbage til træning
          </button>
          {(isCatch40 || isBobs27) ? (
            <button
              type="button"
              onClick={onToggleDetails}
              className="rounded-xl border border-emerald-600 px-5 py-4 text-base font-black text-emerald-200 transition hover:bg-emerald-900"
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
              ]
            : isCatch40
              ? [
                  { label: "Snit lukke %", value: checkoutPercentStats?.currentAverage ?? "-" },
                  { label: "PR lukke %", value: checkoutPercentPersonalBest !== null ? `${checkoutPercentPersonalBest}%` : "-" },
                  { label: "PR højeste luk", value: highestCheckoutPersonalBest ?? "-" },
                ]
              : [
                  { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                  { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                ]
        }
      />

      {showDetails && isCatch40 ? <Catch40DetailsTable details={getCatch40Details(result)} /> : null}
      {showDetails && isBobs27 ? <Bobs27DetailsTable details={getBobs27Details(result)} /> : null}
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
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
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
        <div key={target.checkoutValue} className="grid grid-cols-4 border-t border-gray-800 px-4 py-3 text-sm font-bold">
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
        <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-4 py-3 text-sm font-bold">
          <div>{target.target}</div>
          <div>{target.hits}</div>
          <div>{target.attempts}</div>
          <div className={target.scoreChange >= 0 ? "text-emerald-300" : "text-red-300"}>{target.scoreChange}</div>
        </div>
      ))}
    </section>
  );
}

function TableHeader({ columns }: { columns: string[] }) {
  return (
    <div className="grid grid-cols-4 bg-gray-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-gray-500">
      {columns.map((column) => (
        <div key={column}>{column}</div>
      ))}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-3xl font-black tabular-nums text-orange-400">{value}</div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string | number; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-950 px-3 py-2">
      <span className="text-sm font-semibold text-gray-400">{label}</span>
      <span className="text-base font-black tabular-nums text-white">{value}</span>
    </div>
  );
}
