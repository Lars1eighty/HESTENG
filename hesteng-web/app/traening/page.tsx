"use client";

import { useEffect, useRef, useState } from "react";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import { useOptionalCurrentUser } from "@/context/CurrentUserContext";
import {
  AROUND_THE_WORLD_EXERCISE_ID,
  BOBS_27_EXERCISE_ID,
  CATCH_40_EXERCISE_ID,
  GAME_420_EXERCISE_ID,
  JDC_CHALLENGE_EXERCISE_ID,
  PRIESTLEY_TRIPLES_EXERCISE_ID,
  RANDOM_TARGET_EXERCISE_ID,
  SCORING_EXERCISE_ID,
  TARGET_TRAINING_EXERCISE_ID,
  getTrainingExercise,
  trainingExercises,
} from "@/data/trainingExercises";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import {
  getTrainingResultsForPlayer,
  saveTrainingResultToSharedStore,
  subscribeToTrainingResults,
  syncTrainingResultsFromSharedStore,
} from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDirection, TrainingResult } from "@/lib/trainingTypes";

type ExerciseId =
  | typeof JDC_CHALLENGE_EXERCISE_ID
  | typeof CATCH_40_EXERCISE_ID
  | typeof BOBS_27_EXERCISE_ID
  | typeof GAME_420_EXERCISE_ID
  | typeof SCORING_EXERCISE_ID
  | typeof PRIESTLEY_TRIPLES_EXERCISE_ID
  | typeof AROUND_THE_WORLD_EXERCISE_ID
  | typeof TARGET_TRAINING_EXERCISE_ID
  | typeof RANDOM_TARGET_EXERCISE_ID;
type JdcThrow = "single" | "double" | "triple" | "miss";
type ScoringThrow = "single" | "double" | "triple" | "miss";
type PriestleyThrow = "single" | "double" | "triple" | "miss";
type AroundTheWorldInput = "hit" | "miss";
type AroundTheWorldVariant = "singles" | "doubles" | "triples";
type TargetTrainingSegment = "S" | "D" | "T" | "BULL";
type TargetTrainingTarget = {
  id: string;
  label: string;
  segment: TargetTrainingSegment;
  value: number;
};
type TargetTrainingDart = {
  dartNumber: number;
  round: number;
  targetHit: string | null;
};
type RandomTargetVariant = "SINGLES" | "DOUBLES" | "TRIPLES" | "MIXED";
type RandomTargetDart = {
  dartNumber: number;
  round: number;
  target: string;
  hit: boolean;
};
type ScoringTarget = {
  variant: "T20" | "T19" | "BULL";
  label: string;
  value: 20 | 19 | 25;
  allowTriple: boolean;
};

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

type PriestleyTarget = {
  target: string;
  value: number;
  singles: number;
  doubles: number;
  triples: number;
  misses: number;
  attempts: number;
  scoreChange: number;
};

type AroundTheWorldTarget = {
  target: string;
  attemptsBeforeHit: number;
  hit: boolean;
  cumulativeDarts: number;
};

type TargetTrainingSummary = {
  target: string;
  hits: number;
};

type TargetTrainingDetails = {
  selectedTargets: string[];
  rounds: number;
  totalDarts: number;
  darts: TargetTrainingDart[];
  targetSummary: TargetTrainingSummary[];
};

type RandomTargetSummary = {
  target: string;
  hits: number;
  attempts: number;
  hitPercent: number;
};

type RandomTargetDetails = {
  variant: RandomTargetVariant;
  rounds: number;
  totalDarts: number;
  darts: RandomTargetDart[];
  targetSummary: RandomTargetSummary[];
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
const SCORING_DARTS = 100;
const SCORING_TARGETS: ScoringTarget[] = [
  { variant: "T20", label: "20", value: 20, allowTriple: true },
  { variant: "T19", label: "19", value: 19, allowTriple: true },
  { variant: "BULL", label: "BULL", value: 25, allowTriple: false },
];
const PRIESTLEY_TARGETS = Array.from({ length: 11 }, (_, index) => ({
  target: `T${index + 10}`,
  value: index + 10,
}));
const PRIESTLEY_DARTS_PER_TARGET = 3;
const PRIESTLEY_TOTAL_DARTS = PRIESTLEY_TARGETS.length * PRIESTLEY_DARTS_PER_TARGET;
const AROUND_THE_WORLD_TARGETS = [
  ...Array.from({ length: 20 }, (_, index) => String(index + 1)),
  "BULL",
];
const AROUND_THE_WORLD_VARIANTS: { id: AroundTheWorldVariant; label: string; bullLabel: string }[] = [
  { id: "singles", label: "SINGLES", bullLabel: "S-BULL" },
  { id: "doubles", label: "DOUBLES", bullLabel: "D-BULL" },
  { id: "triples", label: "TRIPLES", bullLabel: "D-BULL" },
];
const TARGET_TRAINING_ROUND_OPTIONS = [5, 10, 20, 30, 50];
const TARGET_TRAINING_SEGMENTS: { id: TargetTrainingSegment; label: string }[] = [
  { id: "S", label: "Single" },
  { id: "D", label: "Double" },
  { id: "T", label: "Triple" },
  { id: "BULL", label: "Bull" },
];
const RANDOM_TARGET_VARIANTS: { id: RandomTargetVariant; label: string }[] = [
  { id: "SINGLES", label: "Singles" },
  { id: "DOUBLES", label: "Doubles" },
  { id: "TRIPLES", label: "Triples" },
  { id: "MIXED", label: "Blandet" },
];

function AroundTheWorldGameplay({
  variant,
  state,
  dartsUsedPersonalBest,
  hitPercentPersonalBest,
  onSelectVariant,
  onInput,
  onUndo,
  onAbort,
}: {
  variant: AroundTheWorldVariant | null;
  state: ReturnType<typeof calculateAroundTheWorldState>;
  dartsUsedPersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  onSelectVariant: (variant: AroundTheWorldVariant) => void;
  onInput: (value: AroundTheWorldInput) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  if (!variant) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Around the World</div>
        <h2 className="mt-2 text-3xl font-black">Vælg variant</h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">1-20 og Bull · færrest pile er bedst</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
          {AROUND_THE_WORLD_VARIANTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectVariant(option.id)}
              className="min-h-20 rounded-2xl border border-gray-800 bg-gray-950 px-3 py-4 text-2xl font-black text-white transition hover:border-orange-500 hover:text-orange-300 active:scale-[0.98] sm:min-h-28 sm:text-4xl"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <GameplayShell
      eyebrow={`Around the World - ${formatAroundTheWorldVariant(variant)}`}
      target={state.currentTargetLabel}
      meta={`${state.completedTargets}/${AROUND_THE_WORLD_TARGETS.length} targets · ${state.dartsUsed} pile brugt`}
      stats={[
        { label: "Pile", value: state.dartsUsed },
        { label: "Hits", value: `${state.hits}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "PR", value: dartsUsedPersonalBest !== null ? `${dartsUsedPersonalBest} pile` : "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.attempts > 0}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
        <CompactStat label="Variant" value={formatAroundTheWorldVariant(variant)} />
        <CompactStat label="Misses" value={state.misses} />
        <CompactStat label="På target" value={state.attemptsOnCurrentTarget} />
        <CompactStat label="PR træf %" value={hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <TouchButton label="HIT" tone="green" onClick={() => onInput("hit")} />
        <TouchButton label="MISS" tone="red" onClick={() => onInput("miss")} />
      </div>
    </GameplayShell>
  );
}

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

function percentOneDecimal(done: number, attempts: number) {
  return attempts > 0 ? Math.round((done / attempts) * 1000) / 10 : 0;
}

function isPlayableExerciseId(exerciseId: string): exerciseId is ExerciseId {
  return [
    JDC_CHALLENGE_EXERCISE_ID,
    CATCH_40_EXERCISE_ID,
    BOBS_27_EXERCISE_ID,
    GAME_420_EXERCISE_ID,
    SCORING_EXERCISE_ID,
    PRIESTLEY_TRIPLES_EXERCISE_ID,
    AROUND_THE_WORLD_EXERCISE_ID,
    TARGET_TRAINING_EXERCISE_ID,
    RANDOM_TARGET_EXERCISE_ID,
  ].includes(exerciseId);
}

function getTrainingHash(view: "dashboard" | "details" | "play" | "result", exerciseId?: string) {
  if (view === "dashboard") return "#min-traening";
  if (!exerciseId) return "#min-traening";
  return `#${view}=${encodeURIComponent(exerciseId)}`;
}

function parseTrainingHash(hash: string): { view: "dashboard" | "details" | "play" | "result"; exerciseId: ExerciseId | null } {
  const cleaned = hash.replace(/^#/, "");
  const [view, rawExerciseId] = cleaned.split("=");
  const exerciseId = rawExerciseId ? decodeURIComponent(rawExerciseId) : "";

  if ((view === "details" || view === "play" || view === "result") && isPlayableExerciseId(exerciseId)) {
    return { view, exerciseId };
  }

  return { view: "dashboard", exerciseId: null };
}

export default function TrainingPage() {
  const currentUserContext = useOptionalCurrentUser();

  if (!currentUserContext) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <Header />
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-5 py-12 text-center sm:px-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Min træning</div>
          <h1 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">Log ind for at se din træning</h1>
          <p className="mt-4 text-lg text-gray-300">
            Træningshistorik er klar til server-side PlayerProfile. Lokal development bruger fortsat demo-spiller.
          </p>
        </section>
      </main>
    );
  }

  return <TrainingPageContent currentUserContext={currentUserContext} />;
}

function TrainingPageContent({ currentUserContext }: { currentUserContext: NonNullable<ReturnType<typeof useOptionalCurrentUser>> }) {
  const { currentClubId, currentClub } = useClub();
  const { currentPlayer, currentPlayerId } = currentUserContext;
  const [activeExerciseId, setActiveExerciseId] = useState<ExerciseId | null>(null);
  const activeExercise = activeExerciseId ? getTrainingExercise(activeExerciseId) : null;
  const [results, setResults] = useState<TrainingResult[]>([]);
  const [lastSavedResult, setLastSavedResult] = useState<TrainingResult | null>(null);
  const [selectedDashboardExerciseId, setSelectedDashboardExerciseId] = useState<string | null>(null);
  const [jdcThrows, setJdcThrows] = useState<JdcThrow[]>([]);
  const [catch40Results, setCatch40Results] = useState<Catch40Result[]>([]);
  const [bobs27Results, setBobs27Results] = useState<Bobs27Target[]>([]);
  const [game420Results, setGame420Results] = useState<Game420Target[]>([]);
  const [scoringTarget, setScoringTarget] = useState<ScoringTarget | null>(null);
  const [scoringThrows, setScoringThrows] = useState<ScoringThrow[]>([]);
  const [priestleyThrows, setPriestleyThrows] = useState<PriestleyThrow[]>([]);
  const [aroundTheWorldVariant, setAroundTheWorldVariant] = useState<AroundTheWorldVariant | null>(null);
  const [aroundTheWorldInputs, setAroundTheWorldInputs] = useState<AroundTheWorldInput[]>([]);
  const [targetTrainingTargets, setTargetTrainingTargets] = useState<TargetTrainingTarget[]>([]);
  const [targetTrainingRounds, setTargetTrainingRounds] = useState(20);
  const [targetTrainingSegment, setTargetTrainingSegment] = useState<TargetTrainingSegment>("T");
  const [targetTrainingStarted, setTargetTrainingStarted] = useState(false);
  const [targetTrainingDarts, setTargetTrainingDarts] = useState<TargetTrainingDart[]>([]);
  const [randomTargetVariant, setRandomTargetVariant] = useState<RandomTargetVariant | null>(null);
  const [randomTargetRounds, setRandomTargetRounds] = useState(20);
  const [randomTargetStarted, setRandomTargetStarted] = useState(false);
  const [randomTargetGeneratedTargets, setRandomTargetGeneratedTargets] = useState<TargetTrainingTarget[]>([]);
  const [randomTargetDarts, setRandomTargetDarts] = useState<RandomTargetDart[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingBackTargetHash, setPendingBackTargetHash] = useState<string | null>(null);

  const activeVariant = activeExerciseId === SCORING_EXERCISE_ID
    ? scoringTarget?.variant
    : activeExerciseId === AROUND_THE_WORLD_EXERCISE_ID
      ? aroundTheWorldVariant ?? undefined
      : activeExerciseId === TARGET_TRAINING_EXERCISE_ID
        ? targetTrainingTargets.length > 0 ? buildTargetTrainingVariant(targetTrainingTargets, targetTrainingRounds) : undefined
        : activeExerciseId === RANDOM_TARGET_EXERCISE_ID
          ? randomTargetVariant ? buildRandomTargetVariant(randomTargetVariant, randomTargetRounds) : undefined
      : undefined;
  const selectedPlayerResults = results.filter((result) => (
    result.playerId === currentPlayerId &&
    result.exerciseId === activeExerciseId &&
    (activeVariant === undefined || result.variant === activeVariant)
  ));
  const monthlyStats = activeExercise
    ? calculateTrainingMonthlyStats(results, activeExercise, {
        playerId: currentPlayerId,
        variant: activeVariant,
        month: currentMonthKey(),
      })
    : null;
  const scoreStats = monthlyStats?.metrics.find((metric) => metric.key === "score") ?? null;
  const shanghaiStats = monthlyStats?.metrics.find((metric) => metric.key === "shanghaiCount") ?? null;
  const checkoutPercentStats = monthlyStats?.metrics.find((metric) => metric.key === "checkoutPercent") ?? null;
  const hitPercentStats = monthlyStats?.metrics.find((metric) => metric.key === "hitPercent") ?? null;
  const triplesStats = monthlyStats?.metrics.find((metric) => metric.key === "triples") ?? null;
  const scorePersonalBest = personalBest(selectedPlayerResults, "score", "higherIsBetter");
  const checkoutPercentPersonalBest = personalBest(selectedPlayerResults, "checkoutPercent", "higherIsBetter");
  const highestCheckoutPersonalBest = personalBest(selectedPlayerResults, "highestCheckout", "higherIsBetter");
  const hitPercentPersonalBest = personalBest(selectedPlayerResults, "hitPercent", "higherIsBetter");
  const remaining420PersonalBest = personalBest(selectedPlayerResults, "remaining420", "lowerIsBetter");
  const triplesPersonalBest = personalBest(selectedPlayerResults, "triples", "higherIsBetter");
  const dartsUsedPersonalBest = personalBest(selectedPlayerResults, "dartsUsed", "lowerIsBetter");
  const jdcState = calculateJdcState(jdcThrows);
  const catch40State = calculateCatch40State(catch40Results);
  const bobs27State = calculateBobs27State(bobs27Results);
  const game420State = calculateGame420State(game420Results);
  const scoringState = calculateScoringState(scoringThrows, scoringTarget);
  const priestleyState = calculatePriestleyState(priestleyThrows);
  const aroundTheWorldState = calculateAroundTheWorldState(aroundTheWorldInputs, aroundTheWorldVariant);
  const targetTrainingState = calculateTargetTrainingState(targetTrainingTargets, targetTrainingRounds, targetTrainingDarts);
  const randomTargetState = calculateRandomTargetState(randomTargetGeneratedTargets, randomTargetRounds, randomTargetDarts);
  const hasActiveTrainingInput = !lastSavedResult && (
    jdcThrows.length > 0 ||
    catch40Results.length > 0 ||
    bobs27Results.length > 0 ||
    game420Results.length > 0 ||
    scoringThrows.length > 0 ||
    priestleyThrows.length > 0 ||
    aroundTheWorldInputs.length > 0 ||
    targetTrainingDarts.length > 0 ||
    randomTargetDarts.length > 0
  );
  const currentTrainingHash = lastSavedResult && activeExerciseId
    ? getTrainingHash("result", activeExerciseId)
    : activeExerciseId
      ? getTrainingHash("play", activeExerciseId)
      : selectedDashboardExerciseId
        ? getTrainingHash("details", selectedDashboardExerciseId)
        : getTrainingHash("dashboard");
  const navigationStateRef = useRef({
    activeExerciseId,
    lastSavedResult,
    hasActiveTrainingInput,
    currentTrainingHash,
  });

  navigationStateRef.current = {
    activeExerciseId,
    lastSavedResult,
    hasActiveTrainingInput,
    currentTrainingHash,
  };

  function refreshResults() {
    void syncTrainingResultsFromSharedStore(currentPlayerId).then(setResults);
  }

  function resetGameplayState() {
    setLastSavedResult(null);
    setShowDetails(false);
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
    setScoringThrows([]);
    setPriestleyThrows([]);
    setAroundTheWorldInputs([]);
    setTargetTrainingDarts([]);
    setTargetTrainingStarted(false);
    setRandomTargetDarts([]);
    setRandomTargetStarted(false);
  }

  function resetExerciseSessionState(exerciseId: ExerciseId) {
    resetGameplayState();
    if (exerciseId !== SCORING_EXERCISE_ID) {
      setScoringTarget(null);
    }
    if (exerciseId !== AROUND_THE_WORLD_EXERCISE_ID) {
      setAroundTheWorldVariant(null);
    }
    if (exerciseId !== TARGET_TRAINING_EXERCISE_ID) {
      setTargetTrainingTargets([]);
      setTargetTrainingRounds(20);
      setTargetTrainingSegment("T");
    }
    if (exerciseId !== RANDOM_TARGET_EXERCISE_ID) {
      setRandomTargetVariant(null);
      setRandomTargetRounds(20);
      setRandomTargetGeneratedTargets([]);
    }
  }

  function applyTrainingHash(hash: string, options: { discardActiveTraining?: boolean } = {}) {
    const target = parseTrainingHash(hash);
    const currentState = navigationStateRef.current;

    if (currentState.hasActiveTrainingInput && !options.discardActiveTraining) {
      setPendingBackTargetHash(hash);
      if (window.location.hash !== currentState.currentTrainingHash) {
        window.history.pushState({ hestengTraining: true }, "", currentState.currentTrainingHash);
      }
      return;
    }

    if (target.view === "dashboard") {
      setActiveExerciseId(null);
      setSelectedDashboardExerciseId(null);
      resetGameplayState();
      refreshResults();
      return;
    }

    if (target.view === "details" && target.exerciseId) {
      setActiveExerciseId(null);
      setSelectedDashboardExerciseId(target.exerciseId);
      resetGameplayState();
      refreshResults();
      return;
    }

    if (target.exerciseId) {
      setActiveExerciseId(target.exerciseId);
      setSelectedDashboardExerciseId(null);
      setShowDetails(false);
      if (target.view === "play") {
        resetGameplayState();
      }
    }
  }

  function pushTrainingHash(hash: string) {
    if (typeof window === "undefined") return;
    if (window.location.hash === hash) return;
    window.history.pushState({ hestengTraining: true }, "", hash);
  }

  function replaceTrainingHash(hash: string) {
    if (typeof window === "undefined") return;
    window.history.replaceState({ hestengTraining: true }, "", hash);
  }

  useEffect(() => {
    let cancelled = false;

    async function syncResults() {
      const nextResults = await syncTrainingResultsFromSharedStore(currentPlayerId);
      if (!cancelled) setResults(nextResults);
    }

    void syncResults();
    const unsubscribe = subscribeToTrainingResults(() => {
      setResults(getTrainingResultsForPlayer(currentPlayerId));
    });
    const interval = window.setInterval(syncResults, 5000);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [currentPlayerId]);

  useEffect(() => {
    if (!window.location.hash) {
      replaceTrainingHash(getTrainingHash("dashboard"));
    } else {
      window.setTimeout(() => applyTrainingHash(window.location.hash), 0);
    }

    function handlePopState() {
      applyTrainingHash(window.location.hash || getTrainingHash("dashboard"));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // The handler reads live state through navigationStateRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExerciseChange(exerciseId: ExerciseId) {
    if (hasActiveTrainingInput) {
      setPendingBackTargetHash(getTrainingHash("play", exerciseId));
      return;
    }

    setActiveExerciseId(exerciseId);
    setSelectedDashboardExerciseId(null);
    resetExerciseSessionState(exerciseId);
    pushTrainingHash(getTrainingHash("play", exerciseId));
  }

  function handleBackToDashboard() {
    setActiveExerciseId(null);
    setSelectedDashboardExerciseId(null);
    resetGameplayState();
    setScoringTarget(null);
    setAroundTheWorldVariant(null);
    setTargetTrainingTargets([]);
    setTargetTrainingRounds(20);
    setTargetTrainingSegment("T");
    setRandomTargetVariant(null);
    setRandomTargetRounds(20);
    setRandomTargetGeneratedTargets([]);
    pushTrainingHash(getTrainingHash("dashboard"));
    refreshResults();
  }

  function buildTrainingResult(exerciseId: ExerciseId, metrics: TrainingResult["metrics"], details?: TrainingResult["details"]) {
    return {
      id: `training-${exerciseId}-${currentPlayerId}-${Date.now()}`,
      clubId: currentClubId,
      playerId: currentPlayerId,
      exerciseId,
      variant: exerciseId === SCORING_EXERCISE_ID
        ? scoringTarget?.variant
        : exerciseId === AROUND_THE_WORLD_EXERCISE_ID
          ? aroundTheWorldVariant ?? undefined
          : exerciseId === TARGET_TRAINING_EXERCISE_ID
            ? buildTargetTrainingVariant(targetTrainingTargets, targetTrainingRounds)
            : exerciseId === RANDOM_TARGET_EXERCISE_ID
              ? randomTargetVariant ? buildRandomTargetVariant(randomTargetVariant, randomTargetRounds) : undefined
          : undefined,
      completedAt: new Date().toISOString(),
      metrics,
      details,
    };
  }

  function saveFinishedResult(result: TrainingResult) {
    setLastSavedResult(result);
    setShowDetails(false);
    replaceTrainingHash(getTrainingHash("result", result.exerciseId));
    void saveTrainingResultToSharedStore(result).then(setResults);
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

    if (activeExerciseId === SCORING_EXERCISE_ID) {
      setScoringThrows((items) => items.slice(0, -1));
    }

    if (activeExerciseId === PRIESTLEY_TRIPLES_EXERCISE_ID) {
      setPriestleyThrows((items) => items.slice(0, -1));
    }

    if (activeExerciseId === AROUND_THE_WORLD_EXERCISE_ID) {
      setAroundTheWorldInputs((items) => items.slice(0, -1));
    }

    if (activeExerciseId === TARGET_TRAINING_EXERCISE_ID) {
      setTargetTrainingDarts((items) => items.slice(0, -1));
    }

    if (activeExerciseId === RANDOM_TARGET_EXERCISE_ID) {
      setRandomTargetDarts((items) => items.slice(0, -1));
    }
  }

  function handleAbort() {
    if (lastSavedResult) {
      handlePlayAgain();
      return;
    }

    if (!jdcThrows.length && !catch40Results.length && !bobs27Results.length && !game420Results.length && !scoringThrows.length && !priestleyThrows.length && !aroundTheWorldInputs.length && !targetTrainingDarts.length && !randomTargetDarts.length) return;
    const confirmed = window.confirm("Afbryd træningen? Resultatet gemmes ikke.");
    if (!confirmed) return;
    setJdcThrows([]);
    setCatch40Results([]);
    setBobs27Results([]);
    setGame420Results([]);
    setScoringThrows([]);
    setPriestleyThrows([]);
    setAroundTheWorldInputs([]);
    setTargetTrainingDarts([]);
    setTargetTrainingStarted(false);
    setRandomTargetDarts([]);
    setRandomTargetStarted(false);
    setShowDetails(false);
  }

  function handlePlayAgain() {
    const exerciseId = activeExerciseId;
    resetGameplayState();
    if (exerciseId) pushTrainingHash(getTrainingHash("play", exerciseId));
    refreshResults();
  }

  function handleScoringTargetSelect(target: ScoringTarget) {
    if (lastSavedResult || scoringThrows.length > 0) return;
    setScoringTarget(target);
  }

  function handleScoringInput(value: ScoringThrow) {
    if (!scoringTarget || lastSavedResult || scoringState.isComplete) return;
    if (value === "triple" && !scoringTarget.allowTriple) return;
    const nextThrows = [...scoringThrows, value];
    setScoringThrows(nextThrows);

    const nextState = calculateScoringState(nextThrows, scoringTarget);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        SCORING_EXERCISE_ID,
        {
          score: nextState.score,
          singles: nextState.singles,
          doubles: nextState.doubles,
          triples: nextState.triples,
          misses: nextState.misses,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
          first50Score: nextState.first50Score,
          second50Score: nextState.second50Score,
        },
        {
          target: scoringTarget.variant,
          targetValue: scoringTarget.value,
          throws: nextThrows,
          first50Score: nextState.first50Score,
          second50Score: nextState.second50Score,
        }
      ));
    }
  }

  function handlePriestleyInput(value: PriestleyThrow) {
    if (lastSavedResult || priestleyState.isComplete) return;
    const nextThrows = [...priestleyThrows, value];
    setPriestleyThrows(nextThrows);

    const nextState = calculatePriestleyState(nextThrows);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        PRIESTLEY_TRIPLES_EXERCISE_ID,
        {
          score: nextState.score,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
          triples: nextState.triples,
          singles: nextState.singles,
          doubles: nextState.doubles,
          misses: nextState.misses,
        },
        {
          targets: nextState.details,
          throws: nextThrows,
          totalDarts: PRIESTLEY_TOTAL_DARTS,
        }
      ));
    }
  }

  function handleAroundTheWorldVariantSelect(variant: AroundTheWorldVariant) {
    if (lastSavedResult || aroundTheWorldInputs.length > 0) return;
    setAroundTheWorldVariant(variant);
  }

  function handleAroundTheWorldInput(value: AroundTheWorldInput) {
    if (!aroundTheWorldVariant || lastSavedResult || aroundTheWorldState.isComplete) return;
    const nextInputs = [...aroundTheWorldInputs, value];
    setAroundTheWorldInputs(nextInputs);

    const nextState = calculateAroundTheWorldState(nextInputs, aroundTheWorldVariant);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        AROUND_THE_WORLD_EXERCISE_ID,
        {
          dartsUsed: nextState.dartsUsed,
          hits: nextState.hits,
          attempts: nextState.attempts,
          hitPercent: nextState.hitPercent,
          misses: nextState.misses,
        },
        {
          variant: aroundTheWorldVariant,
          targets: nextState.details,
          inputs: nextInputs,
        }
      ));
    }
  }

  function handleTargetTrainingAddTarget(target: TargetTrainingTarget) {
    if (lastSavedResult || targetTrainingStarted || targetTrainingTargets.length >= 3) return;
    if (targetTrainingTargets.some((item) => item.id === target.id)) return;
    setTargetTrainingTargets((items) => [...items, target]);
  }

  function handleTargetTrainingRemoveTarget(targetId: string) {
    if (lastSavedResult || targetTrainingStarted) return;
    setTargetTrainingTargets((items) => items.filter((item) => item.id !== targetId));
  }

  function handleTargetTrainingRoundsChange(rounds: number) {
    if (lastSavedResult || targetTrainingStarted) return;
    setTargetTrainingRounds(Math.max(1, Math.min(99, rounds)));
  }

  function handleTargetTrainingStart() {
    if (lastSavedResult || targetTrainingTargets.length === 0 || targetTrainingTargets.length > 3) return;
    setTargetTrainingStarted(true);
  }

  function handleTargetTrainingInput(targetHit: string | null) {
    if (!targetTrainingStarted || lastSavedResult || targetTrainingState.isComplete) return;
    if (targetHit && !targetTrainingTargets.some((target) => target.id === targetHit)) return;

    const nextAttempt = targetTrainingDarts.length + 1;
    const nextDarts = [
      ...targetTrainingDarts,
      {
        dartNumber: nextAttempt,
        round: Math.ceil(nextAttempt / 3),
        targetHit,
      },
    ];
    setTargetTrainingDarts(nextDarts);

    const nextState = calculateTargetTrainingState(targetTrainingTargets, targetTrainingRounds, nextDarts);
    if (nextState.isComplete) {
      saveFinishedResult(buildTrainingResult(
        TARGET_TRAINING_EXERCISE_ID,
        {
          hitPercent: nextState.hitPercent,
          hits: nextState.hits,
          attempts: nextState.attempts,
        },
        {
          selectedTargets: nextState.selectedTargets,
          rounds: targetTrainingRounds,
          totalDarts: nextState.totalDarts,
          darts: nextDarts.map((dart) => ({
            ...dart,
            targetHit: dart.targetHit ? nextState.targetLabels[dart.targetHit] ?? dart.targetHit : "MISS",
          })),
          targetSummary: nextState.targetSummary,
        }
      ));
    }
  }

  function handleRandomTargetVariantSelect(variant: RandomTargetVariant) {
    if (lastSavedResult || randomTargetStarted || randomTargetDarts.length > 0) return;
    setRandomTargetVariant(variant);
  }

  function handleRandomTargetRoundsChange(rounds: number) {
    if (lastSavedResult || randomTargetStarted) return;
    setRandomTargetRounds(Math.max(1, Math.min(99, rounds)));
  }

  function handleRandomTargetStart() {
    if (!randomTargetVariant || lastSavedResult) return;
    const generatedTargets = generateRandomTargets(randomTargetVariant, randomTargetRounds * 3);
    setRandomTargetGeneratedTargets(generatedTargets);
    setRandomTargetStarted(true);
  }

  function handleRandomTargetInput(hit: boolean) {
    if (!randomTargetStarted || lastSavedResult || randomTargetState.isComplete) return;
    const target = randomTargetGeneratedTargets[randomTargetDarts.length];
    if (!target) return;

    const nextAttempt = randomTargetDarts.length + 1;
    const nextDarts = [
      ...randomTargetDarts,
      {
        dartNumber: nextAttempt,
        round: Math.ceil(nextAttempt / 3),
        target: target.label,
        hit,
      },
    ];
    setRandomTargetDarts(nextDarts);

    const nextState = calculateRandomTargetState(randomTargetGeneratedTargets, randomTargetRounds, nextDarts);
    if (nextState.isComplete && randomTargetVariant) {
      saveFinishedResult(buildTrainingResult(
        RANDOM_TARGET_EXERCISE_ID,
        {
          hitPercent: nextState.hitPercent,
          hits: nextState.hits,
          attempts: nextState.attempts,
          misses: nextState.misses,
          singleHits: nextState.singleHits,
          doubleHits: nextState.doubleHits,
          tripleHits: nextState.tripleHits,
          bullHits: nextState.bullHits,
        },
        {
          variant: randomTargetVariant,
          rounds: randomTargetRounds,
          totalDarts: nextState.totalDarts,
          generatedTargets: randomTargetGeneratedTargets.map((item) => item.label),
          darts: nextDarts,
          targetSummary: nextState.targetSummary,
        }
      ));
    }
  }

  function handleDashboardDetailsToggle(exerciseId: string) {
    const nextExerciseId = selectedDashboardExerciseId === exerciseId ? null : exerciseId;
    setSelectedDashboardExerciseId(nextExerciseId);
    pushTrainingHash(nextExerciseId ? getTrainingHash("details", nextExerciseId) : getTrainingHash("dashboard"));
  }

  function continueActiveTraining() {
    setPendingBackTargetHash(null);
  }

  function confirmLeaveActiveTraining() {
    const targetHash = pendingBackTargetHash ?? getTrainingHash("dashboard");
    setPendingBackTargetHash(null);
    applyTrainingHash(targetHash, { discardActiveTraining: true });
    replaceTrainingHash(targetHash);
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
            selectedExerciseId={selectedDashboardExerciseId}
            onToggleExerciseDetails={handleDashboardDetailsToggle}
            onStartExercise={handleExerciseChange}
          />
        ) : (
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-gray-800 bg-gray-900 p-1 sm:mb-5 sm:grid-cols-3 lg:grid-cols-9 sm:gap-2 sm:p-2">
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
            <ExerciseTab
              active={activeExerciseId === SCORING_EXERCISE_ID}
              title="Scoring"
              description="100 pile"
              onClick={() => handleExerciseChange(SCORING_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === PRIESTLEY_TRIPLES_EXERCISE_ID}
              title="Priestley's Triples"
              description="T10-T20"
              onClick={() => handleExerciseChange(PRIESTLEY_TRIPLES_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === AROUND_THE_WORLD_EXERCISE_ID}
              title="Around the World"
              description="1-20-Bull"
              onClick={() => handleExerciseChange(AROUND_THE_WORLD_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === TARGET_TRAINING_EXERCISE_ID}
              title="Target Training"
              description="1-3 targets"
              onClick={() => handleExerciseChange(TARGET_TRAINING_EXERCISE_ID)}
            />
            <ExerciseTab
              active={activeExerciseId === RANDOM_TARGET_EXERCISE_ID}
              title="Random Target"
              description="Tilfældige targets"
              onClick={() => handleExerciseChange(RANDOM_TARGET_EXERCISE_ID)}
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
            triplesStats={triplesStats}
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
        ) : activeExerciseId === SCORING_EXERCISE_ID ? (
          <ScoringGameplay
            target={scoringTarget}
            state={scoringState}
            scorePersonalBest={scorePersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onSelectTarget={handleScoringTargetSelect}
            onInput={handleScoringInput}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === PRIESTLEY_TRIPLES_EXERCISE_ID ? (
          <PriestleyGameplay
            state={priestleyState}
            scorePersonalBest={scorePersonalBest}
            triplesPersonalBest={triplesPersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onInput={handlePriestleyInput}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === AROUND_THE_WORLD_EXERCISE_ID ? (
          <AroundTheWorldGameplay
            variant={aroundTheWorldVariant}
            state={aroundTheWorldState}
            dartsUsedPersonalBest={dartsUsedPersonalBest}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onSelectVariant={handleAroundTheWorldVariantSelect}
            onInput={handleAroundTheWorldInput}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === TARGET_TRAINING_EXERCISE_ID ? (
          <TargetTrainingGameplay
            selectedTargets={targetTrainingTargets}
            rounds={targetTrainingRounds}
            segment={targetTrainingSegment}
            started={targetTrainingStarted}
            state={targetTrainingState}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onSelectSegment={setTargetTrainingSegment}
            onAddTarget={handleTargetTrainingAddTarget}
            onRemoveTarget={handleTargetTrainingRemoveTarget}
            onSetRounds={handleTargetTrainingRoundsChange}
            onStart={handleTargetTrainingStart}
            onInput={handleTargetTrainingInput}
            onUndo={handleUndo}
            onAbort={handleAbort}
          />
        ) : activeExerciseId === RANDOM_TARGET_EXERCISE_ID ? (
          <RandomTargetGameplay
            variant={randomTargetVariant}
            rounds={randomTargetRounds}
            started={randomTargetStarted}
            state={randomTargetState}
            hitPercentPersonalBest={hitPercentPersonalBest}
            onSelectVariant={handleRandomTargetVariantSelect}
            onSetRounds={handleRandomTargetRoundsChange}
            onStart={handleRandomTargetStart}
            onInput={handleRandomTargetInput}
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

        {pendingBackTargetHash ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-950 p-5 shadow-2xl">
              <h2 className="text-2xl font-black">Vil du afslutte træningen?</h2>
              <p className="mt-2 text-sm font-semibold text-gray-400">
                Resultatet bliver ikke gemt.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={continueActiveTraining}
                  className="rounded-xl border border-gray-700 px-5 py-4 font-black text-gray-200 transition hover:border-orange-500 hover:text-white"
                >
                  Fortsæt træning
                </button>
                <button
                  type="button"
                  onClick={confirmLeaveActiveTraining}
                  className="rounded-xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-500"
                >
                  Afslut
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function TrainingDashboard({
  results,
  currentPlayerId,
  selectedExerciseId,
  onToggleExerciseDetails,
  onStartExercise,
}: {
  results: TrainingResult[];
  currentPlayerId: string;
  selectedExerciseId: string | null;
  onToggleExerciseDetails: (exerciseId: string) => void;
  onStartExercise: (exerciseId: ExerciseId) => void;
}) {
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
            onToggle={() => onToggleExerciseDetails(summary.exercise.id)}
            onStart={() => onStartExercise(summary.exercise.id as ExerciseId)}
          />
        ))}
      </section>
    </div>
  );
}

function buildExerciseSummary(exercise: TrainingExercise, results: TrainingResult[], currentPlayerId: string) {
  const summaryVariant = getSummaryVariant(exercise.id, results, currentPlayerId);
  const exerciseResults = results
    .filter((result) => (
      result.playerId === currentPlayerId &&
      result.exerciseId === exercise.id &&
      (summaryVariant === undefined || result.variant === summaryVariant)
    ))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  const primaryMetric = getPrimaryMetric(exercise);
  const monthly = calculateTrainingMonthlyStats(results, exercise, {
    playerId: currentPlayerId,
    variant: summaryVariant,
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
    variant: summaryVariant,
    results: exerciseResults,
    primaryMetric,
    primaryStats,
    latest,
    personalRecord,
    monthly,
    focus,
  };
}

function getSummaryVariant(exerciseId: string, results: TrainingResult[], currentPlayerId: string) {
  if (exerciseId !== SCORING_EXERCISE_ID && exerciseId !== AROUND_THE_WORLD_EXERCISE_ID && exerciseId !== TARGET_TRAINING_EXERCISE_ID && exerciseId !== RANDOM_TARGET_EXERCISE_ID) return undefined;
  const latestVariantResult = results
    .filter((result) => result.playerId === currentPlayerId && result.exerciseId === exerciseId && result.variant)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

  if (latestVariantResult?.variant) return latestVariantResult.variant;
  if (exerciseId === SCORING_EXERCISE_ID) return SCORING_TARGETS[0].variant;
  if (exerciseId === AROUND_THE_WORLD_EXERCISE_ID) return AROUND_THE_WORLD_VARIANTS[0].id;
  if (exerciseId === TARGET_TRAINING_EXERCISE_ID) return "__target-training-unconfigured__";
  return "__random-target-unconfigured__";
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
          <h3 className="mt-1 text-2xl font-black leading-tight">
            {summary.exercise.name}
            {summary.variant ? <span className="ml-2 text-base text-orange-300">{summary.variant}</span> : null}
          </h3>
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

  if (result.exerciseId === SCORING_EXERCISE_ID) {
    return `${result.variant ?? "Target"} · Hits ${numericMetric(result, "hits") ?? "-"}/${numericMetric(result, "attempts") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  if (result.exerciseId === PRIESTLEY_TRIPLES_EXERCISE_ID) {
    return `Triples ${numericMetric(result, "triples") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  if (result.exerciseId === AROUND_THE_WORLD_EXERCISE_ID) {
    return `${formatAroundTheWorldVariant(result.variant)} · ${numericMetric(result, "dartsUsed") ?? "-"} pile · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  if (result.exerciseId === TARGET_TRAINING_EXERCISE_ID) {
    return `${formatTargetTrainingVariant(result.variant, result)} · Hits ${numericMetric(result, "hits") ?? "-"}/${numericMetric(result, "attempts") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  if (result.exerciseId === RANDOM_TARGET_EXERCISE_ID) {
    return `${formatRandomTargetVariant(result.variant)} · Hits ${numericMetric(result, "hits") ?? "-"}/${numericMetric(result, "attempts") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
  }

  return `Hits ${numericMetric(result, "hits") ?? "-"} · Træf ${numericMetric(result, "hitPercent") ?? "-"}%`;
}

function formatAroundTheWorldVariant(variant: string | undefined) {
  if (variant === "singles") return "Singles";
  if (variant === "doubles") return "Doubles";
  if (variant === "triples") return "Triples";
  return "Variant";
}

function makeTargetTrainingTarget(segment: TargetTrainingSegment, value: number): TargetTrainingTarget {
  if (segment === "BULL") {
    return {
      id: value === 25 ? "OB" : "BULL",
      label: value === 25 ? "Outer Bull" : "Bull",
      segment,
      value,
    };
  }

  return {
    id: `${segment}${value}`,
    label: `${segment}${value}`,
    segment,
    value,
  };
}

function targetTrainingSortValue(targetId: string) {
  if (targetId === "OB") return 400;
  if (targetId === "BULL") return 500;
  const segment = targetId[0];
  const value = Number(targetId.slice(1));
  const segmentRank: Record<string, number> = { S: 0, D: 100, T: 200 };
  return (segmentRank[segment] ?? 300) + value;
}

function buildTargetTrainingVariant(targets: TargetTrainingTarget[], rounds: number) {
  const targetIds = targets.map((target) => target.id).sort((a, b) => targetTrainingSortValue(a) - targetTrainingSortValue(b));
  return `${targetIds.join("-")}|${rounds}R`;
}

function formatTargetTrainingVariant(variant: string | undefined, result?: TrainingResult) {
  const selectedTargets = result?.details?.selectedTargets;
  const rounds = typeof result?.details?.rounds === "number" ? result.details.rounds : null;
  if (Array.isArray(selectedTargets) && selectedTargets.every((target) => typeof target === "string")) {
    return `${selectedTargets.join(" · ")}${rounds ? ` · ${rounds}R` : ""}`;
  }

  if (!variant) return "Setup";
  const [targets, roundPart] = variant.split("|");
  return `${targets.replaceAll("-", " · ")}${roundPart ? ` · ${roundPart}` : ""}`;
}

function buildRandomTargetVariant(variant: RandomTargetVariant, rounds: number) {
  return `${variant}|${rounds}R`;
}

function formatRandomTargetVariant(variant: string | undefined) {
  if (!variant) return "Variant";
  const [variantId, rounds] = variant.split("|");
  const label = RANDOM_TARGET_VARIANTS.find((item) => item.id === variantId)?.label ?? variantId;
  return `${label}${rounds ? ` · ${rounds}` : ""}`;
}

function getRandomTargetPool(variant: RandomTargetVariant) {
  if (variant === "SINGLES") {
    return Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("S", index + 1));
  }

  if (variant === "DOUBLES") {
    return [
      ...Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("D", index + 1)),
      makeTargetTrainingTarget("BULL", 50),
    ];
  }

  if (variant === "TRIPLES") {
    return Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("T", index + 1));
  }

  return [
    ...Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("S", index + 1)),
    ...Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("D", index + 1)),
    ...Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget("T", index + 1)),
    makeTargetTrainingTarget("BULL", 25),
    makeTargetTrainingTarget("BULL", 50),
  ];
}

function generateRandomTargets(variant: RandomTargetVariant, totalDarts: number) {
  const pool = getRandomTargetPool(variant);
  return Array.from({ length: totalDarts }, () => pool[Math.floor(Math.random() * pool.length)]);
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

function scoringThrowPoints(value: ScoringThrow) {
  if (value === "single") return 1;
  if (value === "double") return 2;
  if (value === "triple") return 3;
  return 0;
}

function calculateScoringState(throws: ScoringThrow[], target: ScoringTarget | null) {
  const limitedThrows = throws.slice(0, SCORING_DARTS);
  const singles = limitedThrows.filter((value) => value === "single").length;
  const doubles = limitedThrows.filter((value) => value === "double").length;
  const triples = limitedThrows.filter((value) => value === "triple").length;
  const misses = limitedThrows.filter((value) => value === "miss").length;
  const hits = singles + doubles + triples;
  const attempts = limitedThrows.length;
  const first50Score = limitedThrows.slice(0, 50).reduce((sum, value) => sum + scoringThrowPoints(value), 0);
  const second50Score = limitedThrows.slice(50, 100).reduce((sum, value) => sum + scoringThrowPoints(value), 0);
  const score = first50Score + second50Score;

  return {
    target,
    score,
    singles,
    doubles,
    triples,
    misses,
    hits,
    attempts,
    hitPercent: percent(hits, attempts),
    first50Score,
    second50Score,
    dartsRemaining: SCORING_DARTS - attempts,
    isComplete: attempts >= SCORING_DARTS,
  };
}

function calculatePriestleyState(throws: PriestleyThrow[]) {
  const limitedThrows = throws.slice(0, PRIESTLEY_TOTAL_DARTS);
  const singles = limitedThrows.filter((value) => value === "single").length;
  const doubles = limitedThrows.filter((value) => value === "double").length;
  const triples = limitedThrows.filter((value) => value === "triple").length;
  const attempts = limitedThrows.length;
  const hits = triples;
  const misses = attempts - triples;
  const details = PRIESTLEY_TARGETS.map((target, index) => {
    const targetThrows = limitedThrows.slice(index * PRIESTLEY_DARTS_PER_TARGET, (index + 1) * PRIESTLEY_DARTS_PER_TARGET);
    const targetTriples = targetThrows.filter((value) => value === "triple").length;

    return {
      target: target.target,
      value: target.value,
      singles: targetThrows.filter((value) => value === "single").length,
      doubles: targetThrows.filter((value) => value === "double").length,
      triples: targetTriples,
      misses: targetThrows.length - targetTriples,
      attempts: targetThrows.length,
      scoreChange: targetTriples,
    };
  });
  const completedTargets = Math.floor(attempts / PRIESTLEY_DARTS_PER_TARGET);
  const currentTarget = PRIESTLEY_TARGETS[completedTargets] ?? null;
  const currentDart = attempts % PRIESTLEY_DARTS_PER_TARGET + 1;

  return {
    score: triples,
    singles,
    doubles,
    triples,
    misses,
    hits,
    attempts,
    hitPercent: percent(hits, attempts),
    completedTargets,
    remainingTargets: PRIESTLEY_TARGETS.length - completedTargets,
    currentTarget,
    currentDart,
    dartsRemaining: PRIESTLEY_TOTAL_DARTS - attempts,
    details,
    isComplete: attempts >= PRIESTLEY_TOTAL_DARTS,
  };
}

function getAroundTheWorldTargetLabel(target: string, variant: AroundTheWorldVariant | null) {
  if (target !== "BULL") {
    if (variant === "doubles") return `D${target}`;
    if (variant === "triples") return `T${target}`;
    return `S${target}`;
  }

  return AROUND_THE_WORLD_VARIANTS.find((item) => item.id === variant)?.bullLabel ?? "BULL";
}

function calculateAroundTheWorldState(inputs: AroundTheWorldInput[], variant: AroundTheWorldVariant | null) {
  let targetIndex = 0;
  const details: AroundTheWorldTarget[] = [];
  let attemptsOnCurrentTarget = 0;

  for (const input of inputs) {
    if (targetIndex >= AROUND_THE_WORLD_TARGETS.length) break;
    attemptsOnCurrentTarget += 1;

    if (input === "hit") {
      const target = AROUND_THE_WORLD_TARGETS[targetIndex];
      details.push({
        target: getAroundTheWorldTargetLabel(target, variant),
        attemptsBeforeHit: attemptsOnCurrentTarget,
        hit: true,
        cumulativeDarts: details.reduce((sum, detail) => sum + detail.attemptsBeforeHit, 0) + attemptsOnCurrentTarget,
      });
      targetIndex += 1;
      attemptsOnCurrentTarget = 0;
    }
  }

  const attempts = inputs.length;
  const hits = details.length;
  const misses = attempts - hits;
  const currentTarget = AROUND_THE_WORLD_TARGETS[targetIndex] ?? null;

  return {
    dartsUsed: attempts,
    hits,
    attempts,
    misses,
    hitPercent: percent(hits, attempts),
    completedTargets: hits,
    remainingTargets: AROUND_THE_WORLD_TARGETS.length - hits,
    currentTarget,
    currentTargetLabel: currentTarget ? getAroundTheWorldTargetLabel(currentTarget, variant) : "Færdig",
    attemptsOnCurrentTarget,
    details,
    isComplete: hits >= AROUND_THE_WORLD_TARGETS.length,
  };
}

function calculateTargetTrainingState(targets: TargetTrainingTarget[], rounds: number, darts: TargetTrainingDart[]) {
  const totalDarts = rounds * 3;
  const limitedDarts = darts.slice(0, totalDarts);
  const hits = limitedDarts.filter((dart) => dart.targetHit !== null).length;
  const attempts = limitedDarts.length;
  const targetLabels = Object.fromEntries(targets.map((target) => [target.id, target.label]));
  const targetSummary = targets.map((target) => ({
    target: target.label,
    hits: limitedDarts.filter((dart) => dart.targetHit === target.id).length,
  }));

  return {
    selectedTargets: targets.map((target) => target.label),
    targetLabels,
    targetSummary,
    rounds,
    totalDarts,
    currentRound: Math.min(rounds, Math.floor(attempts / 3) + 1),
    currentDartInRound: attempts % 3 + 1,
    hits,
    attempts,
    misses: attempts - hits,
    hitPercent: percentOneDecimal(hits, attempts),
    dartsRemaining: totalDarts - attempts,
    isComplete: attempts >= totalDarts,
  };
}

function calculateRandomTargetState(generatedTargets: TargetTrainingTarget[], rounds: number, darts: RandomTargetDart[]) {
  const totalDarts = rounds * 3;
  const limitedDarts = darts.slice(0, totalDarts);
  const hits = limitedDarts.filter((dart) => dart.hit).length;
  const attempts = limitedDarts.length;
  const targetSummary = generatedTargets
    .slice(0, totalDarts)
    .reduce<Record<string, RandomTargetSummary>>((summary, target, index) => {
      const dart = limitedDarts[index];
      const existing = summary[target.label] ?? {
        target: target.label,
        hits: 0,
        attempts: 0,
        hitPercent: 0,
      };

      existing.attempts += 1;
      existing.hits += dart?.hit ? 1 : 0;
      existing.hitPercent = percentOneDecimal(existing.hits, existing.attempts);
      summary[target.label] = existing;
      return summary;
    }, {});
  const hitTargets = limitedDarts
    .filter((dart) => dart.hit)
    .map((dart) => generatedTargets[dart.dartNumber - 1])
    .filter((target): target is TargetTrainingTarget => Boolean(target));

  return {
    rounds,
    totalDarts,
    currentRound: Math.min(rounds, Math.floor(attempts / 3) + 1),
    currentDartInRound: attempts % 3 + 1,
    currentTarget: generatedTargets[attempts] ?? null,
    hits,
    attempts,
    misses: attempts - hits,
    hitPercent: percentOneDecimal(hits, attempts),
    singleHits: hitTargets.filter((target) => target.segment === "S").length,
    doubleHits: hitTargets.filter((target) => target.segment === "D").length,
    tripleHits: hitTargets.filter((target) => target.segment === "T").length,
    bullHits: hitTargets.filter((target) => target.id === "OB" || target.id === "BULL").length,
    dartsRemaining: totalDarts - attempts,
    targetSummary: Object.values(targetSummary),
    isComplete: attempts >= totalDarts,
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

function getPriestleyDetails(result: TrainingResult): PriestleyTarget[] {
  const targets = result.details?.targets;
  if (!Array.isArray(targets)) return [];

  return targets.filter((target): target is PriestleyTarget => {
    return (
      typeof target === "object" &&
      target !== null &&
      "target" in target &&
      "value" in target &&
      "singles" in target &&
      "doubles" in target &&
      "triples" in target &&
      "misses" in target &&
      "attempts" in target &&
      "scoreChange" in target &&
      typeof target.target === "string" &&
      typeof target.value === "number" &&
      typeof target.singles === "number" &&
      typeof target.doubles === "number" &&
      typeof target.triples === "number" &&
      typeof target.misses === "number" &&
      typeof target.attempts === "number" &&
      typeof target.scoreChange === "number"
    );
  });
}

function getAroundTheWorldDetails(result: TrainingResult): AroundTheWorldTarget[] {
  const targets = result.details?.targets;
  if (!Array.isArray(targets)) return [];

  return targets.filter((target): target is AroundTheWorldTarget => {
    return (
      typeof target === "object" &&
      target !== null &&
      "target" in target &&
      "attemptsBeforeHit" in target &&
      "hit" in target &&
      "cumulativeDarts" in target &&
      typeof target.target === "string" &&
      typeof target.attemptsBeforeHit === "number" &&
      typeof target.hit === "boolean" &&
      typeof target.cumulativeDarts === "number"
    );
  });
}

function getTargetTrainingDetails(result: TrainingResult): TargetTrainingDetails {
  const selectedTargets = Array.isArray(result.details?.selectedTargets)
    ? result.details.selectedTargets.filter((target): target is string => typeof target === "string")
    : [];
  const rounds = typeof result.details?.rounds === "number" ? result.details.rounds : 0;
  const totalDarts = typeof result.details?.totalDarts === "number" ? result.details.totalDarts : numericMetric(result, "attempts") ?? 0;
  const rawDarts = Array.isArray(result.details?.darts) ? result.details.darts : [];
  const darts = rawDarts.filter((dart): dart is TargetTrainingDart => (
    typeof dart === "object" &&
    dart !== null &&
    "dartNumber" in dart &&
    "round" in dart &&
    "targetHit" in dart &&
    typeof dart.dartNumber === "number" &&
    typeof dart.round === "number" &&
    (typeof dart.targetHit === "string" || dart.targetHit === null)
  ));
  const rawSummary = Array.isArray(result.details?.targetSummary) ? result.details.targetSummary : [];
  const targetSummary = rawSummary.filter((target): target is TargetTrainingSummary => (
    typeof target === "object" &&
    target !== null &&
    "target" in target &&
    "hits" in target &&
    typeof target.target === "string" &&
    typeof target.hits === "number"
  ));

  return {
    selectedTargets,
    rounds,
    totalDarts,
    darts,
    targetSummary,
  };
}

function getRandomTargetDetails(result: TrainingResult): RandomTargetDetails {
  const variantValue = typeof result.details?.variant === "string" ? result.details.variant : result.variant?.split("|")[0];
  const variant: RandomTargetVariant = variantValue === "SINGLES" || variantValue === "DOUBLES" || variantValue === "TRIPLES" || variantValue === "MIXED"
    ? variantValue
    : "MIXED";
  const rounds = typeof result.details?.rounds === "number" ? result.details.rounds : 0;
  const totalDarts = typeof result.details?.totalDarts === "number" ? result.details.totalDarts : numericMetric(result, "attempts") ?? 0;
  const rawDarts = Array.isArray(result.details?.darts) ? result.details.darts : [];
  const darts = rawDarts.filter((dart): dart is RandomTargetDart => (
    typeof dart === "object" &&
    dart !== null &&
    "dartNumber" in dart &&
    "round" in dart &&
    "target" in dart &&
    "hit" in dart &&
    typeof dart.dartNumber === "number" &&
    typeof dart.round === "number" &&
    typeof dart.target === "string" &&
    typeof dart.hit === "boolean"
  ));
  const rawSummary = Array.isArray(result.details?.targetSummary) ? result.details.targetSummary : [];
  const targetSummary = rawSummary.filter((target): target is RandomTargetSummary => (
    typeof target === "object" &&
    target !== null &&
    "target" in target &&
    "hits" in target &&
    "attempts" in target &&
    "hitPercent" in target &&
    typeof target.target === "string" &&
    typeof target.hits === "number" &&
    typeof target.attempts === "number" &&
    typeof target.hitPercent === "number"
  ));

  return {
    variant,
    rounds,
    totalDarts,
    darts,
    targetSummary,
  };
}

function getScoringDetails(result: TrainingResult): {
  target: string;
  throws: ScoringThrow[];
  first50Score: number;
  second50Score: number;
} {
  const target = typeof result.details?.target === "string" ? result.details.target : result.variant ?? "-";
  const throws = Array.isArray(result.details?.throws)
    ? result.details.throws.filter((value): value is ScoringThrow => (
        value === "single" || value === "double" || value === "triple" || value === "miss"
      ))
    : [];

  return {
    target,
    throws,
    first50Score: typeof result.details?.first50Score === "number"
      ? result.details.first50Score
      : numericMetric(result, "first50Score") ?? 0,
    second50Score: typeof result.details?.second50Score === "number"
      ? result.details.second50Score
      : numericMetric(result, "second50Score") ?? 0,
  };
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

function ScoringGameplay({
  target,
  state,
  scorePersonalBest,
  hitPercentPersonalBest,
  onSelectTarget,
  onInput,
  onUndo,
  onAbort,
}: {
  target: ScoringTarget | null;
  state: ReturnType<typeof calculateScoringState>;
  scorePersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  onSelectTarget: (target: ScoringTarget) => void;
  onInput: (value: ScoringThrow) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  if (!target) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Scoring</div>
        <h2 className="mt-2 text-3xl font-black">Vælg target</h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">100 pile · performance-point · variant adskilles i statistik</p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {SCORING_TARGETS.map((option) => (
            <button
              key={option.variant}
              type="button"
              onClick={() => onSelectTarget(option)}
              className="min-h-24 rounded-2xl border border-gray-800 bg-gray-950 px-3 py-4 text-3xl font-black text-white transition hover:border-orange-500 hover:text-orange-300 active:scale-[0.98] sm:min-h-32 sm:text-5xl"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <GameplayShell
      eyebrow="Scoring"
      target={target.variant}
      meta={`${state.attempts}/${SCORING_DARTS} pile · ${state.dartsRemaining} tilbage`}
      stats={[
        { label: "Score", value: state.score },
        { label: "Hits", value: `${state.hits}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.attempts > 0}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
        <CompactStat label="Singles" value={state.singles} />
        <CompactStat label="Doubles" value={state.doubles} />
        <CompactStat label="Triples" value={state.triples} />
        <CompactStat label="Miss" value={state.misses} />
        <CompactStat label="Første 50" value={state.first50Score} />
        <CompactStat label="Sidste 50" value={state.second50Score} />
        <CompactStat label="PR træf %" value={hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"} />
        <CompactStat label="Target" value={target.label} />
      </div>
      <div className={target.allowTriple ? "grid grid-cols-2 gap-2 sm:gap-3" : "grid grid-cols-3 gap-2 sm:gap-3"}>
        <TouchButton label="SINGLE" tone="green" onClick={() => onInput("single")} />
        <TouchButton label="DOUBLE" tone="amber" onClick={() => onInput("double")} />
        {target.allowTriple ? <TouchButton label="TRIPLE" tone="orange" onClick={() => onInput("triple")} /> : null}
        <TouchButton label="NO HIT" tone="red" onClick={() => onInput("miss")} />
      </div>
    </GameplayShell>
  );
}

function PriestleyGameplay({
  state,
  scorePersonalBest,
  triplesPersonalBest,
  hitPercentPersonalBest,
  onInput,
  onUndo,
  onAbort,
}: {
  state: ReturnType<typeof calculatePriestleyState>;
  scorePersonalBest: number | null;
  triplesPersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  onInput: (value: PriestleyThrow) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  return (
    <GameplayShell
      eyebrow="Priestley's Triples"
      target={state.currentTarget?.target ?? "Færdig"}
      meta={`${state.attempts}/${PRIESTLEY_TOTAL_DARTS} pile · pil ${Math.min(state.currentDart, PRIESTLEY_DARTS_PER_TARGET)}/${PRIESTLEY_DARTS_PER_TARGET}`}
      stats={[
        { label: "Score", value: state.score },
        { label: "Triples", value: `${state.triples}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "PR", value: scorePersonalBest ?? "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.attempts > 0}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
        <CompactStat label="Progress" value={`${state.completedTargets}/${PRIESTLEY_TARGETS.length}`} />
        <CompactStat label="Misses" value={state.misses} />
        <CompactStat label="PR triples" value={triplesPersonalBest ?? "-"} />
        <CompactStat label="PR træf %" value={hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"} />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <TouchButton label="SINGLE" tone="amber" onClick={() => onInput("single")} />
        <TouchButton label="DOUBLE" tone="orange" onClick={() => onInput("double")} />
        <TouchButton label="TRIPLE" tone="green" onClick={() => onInput("triple")} />
        <TouchButton label="NO HIT" tone="red" onClick={() => onInput("miss")} />
      </div>
    </GameplayShell>
  );
}

function TargetTrainingGameplay({
  selectedTargets,
  rounds,
  segment,
  started,
  state,
  hitPercentPersonalBest,
  onSelectSegment,
  onAddTarget,
  onRemoveTarget,
  onSetRounds,
  onStart,
  onInput,
  onUndo,
  onAbort,
}: {
  selectedTargets: TargetTrainingTarget[];
  rounds: number;
  segment: TargetTrainingSegment;
  started: boolean;
  state: ReturnType<typeof calculateTargetTrainingState>;
  hitPercentPersonalBest: number | null;
  onSelectSegment: (segment: TargetTrainingSegment) => void;
  onAddTarget: (target: TargetTrainingTarget) => void;
  onRemoveTarget: (targetId: string) => void;
  onSetRounds: (rounds: number) => void;
  onStart: () => void;
  onInput: (targetHit: string | null) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  if (!started) {
    const targetOptions = segment === "BULL"
      ? [makeTargetTrainingTarget("BULL", 25), makeTargetTrainingTarget("BULL", 50)]
      : Array.from({ length: 20 }, (_, index) => makeTargetTrainingTarget(segment, index + 1));
    const canStart = selectedTargets.length > 0 && selectedTargets.length <= 3;

    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Target Training</div>
        <h2 className="mt-2 text-3xl font-black">Vælg setup</h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">1-3 targets · 3 pile pr. runde · statistik adskilles pr. setup</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TARGET_TRAINING_SEGMENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectSegment(option.id)}
                  className={`min-h-12 rounded-xl px-3 py-3 text-sm font-black transition sm:text-base ${
                    segment === option.id
                      ? "bg-orange-500 text-gray-950"
                      : "border border-gray-800 bg-gray-900 text-gray-300 hover:border-orange-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={segment === "BULL" ? "mt-3 grid grid-cols-2 gap-2" : "mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10"}>
              {targetOptions.map((target) => {
                const selected = selectedTargets.some((item) => item.id === target.id);
                const disabled = selected || selectedTargets.length >= 3;

                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onAddTarget(target)}
                    className={`min-h-12 rounded-xl px-2 py-2 text-sm font-black transition sm:text-base ${
                      selected
                        ? "border border-emerald-700 bg-emerald-950 text-emerald-300"
                        : disabled
                          ? "cursor-not-allowed border border-gray-900 bg-gray-950 text-gray-700"
                          : "border border-gray-800 bg-gray-900 text-white hover:border-orange-500 hover:text-orange-300"
                    }`}
                  >
                    {target.label}
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
            <div className="text-xs font-black uppercase tracking-wide text-gray-500">Valgte targets</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTargets.length > 0 ? selectedTargets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => onRemoveTarget(target.id)}
                  className="rounded-full border border-orange-500/70 bg-orange-500/10 px-3 py-2 text-sm font-black text-orange-200 transition hover:bg-orange-500 hover:text-gray-950"
                >
                  {target.label} x
                </button>
              )) : (
                <span className="rounded-full border border-gray-800 px-3 py-2 text-sm font-bold text-gray-500">Ingen valgt</span>
              )}
            </div>

            <div className="mt-4 text-xs font-black uppercase tracking-wide text-gray-500">Runder</div>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {TARGET_TRAINING_ROUND_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSetRounds(option)}
                  className={`rounded-lg px-2 py-2 text-sm font-black transition ${
                    rounds === option
                      ? "bg-orange-500 text-gray-950"
                      : "border border-gray-800 bg-gray-900 text-gray-300 hover:border-orange-500"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSetRounds(rounds - 1)}
                className="rounded-xl border border-gray-800 px-3 py-3 font-black text-gray-300 transition hover:border-orange-500"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => onSetRounds(rounds + 1)}
                className="rounded-xl border border-gray-800 px-3 py-3 font-black text-gray-300 transition hover:border-orange-500"
              >
                +1
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <CompactStat label="Pile" value={rounds * 3} />
              <CompactStat label="Setup" value={selectedTargets.length ? buildTargetTrainingVariant(selectedTargets, rounds) : "-"} />
            </div>

            <button
              type="button"
              disabled={!canStart}
              onClick={onStart}
              className="mt-4 min-h-14 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Target Training
            </button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <GameplayShell
      eyebrow="Target Training"
      target={selectedTargets.map((target) => target.label).join(" · ") || "Setup"}
      meta={`Runde ${state.currentRound}/${rounds} · pil ${state.attempts}/${state.totalDarts}`}
      stats={[
        { label: "Hits", value: state.hits },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "Tilbage", value: state.dartsRemaining },
        { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.attempts > 0}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
        <CompactStat label="Runde" value={`${state.currentRound}/${rounds}`} />
        <CompactStat label="Pil i runde" value={`${Math.min(state.currentDartInRound, 3)}/3`} />
        <CompactStat label="Misses" value={state.misses} />
        <CompactStat label="Setup" value={buildTargetTrainingVariant(selectedTargets, rounds)} />
      </div>
      <div className={selectedTargets.length === 1 ? "grid grid-cols-2 gap-2 sm:gap-3" : "grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"}>
        {selectedTargets.length === 1 ? (
          <TouchButton label="HIT" tone="green" onClick={() => onInput(selectedTargets[0].id)} />
        ) : selectedTargets.map((target) => (
          <TouchButton key={target.id} label={target.label} tone="green" onClick={() => onInput(target.id)} />
        ))}
        <TouchButton label="MISS" tone="red" onClick={() => onInput(null)} />
      </div>
    </GameplayShell>
  );
}

function RandomTargetGameplay({
  variant,
  rounds,
  started,
  state,
  hitPercentPersonalBest,
  onSelectVariant,
  onSetRounds,
  onStart,
  onInput,
  onUndo,
  onAbort,
}: {
  variant: RandomTargetVariant | null;
  rounds: number;
  started: boolean;
  state: ReturnType<typeof calculateRandomTargetState>;
  hitPercentPersonalBest: number | null;
  onSelectVariant: (variant: RandomTargetVariant) => void;
  onSetRounds: (rounds: number) => void;
  onStart: () => void;
  onInput: (hit: boolean) => void;
  onUndo: () => void;
  onAbort: () => void;
}) {
  if (!started) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
        <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Random Target</div>
        <h2 className="mt-2 text-3xl font-black">Vælg variant</h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">Tilfældigt target pr. pil · 3 pile pr. runde · variant adskilles i statistik</p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RANDOM_TARGET_VARIANTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectVariant(option.id)}
                  className={`min-h-20 rounded-2xl px-3 py-4 text-xl font-black transition sm:min-h-28 sm:text-3xl ${
                    variant === option.id
                      ? "bg-orange-500 text-gray-950"
                      : "border border-gray-800 bg-gray-900 text-white hover:border-orange-500 hover:text-orange-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-800 bg-gray-950 p-3 sm:p-4">
            <div className="text-xs font-black uppercase tracking-wide text-gray-500">Runder</div>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {TARGET_TRAINING_ROUND_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onSetRounds(option)}
                  className={`rounded-lg px-2 py-2 text-sm font-black transition ${
                    rounds === option
                      ? "bg-orange-500 text-gray-950"
                      : "border border-gray-800 bg-gray-900 text-gray-300 hover:border-orange-500"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSetRounds(rounds - 1)}
                className="rounded-xl border border-gray-800 px-3 py-3 font-black text-gray-300 transition hover:border-orange-500"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => onSetRounds(rounds + 1)}
                className="rounded-xl border border-gray-800 px-3 py-3 font-black text-gray-300 transition hover:border-orange-500"
              >
                +1
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <CompactStat label="Pile" value={rounds * 3} />
              <CompactStat label="Variant" value={variant ? buildRandomTargetVariant(variant, rounds) : "-"} />
            </div>

            <button
              type="button"
              disabled={!variant}
              onClick={onStart}
              className="mt-4 min-h-14 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Random Target
            </button>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <GameplayShell
      eyebrow={`Random Target - ${variant ? RANDOM_TARGET_VARIANTS.find((item) => item.id === variant)?.label ?? variant : "Variant"}`}
      target={state.currentTarget?.label ?? "Færdig"}
      meta={`Runde ${state.currentRound}/${rounds} · pil ${state.attempts}/${state.totalDarts}`}
      stats={[
        { label: "Hits", value: `${state.hits}/${state.attempts}` },
        { label: "Træf %", value: `${state.hitPercent}%` },
        { label: "Misses", value: state.misses },
        { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
      ]}
      onUndo={onUndo}
      onAbort={onAbort}
      canUndo={state.attempts > 0}
    >
      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
        <CompactStat label="Variant" value={variant ? RANDOM_TARGET_VARIANTS.find((item) => item.id === variant)?.label ?? variant : "-"} />
        <CompactStat label="Runde" value={`${state.currentRound}/${rounds}`} />
        <CompactStat label="Pil i runde" value={`${Math.min(state.currentDartInRound, 3)}/3`} />
        <CompactStat label="Tilbage" value={state.dartsRemaining} />
      </div>
      {variant === "MIXED" ? (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-800 bg-gray-950 px-3 py-3 sm:grid-cols-4 xl:px-4">
          <CompactStat label="Singles" value={state.singleHits} />
          <CompactStat label="Doubles" value={state.doubleHits} />
          <CompactStat label="Triples" value={state.tripleHits} />
          <CompactStat label="Bull" value={state.bullHits} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <TouchButton label="HIT" tone="green" onClick={() => onInput(true)} />
        <TouchButton label="MISS" tone="red" onClick={() => onInput(false)} />
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
  triplesStats,
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
  triplesStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  onPlayAgain: () => void;
  onBackToDashboard: () => void;
}) {
  const isJdc = result.exerciseId === JDC_CHALLENGE_EXERCISE_ID;
  const isCatch40 = result.exerciseId === CATCH_40_EXERCISE_ID;
  const isBobs27 = result.exerciseId === BOBS_27_EXERCISE_ID;
  const isGame420 = result.exerciseId === GAME_420_EXERCISE_ID;
  const isScoring = result.exerciseId === SCORING_EXERCISE_ID;
  const isPriestley = result.exerciseId === PRIESTLEY_TRIPLES_EXERCISE_ID;
  const isAroundTheWorld = result.exerciseId === AROUND_THE_WORLD_EXERCISE_ID;
  const isTargetTraining = result.exerciseId === TARGET_TRAINING_EXERCISE_ID;
  const isRandomTarget = result.exerciseId === RANDOM_TARGET_EXERCISE_ID;
  const resultTitle = isScoring && result.variant
    ? `${exercise?.name ?? "Scoring"} - ${result.variant}`
    : isAroundTheWorld
      ? `${exercise?.name ?? "Around the World"} - ${formatAroundTheWorldVariant(result.variant)}`
      : isTargetTraining
        ? `${exercise?.name ?? "Target Training"} - ${formatTargetTrainingVariant(result.variant, result)}`
        : isRandomTarget
          ? `${exercise?.name ?? "Random Target"} - ${formatRandomTargetVariant(result.variant)}`
    : exercise?.name ?? "Træning";
  const isMixedRandomTarget = isRandomTarget && result.variant?.startsWith("MIXED|");

  return (
    <div className="grid gap-4 sm:gap-5">
      <section className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Gennemført</p>
        <h2 className="mt-1 text-3xl font-black">{resultTitle}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile
            label={isAroundTheWorld ? "Pile brugt" : isTargetTraining || isRandomTarget ? "Træf %" : "Score"}
            value={isAroundTheWorld
              ? numericMetric(result, "dartsUsed") ?? "-"
              : isTargetTraining || isRandomTarget
                ? `${numericMetric(result, "hitPercent") ?? 0}%`
                : numericMetric(result, "score") ?? "-"}
          />
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
          ) : isScoring ? (
            <>
              <StatTile label="Hits / 100" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Træf %" value={`${numericMetric(result, "hitPercent") ?? 0}%`} />
              <StatTile label="Misses" value={numericMetric(result, "misses") ?? 0} />
              <StatTile label="Singles" value={numericMetric(result, "singles") ?? 0} />
              <StatTile label="Doubles" value={numericMetric(result, "doubles") ?? 0} />
              <StatTile label="Triples" value={numericMetric(result, "triples") ?? 0} />
              <StatTile label="Første 50" value={numericMetric(result, "first50Score") ?? 0} />
              <StatTile label="Sidste 50" value={numericMetric(result, "second50Score") ?? 0} />
            </>
          ) : isPriestley ? (
            <>
              <StatTile label="Triple hits" value={numericMetric(result, "triples") ?? 0} />
              <StatTile label="Hits / forsøg" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Træf %" value={`${numericMetric(result, "hitPercent") ?? 0}%`} />
              <StatTile label="Misses" value={numericMetric(result, "misses") ?? 0} />
            </>
          ) : isAroundTheWorld ? (
            <>
              <StatTile label="Hits / forsøg" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Træf %" value={`${numericMetric(result, "hitPercent") ?? 0}%`} />
              <StatTile label="Misses" value={numericMetric(result, "misses") ?? 0} />
            </>
          ) : isTargetTraining ? (
            <>
              <StatTile label="Hits / forsøg" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Misses" value={(numericMetric(result, "attempts") ?? 0) - (numericMetric(result, "hits") ?? 0)} />
              <StatTile label="Setup" value={formatTargetTrainingVariant(result.variant, result)} />
            </>
          ) : isRandomTarget ? (
            <>
              <StatTile label="Hits / forsøg" value={`${numericMetric(result, "hits") ?? 0}/${numericMetric(result, "attempts") ?? 0}`} />
              <StatTile label="Misses" value={numericMetric(result, "misses") ?? 0} />
              <StatTile label="Variant" value={formatRandomTargetVariant(result.variant)} />
              {isMixedRandomTarget ? (
                <>
                  <StatTile label="Singles" value={numericMetric(result, "singleHits") ?? 0} />
                  <StatTile label="Doubles" value={numericMetric(result, "doubleHits") ?? 0} />
                  <StatTile label="Triples" value={numericMetric(result, "tripleHits") ?? 0} />
                  <StatTile label="Bull" value={numericMetric(result, "bullHits") ?? 0} />
                </>
              ) : null}
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
          {(isCatch40 || isBobs27 || isGame420 || isScoring || isPriestley || isAroundTheWorld || isTargetTraining || isRandomTarget) ? (
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
        scoreStats={isTargetTraining || isRandomTarget ? hitPercentStats : scoreStats}
        primaryLabel={isTargetTraining || isRandomTarget ? "Træf %" : "Score"}
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
                      : isScoring
                        ? [
                            { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                            { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                            { label: "Første 50 snit", value: monthlyStats?.metrics.find((metric) => metric.key === "first50Score")?.currentAverage ?? "-" },
                            { label: "Sidste 50 snit", value: monthlyStats?.metrics.find((metric) => metric.key === "second50Score")?.currentAverage ?? "-" },
                          ]
                    : isPriestley
                      ? [
                          { label: "Triples total", value: triplesStats?.currentTotal ?? "-" },
                          { label: "Triples snit", value: triplesStats?.currentAverage ?? "-" },
                          { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                          { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                        ]
                        : isAroundTheWorld
                          ? [
                              { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                              { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                              { label: "Misses snit", value: monthlyStats?.metrics.find((metric) => metric.key === "misses")?.currentAverage ?? "-" },
                            ]
                          : isTargetTraining
                            ? [
                                { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                                { label: "Bedste træf %", value: hitPercentStats?.currentBest ?? "-" },
                                { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                                { label: "Hits snit", value: monthlyStats?.metrics.find((metric) => metric.key === "hits")?.currentAverage ?? "-" },
                              ]
                            : [
                                { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
                                { label: "Bedste træf %", value: hitPercentStats?.currentBest ?? "-" },
                                { label: "PR træf %", value: hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-" },
                                { label: "Misses snit", value: monthlyStats?.metrics.find((metric) => metric.key === "misses")?.currentAverage ?? "-" },
                              ]
        }
      />

      {showDetails && isCatch40 ? <Catch40DetailsTable details={getCatch40Details(result)} /> : null}
      {showDetails && isBobs27 ? <Bobs27DetailsTable details={getBobs27Details(result)} /> : null}
      {showDetails && isGame420 ? <Game420DetailsTable details={getGame420Details(result)} /> : null}
      {showDetails && isScoring ? <ScoringDetailsTable details={getScoringDetails(result)} /> : null}
      {showDetails && isPriestley ? <PriestleyDetailsTable details={getPriestleyDetails(result)} /> : null}
      {showDetails && isAroundTheWorld ? <AroundTheWorldDetailsTable details={getAroundTheWorldDetails(result)} /> : null}
      {showDetails && isTargetTraining ? <TargetTrainingDetailsTable details={getTargetTrainingDetails(result)} /> : null}
      {showDetails && isRandomTarget ? <RandomTargetDetailsTable details={getRandomTargetDetails(result)} /> : null}
    </div>
  );
}

function MonthlyStatsPanel({
  monthlyStats,
  scoreStats,
  primaryLabel,
  extraStats,
}: {
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  primaryLabel?: string;
  extraStats: { label: string; value: string | number }[];
}) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <h2 className="text-lg font-black">Denne måned</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <CompactStat label="Gennemført" value={monthlyStats?.completedCount ?? 0} />
        <CompactStat label={`Snit ${primaryLabel ?? "Score"}`} value={scoreStats?.currentAverage ?? "-"} />
        <CompactStat label={`Bedste ${primaryLabel ?? "Score"}`} value={scoreStats?.currentBest ?? "-"} />
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

function ScoringDetailsTable({
  details,
}: {
  details: ReturnType<typeof getScoringDetails>;
}) {
  const labelMap: Record<ScoringThrow, string> = {
    single: "S",
    double: "D",
    triple: "T",
    miss: "-",
  };

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Scoring detaljer</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500">{details.target} · 100 pile</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-64">
          <CompactStat label="Første 50" value={details.first50Score} />
          <CompactStat label="Sidste 50" value={details.second50Score} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-10 gap-1">
        {details.throws.map((value, index) => (
          <div
            key={`${index}-${value}`}
            className={`rounded-lg border px-1 py-2 text-center text-xs font-black sm:text-sm ${
              value === "miss"
                ? "border-red-900 bg-red-950/40 text-red-300"
                : "border-emerald-900 bg-emerald-950/40 text-emerald-300"
            }`}
            title={`Pil ${index + 1}: ${value}`}
          >
            <div className="text-[0.6rem] text-gray-500">{index + 1}</div>
            {labelMap[value]}
          </div>
        ))}
      </div>
    </section>
  );
}

function PriestleyDetailsTable({ details }: { details: PriestleyTarget[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <TableHeader columns={["Target", "S/D/T", "Miss", "Score"]} />
      {details.map((target) => (
        <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
          <div>{target.target}</div>
          <div>{target.singles}/{target.doubles}/{target.triples}</div>
          <div className={target.misses > 0 ? "text-red-300" : "text-gray-400"}>{target.misses}</div>
          <div className={target.scoreChange > 0 ? "text-emerald-300" : "text-gray-500"}>{target.scoreChange}</div>
        </div>
      ))}
    </section>
  );
}

function AroundTheWorldDetailsTable({ details }: { details: AroundTheWorldTarget[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
      <TableHeader columns={["Target", "Pile før hit", "Hit", "Total"]} />
      {details.map((target) => (
        <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
          <div>{target.target}</div>
          <div>{target.attemptsBeforeHit}</div>
          <div className={target.hit ? "text-emerald-300" : "text-red-300"}>{target.hit ? "Ja" : "Nej"}</div>
          <div>{target.cumulativeDarts}</div>
        </div>
      ))}
    </section>
  );
}

function TargetTrainingDetailsTable({ details }: { details: TargetTrainingDetails }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Target Training detaljer</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {details.selectedTargets.join(" · ") || "Setup"} · {details.rounds} runder · {details.totalDarts} pile
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-72">
          <CompactStat label="Targets" value={details.selectedTargets.length} />
          <CompactStat label="Pile" value={details.totalDarts} />
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {details.targetSummary.map((target) => (
          <CompactStat key={target.target} label={target.target} value={`${target.hits} hits`} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1 sm:grid-cols-10 md:grid-cols-12">
        {details.darts.map((dart) => {
          const hit = dart.targetHit !== null && dart.targetHit !== "MISS";

          return (
            <div
              key={dart.dartNumber}
              className={`rounded-lg border px-1 py-2 text-center text-xs font-black sm:text-sm ${
                hit
                  ? "border-emerald-900 bg-emerald-950/40 text-emerald-300"
                  : "border-red-900 bg-red-950/40 text-red-300"
              }`}
              title={`Pil ${dart.dartNumber}: ${hit ? dart.targetHit : "MISS"}`}
            >
              <div className="text-[0.6rem] text-gray-500">{dart.dartNumber}</div>
              {hit ? dart.targetHit : "-"}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RandomTargetDetailsTable({ details }: { details: RandomTargetDetails }) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-black">Random Target detaljer</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            {RANDOM_TARGET_VARIANTS.find((item) => item.id === details.variant)?.label ?? details.variant} · {details.rounds} runder · {details.totalDarts} pile
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:w-72">
          <CompactStat label="Targets" value={details.targetSummary.length} />
          <CompactStat label="Pile" value={details.totalDarts} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-800">
        <TableHeader columns={["Target", "Hits", "Forsøg", "Træf %"]} />
        {details.targetSummary.map((target) => (
          <div key={target.target} className="grid grid-cols-4 border-t border-gray-800 px-3 py-3 text-sm font-bold sm:px-4">
            <div>{target.target}</div>
            <div>{target.hits}</div>
            <div>{target.attempts}</div>
            <div>{target.hitPercent}%</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1 sm:grid-cols-10 md:grid-cols-12">
        {details.darts.map((dart) => (
          <div
            key={dart.dartNumber}
            className={`rounded-lg border px-1 py-2 text-center text-xs font-black sm:text-sm ${
              dart.hit
                ? "border-emerald-900 bg-emerald-950/40 text-emerald-300"
                : "border-red-900 bg-red-950/40 text-red-300"
            }`}
            title={`Pil ${dart.dartNumber}: ${dart.target} ${dart.hit ? "HIT" : "MISS"}`}
          >
            <div className="text-[0.6rem] text-gray-500">{dart.dartNumber}</div>
            {dart.target}
          </div>
        ))}
      </div>
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
