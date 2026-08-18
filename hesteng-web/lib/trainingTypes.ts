export type TrainingMetricKey =
  | "score"
  | "hits"
  | "attempts"
  | "hitPercent"
  | "checkoutPercent"
  | "oneEighties"
  | "highestCheckout"
  | "dartsUsed"
  | "average"
  | "first9Average"
  | "shanghaiCount"
  | "remaining420"
  | (string & {});

export type TrainingMetricDirection = "higherIsBetter" | "lowerIsBetter";

export type TrainingMetricValueType = "number" | "percent" | "count" | "duration" | "text";

export type TrainingMetricDefinition = {
  key: TrainingMetricKey;
  label: string;
  valueType: TrainingMetricValueType;
  personalBest?: TrainingMetricDirection;
};

export type TrainingExercise = {
  id: string;
  name: string;
  type: string;
  variant?: string;
  description: string;
  metrics: TrainingMetricDefinition[];
  isActive: boolean;
};

export type TrainingMetricValue = number | string | boolean | null;

export type TrainingResultMetrics = Partial<Record<TrainingMetricKey, TrainingMetricValue>>;

export type TrainingResultDetails = Record<string, unknown>;

export type TrainingResult = {
  id: string;
  clubId?: string;
  playerId: string;
  exerciseId: string;
  variant?: string;
  completedAt: string;
  metrics: TrainingResultMetrics;
  details?: TrainingResultDetails;
};
