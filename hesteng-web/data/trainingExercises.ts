import type { TrainingExercise } from "@/lib/trainingTypes";

export const JDC_CHALLENGE_EXERCISE_ID = "jdc-challenge";
export const CATCH_40_EXERCISE_ID = "catch-40";
export const CHECKOUT_121_EXERCISE_ID = "checkout-121";
export const CHECKOUT_170_EXERCISE_ID = "checkout-170";
export const CHECKOUT_170_VS_CPU_EXERCISE_ID = "checkout-170-vs-cpu";
export const DOUBLES_10_EXERCISE_ID = "doubles-10";
export const SCORING_TARGETS_EXERCISE_ID = "scoring-targets";
export const BOBS_27_EXERCISE_ID = "bobs-27";
export const GAME_420_EXERCISE_ID = "game-420";
export const SCORING_EXERCISE_ID = "scoring";
export const PRIESTLEY_TRIPLES_EXERCISE_ID = "priestleys-triples";
export const AROUND_THE_WORLD_EXERCISE_ID = "around-the-world";
export const TARGET_TRAINING_EXERCISE_ID = "target-training";

export const trainingExercises: TrainingExercise[] = [
  {
    id: JDC_CHALLENGE_EXERCISE_ID,
    name: "JDC Challenge",
    type: "training-challenge",
    description: "Live gameplay med Shanghai, doubles around the world og automatisk score.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "shanghaiCount", label: "Shanghai", valueType: "count", personalBest: "higherIsBetter" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
    ],
  },
  {
    id: CATCH_40_EXERCISE_ID,
    name: "Catch 40",
    type: "checkout-training",
    description: "Live checkout-træning fra 61 til 100 med automatisk score.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "checkouts", label: "Checkouts", valueType: "count" },
      { key: "checkoutAttempts", label: "Forsøg", valueType: "count" },
      { key: "checkoutPercent", label: "Checkout %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "highestCheckout", label: "Højeste luk", valueType: "number", personalBest: "higherIsBetter" },
    ],
  },
  {
    id: CHECKOUT_121_EXERCISE_ID,
    name: "121",
    type: "checkout-progression",
    description: "20 minutter. Luk 121 med 9 pile, gå ét tal op ved succes og bliv på samme tal ved miss.",
    isActive: true,
    metrics: [
      { key: "score", label: "Højeste luk", valueType: "number", personalBest: "higherIsBetter" },
      { key: "highestCheckout", label: "Højeste luk", valueType: "number", personalBest: "higherIsBetter" },
      { key: "checkouts", label: "Lukkede", valueType: "count", personalBest: "higherIsBetter" },
      { key: "checkoutAttempts", label: "Forsøg", valueType: "count" },
      { key: "checkoutPercent", label: "Checkout %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "durationSeconds", label: "Tid", valueType: "duration" },
    ],
  },
  {
    id: CHECKOUT_170_EXERCISE_ID,
    name: "170",
    type: "checkout-training",
    description: "10 forsøg på 170 med højst 9 pile pr. forsøg.",
    isActive: true,
    metrics: [
      { key: "score", label: "Lukkede", valueType: "count", personalBest: "higherIsBetter" },
      { key: "checkouts", label: "Lukkede", valueType: "count", personalBest: "higherIsBetter" },
      { key: "checkoutAttempts", label: "Forsøg", valueType: "count" },
      { key: "checkoutPercent", label: "Checkout %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "bestDarts", label: "Bedste antal pile", valueType: "count", personalBest: "lowerIsBetter" },
      { key: "averageDarts", label: "Snit pile", valueType: "number", personalBest: "lowerIsBetter" },
    ],
  },
  {
    id: CHECKOUT_170_VS_CPU_EXERCISE_ID,
    name: "170 vs CPU",
    type: "checkout-match",
    description: "Først til 5 legs mod CPU. Begge starter hvert leg på 170.",
    isActive: true,
    metrics: [
      { key: "score", label: "Dine legs", valueType: "count", personalBest: "higherIsBetter" },
      { key: "won", label: "Sejr", valueType: "count", personalBest: "higherIsBetter" },
      { key: "playerLegs", label: "Dine legs", valueType: "count", personalBest: "higherIsBetter" },
      { key: "cpuLegs", label: "CPU legs", valueType: "count", personalBest: "lowerIsBetter" },
      { key: "threeDartAverage", label: "3-pils snit", valueType: "number", personalBest: "higherIsBetter" },
      { key: "cpuLevel", label: "CPU niveau", valueType: "number" },
    ],
  },
  {
    id: DOUBLES_10_EXERCISE_ID,
    name: "Doubles 10",
    type: "double-training",
    description: "10 tilfældige doubler fra D1 til D20 med 3 pile på hver.",
    isActive: true,
    metrics: [
      { key: "score", label: "Doubler ramt", valueType: "count", personalBest: "higherIsBetter" },
      { key: "hits", label: "Doubler ramt", valueType: "count", personalBest: "higherIsBetter" },
      { key: "targets", label: "Targets", valueType: "count" },
      { key: "doublePercent", label: "Double %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "totalDartsThrown", label: "Pile brugt", valueType: "count", personalBest: "lowerIsBetter" },
      { key: "averageDartsOnHit", label: "Snit pile ved hit", valueType: "number", personalBest: "lowerIsBetter" },
    ],
  },
  {
    id: SCORING_TARGETS_EXERCISE_ID,
    name: "Scoring Targets",
    type: "target-scoring",
    description: "10 runder med 3 pile på hver af T20, T19 og Bull.",
    isActive: true,
    metrics: [
      { key: "score", label: "Point", valueType: "number", personalBest: "higherIsBetter" },
      { key: "hits", label: "Hits", valueType: "count", personalBest: "higherIsBetter" },
      { key: "attempts", label: "Pile", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "t20Hits", label: "T20 hits", valueType: "count", personalBest: "higherIsBetter" },
      { key: "t19Hits", label: "T19 hits", valueType: "count", personalBest: "higherIsBetter" },
      { key: "bullHits", label: "Bull hits", valueType: "count", personalBest: "higherIsBetter" },
    ],
  },
  {
    id: BOBS_27_EXERCISE_ID,
    name: "Bob's 27",
    type: "double-training",
    description: "Live double-træning fra D1 til D20 og Bull med automatisk score.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
    ],
  },
  {
    id: GAME_420_EXERCISE_ID,
    name: "Game 420",
    type: "target-training",
    description: "Live træning fra D1 til D20 og Bull med remaining fra 420.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "remaining420", label: "Remaining", valueType: "number", personalBest: "lowerIsBetter" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
    ],
  },
  {
    id: SCORING_EXERCISE_ID,
    name: "Scoring",
    type: "target-scoring",
    description: "100 pile på valgt target med performance-point og automatisk statistik.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "singles", label: "Singles", valueType: "count" },
      { key: "doubles", label: "Doubles", valueType: "count" },
      { key: "triples", label: "Triples", valueType: "count" },
      { key: "misses", label: "Misses", valueType: "count" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "first50Score", label: "Første 50", valueType: "number" },
      { key: "second50Score", label: "Sidste 50", valueType: "number" },
    ],
  },
  {
    id: PRIESTLEY_TRIPLES_EXERCISE_ID,
    name: "Priestley's Triples",
    type: "triple-training",
    description: "3 pile mod hver triple fra T10 til T20. Kun triple-hits tæller.",
    isActive: true,
    metrics: [
      { key: "score", label: "Score", valueType: "number", personalBest: "higherIsBetter" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "triples", label: "Triples", valueType: "count", personalBest: "higherIsBetter" },
      { key: "singles", label: "Singles", valueType: "count" },
      { key: "doubles", label: "Doubles", valueType: "count" },
      { key: "misses", label: "Misses", valueType: "count" },
    ],
  },
  {
    id: AROUND_THE_WORLD_EXERCISE_ID,
    name: "Around the World",
    type: "accuracy-training",
    description: "Ram 1-20 og Bull i rækkefølge. Variant afgør segmentet.",
    isActive: true,
    metrics: [
      { key: "dartsUsed", label: "Pile brugt", valueType: "count", personalBest: "lowerIsBetter" },
      { key: "hits", label: "Hits", valueType: "count" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "misses", label: "Misses", valueType: "count" },
    ],
  },
  {
    id: TARGET_TRAINING_EXERCISE_ID,
    name: "Target Training",
    type: "custom-target-training",
    description: "Sammensæt 1-3 targets og træn hits over valgte runder.",
    isActive: true,
    metrics: [
      { key: "hitPercent", label: "Træf %", valueType: "percent", personalBest: "higherIsBetter" },
      { key: "hits", label: "Hits", valueType: "count", personalBest: "higherIsBetter" },
      { key: "attempts", label: "Forsøg", valueType: "count" },
    ],
  },
];

export function getTrainingExercise(exerciseId: string) {
  return trainingExercises.find((exercise) => exercise.id === exerciseId) ?? null;
}
