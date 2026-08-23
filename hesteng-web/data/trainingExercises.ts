import type { TrainingExercise } from "@/lib/trainingTypes";

export const JDC_CHALLENGE_EXERCISE_ID = "jdc-challenge";
export const CATCH_40_EXERCISE_ID = "catch-40";
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
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "shanghaiCount",
        label: "Shanghai",
        valueType: "count",
        personalBest: "higherIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
    ],
  },
  {
    id: CATCH_40_EXERCISE_ID,
    name: "Catch 40",
    type: "checkout-training",
    description: "Live checkout-træning fra 61 til 100 med automatisk score.",
    isActive: true,
    metrics: [
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "checkouts",
        label: "Checkouts",
        valueType: "count",
      },
      {
        key: "checkoutAttempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "checkoutPercent",
        label: "Checkout %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
      {
        key: "highestCheckout",
        label: "Højeste luk",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
    ],
  },
  {
    id: BOBS_27_EXERCISE_ID,
    name: "Bob's 27",
    type: "double-training",
    description: "Live double-træning fra D1 til D20 og Bull med automatisk score.",
    isActive: true,
    metrics: [
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
    ],
  },
  {
    id: GAME_420_EXERCISE_ID,
    name: "Game 420",
    type: "target-training",
    description: "Live træning fra D1 til D20 og Bull med remaining fra 420.",
    isActive: true,
    metrics: [
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "remaining420",
        label: "Remaining",
        valueType: "number",
        personalBest: "lowerIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
    ],
  },
  {
    id: SCORING_EXERCISE_ID,
    name: "Scoring",
    type: "target-scoring",
    description: "100 pile på valgt target med performance-point og automatisk statistik.",
    isActive: true,
    metrics: [
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "singles",
        label: "Singles",
        valueType: "count",
      },
      {
        key: "doubles",
        label: "Doubles",
        valueType: "count",
      },
      {
        key: "triples",
        label: "Triples",
        valueType: "count",
      },
      {
        key: "misses",
        label: "Misses",
        valueType: "count",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
      {
        key: "first50Score",
        label: "Første 50",
        valueType: "number",
      },
      {
        key: "second50Score",
        label: "Sidste 50",
        valueType: "number",
      },
    ],
  },
  {
    id: PRIESTLEY_TRIPLES_EXERCISE_ID,
    name: "Priestley's Triples",
    type: "triple-training",
    description: "3 pile mod hver triple fra T10 til T20. Kun triple-hits tæller.",
    isActive: true,
    metrics: [
      {
        key: "score",
        label: "Score",
        valueType: "number",
        personalBest: "higherIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
      {
        key: "triples",
        label: "Triples",
        valueType: "count",
        personalBest: "higherIsBetter",
      },
      {
        key: "singles",
        label: "Singles",
        valueType: "count",
      },
      {
        key: "doubles",
        label: "Doubles",
        valueType: "count",
      },
      {
        key: "misses",
        label: "Misses",
        valueType: "count",
      },
    ],
  },
  {
    id: AROUND_THE_WORLD_EXERCISE_ID,
    name: "Around the World",
    type: "accuracy-training",
    description: "Ram 1-20 og Bull i rækkefølge. Variant afgør segmentet.",
    isActive: true,
    metrics: [
      {
        key: "dartsUsed",
        label: "Pile brugt",
        valueType: "count",
        personalBest: "lowerIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
      {
        key: "misses",
        label: "Misses",
        valueType: "count",
      },
    ],
  },
  {
    id: TARGET_TRAINING_EXERCISE_ID,
    name: "Target Training",
    type: "custom-target-training",
    description: "Sammensæt 1-3 targets og træn hits over valgte runder.",
    isActive: true,
    metrics: [
      {
        key: "hitPercent",
        label: "Træf %",
        valueType: "percent",
        personalBest: "higherIsBetter",
      },
      {
        key: "hits",
        label: "Hits",
        valueType: "count",
        personalBest: "higherIsBetter",
      },
      {
        key: "attempts",
        label: "Forsøg",
        valueType: "count",
      },
    ],
  },
];

export function getTrainingExercise(exerciseId: string) {
  return trainingExercises.find((exercise) => exercise.id === exerciseId) ?? null;
}
