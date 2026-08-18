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

type Catch40Target = {
  checkoutValue: number;
  hit: boolean;
  attempts: number;
};

type Bobs27Double = {
  doubleValue: number;
  hits: number;
  attempts: number;
};

const CATCH_40_TARGETS = Array.from({ length: 40 }, (_, index) => index + 61);
const BOBS_27_DOUBLES = Array.from({ length: 20 }, (_, index) => index + 1);

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

function createInitialCatch40Targets(): Catch40Target[] {
  return CATCH_40_TARGETS.map((checkoutValue) => ({
    checkoutValue,
    hit: false,
    attempts: 1,
  }));
}

function createInitialBobs27Doubles(): Bobs27Double[] {
  return BOBS_27_DOUBLES.map((doubleValue) => ({
    doubleValue,
    hits: 0,
    attempts: 3,
  }));
}

function calculateCheckoutPercent(checkouts: number, checkoutAttempts: number) {
  return checkoutAttempts > 0 ? Math.round((checkouts / checkoutAttempts) * 100) : 0;
}

function calculateHitPercent(hits: number, attempts: number) {
  return attempts > 0 ? Math.round((hits / attempts) * 100) : 0;
}

export default function TrainingPage() {
  const { currentClubId, currentClub } = useClub();
  const { currentPlayer, currentPlayerId } = useCurrentUser();
  const [activeExerciseId, setActiveExerciseId] = useState<ExerciseId>(JDC_CHALLENGE_EXERCISE_ID);
  const activeExercise = getTrainingExercise(activeExerciseId);
  const [scoreInput, setScoreInput] = useState("");
  const [shanghaiInput, setShanghaiInput] = useState("");
  const [catch40Targets, setCatch40Targets] = useState<Catch40Target[]>(createInitialCatch40Targets);
  const [bobs27Doubles, setBobs27Doubles] = useState<Bobs27Double[]>(createInitialBobs27Doubles);
  const [showCatch40Details, setShowCatch40Details] = useState(false);
  const [showBobs27Details, setShowBobs27Details] = useState(false);
  const [results, setResults] = useState<TrainingResult[]>(() => getTrainingResultsForPlayer(currentPlayerId));
  const [lastSavedResult, setLastSavedResult] = useState<TrainingResult | null>(null);

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
  const jdcScore = Number(scoreInput);
  const shanghaiCount = Number(shanghaiInput);
  const canSaveJdc =
    activeExerciseId === JDC_CHALLENGE_EXERCISE_ID &&
    !!activeExercise &&
    Number.isInteger(jdcScore) &&
    jdcScore >= 0 &&
    Number.isInteger(shanghaiCount) &&
    shanghaiCount >= 0;
  const catch40Summary = calculateCatch40Summary(catch40Targets);
  const canSaveCatch40 = activeExerciseId === CATCH_40_EXERCISE_ID && !!activeExercise;
  const bobs27Summary = calculateBobs27Summary(bobs27Doubles);
  const canSaveBobs27 = activeExerciseId === BOBS_27_EXERCISE_ID && !!activeExercise;

  function refreshResults() {
    setResults(getTrainingResultsForPlayer(currentPlayerId));
  }

  function handleExerciseChange(exerciseId: ExerciseId) {
    setActiveExerciseId(exerciseId);
    setLastSavedResult(null);
    setShowCatch40Details(false);
    setShowBobs27Details(false);
  }

  function handleSaveJdc() {
    if (!activeExercise || !canSaveJdc) return;

    const result: TrainingResult = {
      id: `training-${JDC_CHALLENGE_EXERCISE_ID}-${currentPlayerId}-${Date.now()}`,
      clubId: currentClubId,
      playerId: currentPlayerId,
      exerciseId: activeExercise.id,
      completedAt: new Date().toISOString(),
      metrics: {
        score: jdcScore,
        shanghaiCount,
      },
    };

    saveTrainingResult(result);
    refreshResults();
    setLastSavedResult(result);
    setScoreInput("");
    setShanghaiInput("");
  }

  function handleSaveCatch40() {
    if (!activeExercise || !canSaveCatch40) return;

    const result: TrainingResult = {
      id: `training-${CATCH_40_EXERCISE_ID}-${currentPlayerId}-${Date.now()}`,
      clubId: currentClubId,
      playerId: currentPlayerId,
      exerciseId: activeExercise.id,
      completedAt: new Date().toISOString(),
      metrics: {
        score: catch40Summary.score,
        checkouts: catch40Summary.checkouts,
        checkoutAttempts: catch40Summary.checkoutAttempts,
        checkoutPercent: catch40Summary.checkoutPercent,
        highestCheckout: catch40Summary.highestCheckout,
      },
      details: {
        checkouts: catch40Targets.map((target) => ({ ...target })),
      },
    };

    saveTrainingResult(result);
    refreshResults();
    setLastSavedResult(result);
    setCatch40Targets(createInitialCatch40Targets());
    setShowCatch40Details(false);
  }

  function handleSaveBobs27() {
    if (!activeExercise || !canSaveBobs27) return;

    const result: TrainingResult = {
      id: `training-${BOBS_27_EXERCISE_ID}-${currentPlayerId}-${Date.now()}`,
      clubId: currentClubId,
      playerId: currentPlayerId,
      exerciseId: activeExercise.id,
      completedAt: new Date().toISOString(),
      metrics: {
        score: bobs27Summary.score,
        hits: bobs27Summary.hits,
        attempts: bobs27Summary.attempts,
        hitPercent: bobs27Summary.hitPercent,
      },
      details: {
        doubles: bobs27Doubles.map((double) => ({ ...double })),
      },
    };

    saveTrainingResult(result);
    refreshResults();
    setLastSavedResult(result);
    setBobs27Doubles(createInitialBobs27Doubles());
    setShowBobs27Details(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <Header />

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <BackButton />

        <div className="mb-5">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-orange-400">Træning</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{activeExercise?.name ?? "Træning"}</h1>
          <p className="mt-2 text-base text-gray-400">{currentClub.name} · individuel træning</p>
        </div>

        <div className="mb-5 grid gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-2 sm:grid-cols-3">
          <ExerciseTab
            active={activeExerciseId === JDC_CHALLENGE_EXERCISE_ID}
            title="JDC Challenge"
            description="Score og Shanghai"
            onClick={() => handleExerciseChange(JDC_CHALLENGE_EXERCISE_ID)}
          />
          <ExerciseTab
            active={activeExerciseId === CATCH_40_EXERCISE_ID}
            title="Catch 40"
            description="Checkout 61-100"
            onClick={() => handleExerciseChange(CATCH_40_EXERCISE_ID)}
          />
          <ExerciseTab
            active={activeExerciseId === BOBS_27_EXERCISE_ID}
            title="Bob's 27"
            description="Doubles D1-D20"
            onClick={() => handleExerciseChange(BOBS_27_EXERCISE_ID)}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
            <div className="grid gap-4">
              <div className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3">
                <div className="text-xs font-black uppercase tracking-wide text-gray-500">Træner som</div>
                <div className="mt-1 text-lg font-black text-white">{currentPlayer.name}</div>
              </div>

              {activeExerciseId === JDC_CHALLENGE_EXERCISE_ID ? (
                <JdcForm
                  scoreInput={scoreInput}
                  shanghaiInput={shanghaiInput}
                  canSave={canSaveJdc}
                  onScoreChange={setScoreInput}
                  onShanghaiChange={setShanghaiInput}
                  onSave={handleSaveJdc}
                />
              ) : activeExerciseId === CATCH_40_EXERCISE_ID ? (
                <Catch40Form
                  targets={catch40Targets}
                  summary={catch40Summary}
                  onTargetsChange={setCatch40Targets}
                  onSave={handleSaveCatch40}
                />
              ) : (
                <Bobs27Form
                  doubles={bobs27Doubles}
                  summary={bobs27Summary}
                  onDoublesChange={setBobs27Doubles}
                  onSave={handleSaveBobs27}
                />
              )}
            </div>
          </section>

          <aside className="grid gap-5">
            {activeExerciseId === JDC_CHALLENGE_EXERCISE_ID ? (
              <JdcStats
                scorePersonalBest={scorePersonalBest}
                shanghaiPersonalBest={shanghaiPersonalBest}
                monthlyStats={monthlyStats}
                scoreStats={scoreStats}
                shanghaiStats={shanghaiStats}
              />
            ) : activeExerciseId === CATCH_40_EXERCISE_ID ? (
              <Catch40Stats
                scorePersonalBest={scorePersonalBest}
                checkoutPercentPersonalBest={checkoutPercentPersonalBest}
                highestCheckoutPersonalBest={highestCheckoutPersonalBest}
                monthlyStats={monthlyStats}
                scoreStats={scoreStats}
                checkoutPercentStats={checkoutPercentStats}
              />
            ) : (
              <Bobs27Stats
                scorePersonalBest={scorePersonalBest}
                hitPercentPersonalBest={hitPercentPersonalBest}
                monthlyStats={monthlyStats}
                scoreStats={scoreStats}
                hitPercentStats={hitPercentStats}
              />
            )}
          </aside>
        </div>

        {lastSavedResult ? (
          <SavedResult
            result={lastSavedResult}
            exercise={activeExercise}
            showCatch40Details={showCatch40Details}
            showBobs27Details={showBobs27Details}
            onToggleCatch40Details={() => setShowCatch40Details((value) => !value)}
            onToggleBobs27Details={() => setShowBobs27Details((value) => !value)}
          />
        ) : null}
      </section>
    </main>
  );
}

function calculateCatch40Summary(targets: Catch40Target[]) {
  const hitTargets = targets.filter((target) => target.hit);
  const checkouts = hitTargets.length;
  const checkoutAttempts = targets.reduce((sum, target) => sum + target.attempts, 0);

  return {
    score: hitTargets.reduce((sum, target) => sum + target.checkoutValue, 0),
    checkouts,
    checkoutAttempts,
    checkoutPercent: calculateCheckoutPercent(checkouts, checkoutAttempts),
    highestCheckout: hitTargets.reduce((highest, target) => Math.max(highest, target.checkoutValue), 0),
  };
}

function calculateBobs27Summary(doubles: Bobs27Double[]) {
  const hits = doubles.reduce((sum, double) => sum + double.hits, 0);
  const attempts = doubles.reduce((sum, double) => sum + double.attempts, 0);
  const score = doubles.reduce((sum, double) => {
    const doubleScore = double.doubleValue * 2;
    return sum + (double.hits > 0 ? double.hits * doubleScore : -doubleScore);
  }, 27);

  return {
    score,
    hits,
    attempts,
    hitPercent: calculateHitPercent(hits, attempts),
  };
}

function getCatch40Details(result: TrainingResult): Catch40Target[] {
  const checkouts = result.details?.checkouts;
  if (!Array.isArray(checkouts)) return [];

  return checkouts.filter((target): target is Catch40Target => {
    return (
      typeof target === "object" &&
      target !== null &&
      "checkoutValue" in target &&
      "hit" in target &&
      "attempts" in target &&
      typeof target.checkoutValue === "number" &&
      typeof target.hit === "boolean" &&
      typeof target.attempts === "number"
    );
  });
}

function getBobs27Details(result: TrainingResult): Bobs27Double[] {
  const doubles = result.details?.doubles;
  if (!Array.isArray(doubles)) return [];

  return doubles.filter((double): double is Bobs27Double => {
    return (
      typeof double === "object" &&
      double !== null &&
      "doubleValue" in double &&
      "hits" in double &&
      "attempts" in double &&
      typeof double.doubleValue === "number" &&
      typeof double.hits === "number" &&
      typeof double.attempts === "number"
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

function JdcForm({
  scoreInput,
  shanghaiInput,
  canSave,
  onScoreChange,
  onShanghaiChange,
  onSave,
}: {
  scoreInput: string;
  shanghaiInput: string;
  canSave: boolean;
  onScoreChange: (value: string) => void;
  onShanghaiChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Score" value={scoreInput} onChange={onScoreChange} />
        <NumberField label="Shanghai" value={shanghaiInput} onChange={onShanghaiChange} />
      </div>

      <SaveButton disabled={!canSave} onClick={onSave} />
    </>
  );
}

function Catch40Form({
  targets,
  summary,
  onTargetsChange,
  onSave,
}: {
  targets: Catch40Target[];
  summary: ReturnType<typeof calculateCatch40Summary>;
  onTargetsChange: (targets: Catch40Target[]) => void;
  onSave: () => void;
}) {
  function updateTarget(checkoutValue: number, changes: Partial<Catch40Target>) {
    onTargetsChange(
      targets.map((target) => target.checkoutValue === checkoutValue ? { ...target, ...changes } : target)
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Score" value={summary.score} />
        <StatTile label="Ramt" value={summary.checkouts} />
        <StatTile label="Lukke %" value={`${summary.checkoutPercent}%`} />
        <StatTile label="Højeste" value={summary.highestCheckout || "-"} />
      </div>

      <div className="max-h-[34rem] overflow-y-auto rounded-xl border border-gray-800 bg-gray-950">
        <div className="sticky top-0 grid grid-cols-[4rem_minmax(0,1fr)_6rem] gap-2 border-b border-gray-800 bg-gray-950 px-3 py-2 text-[0.68rem] font-black uppercase tracking-wide text-gray-500">
          <div>CO</div>
          <div>Resultat</div>
          <div className="text-right">Forsøg</div>
        </div>
        <div className="divide-y divide-gray-800">
          {targets.map((target) => (
            <div
              key={target.checkoutValue}
              className="grid min-h-13 grid-cols-[4rem_minmax(0,1fr)_6rem] items-center gap-2 px-3 py-2"
            >
              <div className="text-xl font-black tabular-nums text-white">{target.checkoutValue}</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateTarget(target.checkoutValue, { hit: true })}
                  className={`rounded-lg px-3 py-2 text-sm font-black ${
                    target.hit ? "bg-emerald-500 text-gray-950" : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  HIT
                </button>
                <button
                  type="button"
                  onClick={() => updateTarget(target.checkoutValue, { hit: false })}
                  className={`rounded-lg px-3 py-2 text-sm font-black ${
                    !target.hit ? "bg-red-500 text-white" : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  MISS
                </button>
              </div>
              <select
                value={target.attempts}
                onChange={(event) => updateTarget(target.checkoutValue, { attempts: Number(event.target.value) })}
                className="h-10 rounded-lg border border-gray-700 bg-gray-900 px-2 text-right font-black text-white outline-none focus:border-orange-500"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <SaveButton disabled={false} onClick={onSave} />
    </>
  );
}

function Bobs27Form({
  doubles,
  summary,
  onDoublesChange,
  onSave,
}: {
  doubles: Bobs27Double[];
  summary: ReturnType<typeof calculateBobs27Summary>;
  onDoublesChange: (doubles: Bobs27Double[]) => void;
  onSave: () => void;
}) {
  function updateDouble(doubleValue: number, hits: number) {
    onDoublesChange(
      doubles.map((double) => double.doubleValue === doubleValue ? { ...double, hits } : double)
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Score" value={summary.score} />
        <StatTile label="Hits" value={summary.hits} />
        <StatTile label="Forsøg" value={summary.attempts} />
        <StatTile label="Træf %" value={`${summary.hitPercent}%`} />
      </div>

      <div className="max-h-[34rem] overflow-y-auto rounded-xl border border-gray-800 bg-gray-950">
        <div className="sticky top-0 grid grid-cols-[4rem_minmax(0,1fr)] gap-2 border-b border-gray-800 bg-gray-950 px-3 py-2 text-[0.68rem] font-black uppercase tracking-wide text-gray-500">
          <div>Double</div>
          <div>Hits ud af 3</div>
        </div>
        <div className="divide-y divide-gray-800">
          {doubles.map((double) => (
            <div
              key={double.doubleValue}
              className="grid min-h-13 grid-cols-[4rem_minmax(0,1fr)] items-center gap-2 px-3 py-2"
            >
              <div className="text-xl font-black tabular-nums text-white">D{double.doubleValue}</div>
              <div className="grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((hits) => (
                  <button
                    key={hits}
                    type="button"
                    onClick={() => updateDouble(double.doubleValue, hits)}
                    className={`rounded-lg px-3 py-2 text-sm font-black ${
                      double.hits === hits
                        ? "bg-orange-500 text-gray-950"
                        : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {hits}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SaveButton disabled={false} onClick={onSave} />
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-gray-500">{label}</span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-16 rounded-xl border border-gray-700 bg-gray-950 px-4 text-3xl font-black tabular-nums text-white outline-none transition focus:border-orange-500"
        placeholder="0"
      />
    </label>
  );
}

function SaveButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-14 rounded-xl bg-orange-500 px-5 text-base font-black text-gray-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Gem træning
    </button>
  );
}

function JdcStats({
  scorePersonalBest,
  shanghaiPersonalBest,
  monthlyStats,
  scoreStats,
  shanghaiStats,
}: {
  scorePersonalBest: number | null;
  shanghaiPersonalBest: number | null;
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  shanghaiStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
}) {
  return (
    <>
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-black">Personlige rekorder</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Score" value={scorePersonalBest ?? "-"} />
          <StatTile label="Shanghai" value={shanghaiPersonalBest ?? "-"} />
        </div>
      </section>

      <MonthlyStatsPanel
        monthlyStats={monthlyStats}
        scoreStats={scoreStats}
        extraStats={[
          { label: "Shanghai total", value: shanghaiStats?.currentTotal ?? "-" },
          { label: "Shanghai snit", value: shanghaiStats?.currentAverage ?? "-" },
        ]}
      />
    </>
  );
}

function Catch40Stats({
  scorePersonalBest,
  checkoutPercentPersonalBest,
  highestCheckoutPersonalBest,
  monthlyStats,
  scoreStats,
  checkoutPercentStats,
}: {
  scorePersonalBest: number | null;
  checkoutPercentPersonalBest: number | null;
  highestCheckoutPersonalBest: number | null;
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  checkoutPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
}) {
  return (
    <>
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-black">Personlige rekorder</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Score" value={scorePersonalBest ?? "-"} />
          <StatTile label="Lukke %" value={checkoutPercentPersonalBest !== null ? `${checkoutPercentPersonalBest}%` : "-"} />
          <StatTile label="Højeste luk" value={highestCheckoutPersonalBest ?? "-"} />
        </div>
      </section>

      <MonthlyStatsPanel
        monthlyStats={monthlyStats}
        scoreStats={scoreStats}
        extraStats={[
          { label: "Snit lukke %", value: checkoutPercentStats?.currentAverage ?? "-" },
        ]}
      />
    </>
  );
}

function Bobs27Stats({
  scorePersonalBest,
  hitPercentPersonalBest,
  monthlyStats,
  scoreStats,
  hitPercentStats,
}: {
  scorePersonalBest: number | null;
  hitPercentPersonalBest: number | null;
  monthlyStats: ReturnType<typeof calculateTrainingMonthlyStats> | null;
  scoreStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
  hitPercentStats: ReturnType<typeof calculateTrainingMonthlyStats>["metrics"][number] | null;
}) {
  return (
    <>
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-lg font-black">Personlige rekorder</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Score" value={scorePersonalBest ?? "-"} />
          <StatTile label="Træf %" value={hitPercentPersonalBest !== null ? `${hitPercentPersonalBest}%` : "-"} />
        </div>
      </section>

      <MonthlyStatsPanel
        monthlyStats={monthlyStats}
        scoreStats={scoreStats}
        extraStats={[
          { label: "Snit træf %", value: hitPercentStats?.currentAverage ?? "-" },
        ]}
      />
    </>
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
      <div className="mt-4 grid gap-2">
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

function SavedResult({
  result,
  exercise,
  showCatch40Details,
  showBobs27Details,
  onToggleCatch40Details,
  onToggleBobs27Details,
}: {
  result: TrainingResult;
  exercise: TrainingExercise | null;
  showCatch40Details: boolean;
  showBobs27Details: boolean;
  onToggleCatch40Details: () => void;
  onToggleBobs27Details: () => void;
}) {
  const isCatch40 = result.exerciseId === CATCH_40_EXERCISE_ID;
  const isBobs27 = result.exerciseId === BOBS_27_EXERCISE_ID;
  const catch40Details = isCatch40 ? getCatch40Details(result) : [];
  const bobs27Details = isBobs27 ? getBobs27Details(result) : [];

  return (
    <section className="mt-5 rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-emerald-300">Gemt</p>
          <h2 className="mt-1 text-xl font-black">{exercise?.name ?? "Træning"}</h2>
        </div>
        {isCatch40 ? (
          <button
            type="button"
            onClick={onToggleCatch40Details}
            className="w-fit rounded-xl border border-emerald-600 px-4 py-2 text-sm font-black text-emerald-200 transition hover:bg-emerald-900"
          >
            {showCatch40Details ? "Skjul detaljer" : "Se detaljer"}
          </button>
        ) : isBobs27 ? (
          <button
            type="button"
            onClick={onToggleBobs27Details}
            className="w-fit rounded-xl border border-emerald-600 px-4 py-2 text-sm font-black text-emerald-200 transition hover:bg-emerald-900"
          >
            {showBobs27Details ? "Skjul detaljer" : "Se detaljer"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 text-lg font-bold text-white sm:grid-cols-2 lg:grid-cols-4">
        <div>Score: {numericMetric(result, "score")}</div>
        {isCatch40 ? (
          <>
            <div>Ramt: {numericMetric(result, "checkouts")}</div>
            <div>Lukke %: {numericMetric(result, "checkoutPercent")}%</div>
            <div>Højeste luk: {numericMetric(result, "highestCheckout") || "-"}</div>
          </>
        ) : isBobs27 ? (
          <>
            <div>Hits: {numericMetric(result, "hits")}</div>
            <div>Forsøg: {numericMetric(result, "attempts")}</div>
            <div>Træf %: {numericMetric(result, "hitPercent")}%</div>
          </>
        ) : (
          <div>Shanghai: {numericMetric(result, "shanghaiCount")}</div>
        )}
      </div>

      {showCatch40Details ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-800/70">
          <div className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] bg-emerald-950 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-300">
            <div>CO</div>
            <div>Resultat</div>
            <div className="text-right">Forsøg</div>
          </div>
          <div className="grid max-h-80 gap-px overflow-y-auto bg-emerald-900/40">
            {catch40Details.map((target) => (
              <div
                key={target.checkoutValue}
                className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] bg-gray-950/80 px-3 py-2 text-sm font-bold"
              >
                <div>{target.checkoutValue}</div>
                <div className={target.hit ? "text-emerald-300" : "text-red-300"}>{target.hit ? "Hit" : "Miss"}</div>
                <div className="text-right tabular-nums">{target.attempts}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {showBobs27Details ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-emerald-800/70">
          <div className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] bg-emerald-950 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-300">
            <div>Double</div>
            <div>Hits</div>
            <div className="text-right">Forsøg</div>
          </div>
          <div className="grid max-h-80 gap-px overflow-y-auto bg-emerald-900/40">
            {bobs27Details.map((double) => (
              <div
                key={double.doubleValue}
                className="grid grid-cols-[4rem_minmax(0,1fr)_5rem] bg-gray-950/80 px-3 py-2 text-sm font-bold"
              >
                <div>D{double.doubleValue}</div>
                <div>{double.hits}</div>
                <div className="text-right tabular-nums">{double.attempts}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
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
