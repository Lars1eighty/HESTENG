"use client";

import { useMemo, useState } from "react";

import BackButton from "@/components/BackButton";
import Header from "@/components/Header";
import { useClub } from "@/context/ClubContext";
import {
  CATCH_40_EXERCISE_ID,
  JDC_CHALLENGE_EXERCISE_ID,
  getTrainingExercise,
} from "@/data/trainingExercises";
import { getPlayerRegistry } from "@/lib/playerRegistry";
import { calculateTrainingMonthlyStats } from "@/lib/trainingMonthlyStatsEngine";
import { getTrainingResultsForClub, saveTrainingResult } from "@/lib/trainingResultStore";
import type { TrainingExercise, TrainingMetricDirection, TrainingResult } from "@/lib/trainingTypes";

type ExerciseId = typeof JDC_CHALLENGE_EXERCISE_ID | typeof CATCH_40_EXERCISE_ID;

type Catch40Target = {
  checkoutValue: number;
  hit: boolean;
  attempts: number;
};

const CATCH_40_TARGETS = Array.from({ length: 40 }, (_, index) => index + 61);

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

function calculateCheckoutPercent(checkouts: number, checkoutAttempts: number) {
  return checkoutAttempts > 0 ? Math.round((checkouts / checkoutAttempts) * 100) : 0;
}

export default function TrainingPage() {
  const { currentClubId, currentClub } = useClub();
  const players = useMemo(() => getPlayerRegistry(currentClubId), [currentClubId]);
  const [activeExerciseId, setActiveExerciseId] = useState<ExerciseId>(JDC_CHALLENGE_EXERCISE_ID);
  const activeExercise = getTrainingExercise(activeExerciseId);
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "");
  const [scoreInput, setScoreInput] = useState("");
  const [shanghaiInput, setShanghaiInput] = useState("");
  const [catch40Targets, setCatch40Targets] = useState<Catch40Target[]>(createInitialCatch40Targets);
  const [showCatch40Details, setShowCatch40Details] = useState(false);
  const [results, setResults] = useState<TrainingResult[]>(() => getTrainingResultsForClub(currentClubId));
  const [lastSavedResult, setLastSavedResult] = useState<TrainingResult | null>(null);

  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? null;
  const selectedPlayerResults = results.filter(
    (result) => result.playerId === selectedPlayer?.id && result.exerciseId === activeExerciseId
  );

  const monthlyStats = activeExercise && selectedPlayer
    ? calculateTrainingMonthlyStats(results, activeExercise, {
        clubId: currentClubId,
        playerId: selectedPlayer.id,
        month: currentMonthKey(),
      })
    : null;

  const scoreStats = monthlyStats?.metrics.find((metric) => metric.key === "score") ?? null;
  const shanghaiStats = monthlyStats?.metrics.find((metric) => metric.key === "shanghaiCount") ?? null;
  const checkoutPercentStats = monthlyStats?.metrics.find((metric) => metric.key === "checkoutPercent") ?? null;
  const scorePersonalBest = personalBest(selectedPlayerResults, "score", "higherIsBetter");
  const shanghaiPersonalBest = personalBest(selectedPlayerResults, "shanghaiCount", "higherIsBetter");
  const checkoutPercentPersonalBest = personalBest(selectedPlayerResults, "checkoutPercent", "higherIsBetter");
  const highestCheckoutPersonalBest = personalBest(selectedPlayerResults, "highestCheckout", "higherIsBetter");
  const jdcScore = Number(scoreInput);
  const shanghaiCount = Number(shanghaiInput);
  const canSaveJdc =
    activeExerciseId === JDC_CHALLENGE_EXERCISE_ID &&
    !!activeExercise &&
    !!selectedPlayer &&
    Number.isInteger(jdcScore) &&
    jdcScore >= 0 &&
    Number.isInteger(shanghaiCount) &&
    shanghaiCount >= 0;
  const catch40Summary = calculateCatch40Summary(catch40Targets);
  const canSaveCatch40 = activeExerciseId === CATCH_40_EXERCISE_ID && !!activeExercise && !!selectedPlayer;

  function refreshResults() {
    setResults(getTrainingResultsForClub(currentClubId));
  }

  function handleExerciseChange(exerciseId: ExerciseId) {
    setActiveExerciseId(exerciseId);
    setLastSavedResult(null);
    setShowCatch40Details(false);
  }

  function handleSaveJdc() {
    if (!activeExercise || !selectedPlayer || !canSaveJdc) return;

    const result: TrainingResult = {
      id: `training-${JDC_CHALLENGE_EXERCISE_ID}-${selectedPlayer.id}-${Date.now()}`,
      clubId: currentClubId,
      playerId: selectedPlayer.id,
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
    if (!activeExercise || !selectedPlayer || !canSaveCatch40) return;

    const result: TrainingResult = {
      id: `training-${CATCH_40_EXERCISE_ID}-${selectedPlayer.id}-${Date.now()}`,
      clubId: currentClubId,
      playerId: selectedPlayer.id,
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

        <div className="mb-5 grid gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-2 sm:grid-cols-2">
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
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-6">
            <div className="grid gap-4">
              <PlayerSelect
                players={players}
                selectedPlayerId={selectedPlayer?.id ?? ""}
                onChange={setSelectedPlayerId}
              />

              {activeExerciseId === JDC_CHALLENGE_EXERCISE_ID ? (
                <JdcForm
                  scoreInput={scoreInput}
                  shanghaiInput={shanghaiInput}
                  canSave={canSaveJdc}
                  onScoreChange={setScoreInput}
                  onShanghaiChange={setShanghaiInput}
                  onSave={handleSaveJdc}
                />
              ) : (
                <Catch40Form
                  targets={catch40Targets}
                  summary={catch40Summary}
                  onTargetsChange={setCatch40Targets}
                  onSave={handleSaveCatch40}
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
            ) : (
              <Catch40Stats
                scorePersonalBest={scorePersonalBest}
                checkoutPercentPersonalBest={checkoutPercentPersonalBest}
                highestCheckoutPersonalBest={highestCheckoutPersonalBest}
                monthlyStats={monthlyStats}
                scoreStats={scoreStats}
                checkoutPercentStats={checkoutPercentStats}
              />
            )}
          </aside>
        </div>

        {lastSavedResult ? (
          <SavedResult
            result={lastSavedResult}
            exercise={activeExercise}
            showCatch40Details={showCatch40Details}
            onToggleCatch40Details={() => setShowCatch40Details((value) => !value)}
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

function PlayerSelect({
  players,
  selectedPlayerId,
  onChange,
}: {
  players: { id: string; name: string }[];
  selectedPlayerId: string;
  onChange: (playerId: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-gray-500">Spiller</span>
      <select
        value={selectedPlayerId}
        onChange={(event) => onChange(event.target.value)}
        className="h-13 rounded-xl border border-gray-700 bg-gray-950 px-4 text-base font-bold text-white outline-none transition focus:border-orange-500"
      >
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </select>
    </label>
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
  onToggleCatch40Details,
}: {
  result: TrainingResult;
  exercise: TrainingExercise | null;
  showCatch40Details: boolean;
  onToggleCatch40Details: () => void;
}) {
  const isCatch40 = result.exerciseId === CATCH_40_EXERCISE_ID;
  const catch40Details = isCatch40 ? getCatch40Details(result) : [];

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
