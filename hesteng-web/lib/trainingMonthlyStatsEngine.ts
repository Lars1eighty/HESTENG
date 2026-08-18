import type {
  TrainingExercise,
  TrainingMetricDefinition,
  TrainingMetricDirection,
  TrainingMetricKey,
  TrainingResult,
} from "@/lib/trainingTypes";

export type TrainingMonthlyMetricStats = {
  key: TrainingMetricKey;
  label: string;
  personalBest?: TrainingMetricDirection;
  currentTotal: number | null;
  currentAverage: number | null;
  currentBest: number | null;
  previousAverage: number | null;
  changeFromPreviousAverage: number | null;
};

export type TrainingMonthlyStats = {
  clubId: string;
  playerId: string;
  exerciseId: string;
  variant?: string;
  month: string;
  completedCount: number;
  previousCompletedCount: number;
  metrics: TrainingMonthlyMetricStats[];
};

type MonthWindow = {
  month: string;
  start: Date;
  end: Date;
};

function parseMonth(month: string): MonthWindow {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getUTCFullYear();
  const monthIndex = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));

  return {
    month: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`,
    start,
    end,
  };
}

function getPreviousMonth(month: MonthWindow): MonthWindow {
  const start = new Date(Date.UTC(month.start.getUTCFullYear(), month.start.getUTCMonth() - 1, 1));
  return parseMonth(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`);
}

function isInMonth(completedAt: string, month: MonthWindow) {
  const date = new Date(completedAt);
  return Number.isFinite(date.getTime()) && date >= month.start && date < month.end;
}

function filterResults(
  results: TrainingResult[],
  clubId: string,
  playerId: string,
  exerciseId: string,
  variant: string | undefined,
  month: MonthWindow
) {
  return results.filter((result) => {
    return (
      result.clubId === clubId &&
      result.playerId === playerId &&
      result.exerciseId === exerciseId &&
      (variant === undefined || result.variant === variant) &&
      isInMonth(result.completedAt, month)
    );
  });
}

function numericValues(results: TrainingResult[], metric: TrainingMetricDefinition) {
  return results
    .map((result) => result.metrics[metric.key])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function total(values: number[]) {
  if (values.length === 0) return null;
  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(2));
}

function best(values: number[], direction: TrainingMetricDirection | undefined) {
  if (!direction || values.length === 0) return null;
  return direction === "higherIsBetter" ? Math.max(...values) : Math.min(...values);
}

export function calculateTrainingMonthlyStats(
  results: TrainingResult[],
  exercise: TrainingExercise,
  options: {
    clubId: string;
    playerId: string;
    variant?: string;
    month: string;
  }
): TrainingMonthlyStats {
  const currentMonth = parseMonth(options.month);
  const previousMonth = getPreviousMonth(currentMonth);
  const variant = options.variant ?? exercise.variant;
  const currentResults = filterResults(results, options.clubId, options.playerId, exercise.id, variant, currentMonth);
  const previousResults = filterResults(results, options.clubId, options.playerId, exercise.id, variant, previousMonth);

  return {
    clubId: options.clubId,
    playerId: options.playerId,
    exerciseId: exercise.id,
    variant,
    month: currentMonth.month,
    completedCount: currentResults.length,
    previousCompletedCount: previousResults.length,
    metrics: exercise.metrics.map((metric) => {
      const currentValues = numericValues(currentResults, metric);
      const previousValues = numericValues(previousResults, metric);
      const currentAverage = average(currentValues);
      const previousAverage = average(previousValues);

      return {
        key: metric.key,
        label: metric.label,
        personalBest: metric.personalBest,
        currentTotal: total(currentValues),
        currentAverage,
        currentBest: best(currentValues, metric.personalBest),
        previousAverage,
        changeFromPreviousAverage:
          currentAverage !== null && previousAverage !== null
            ? Number((currentAverage - previousAverage).toFixed(2))
            : null,
      };
    }),
  };
}
