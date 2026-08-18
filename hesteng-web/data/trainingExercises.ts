import type { TrainingExercise } from "@/lib/trainingTypes";

export const JDC_CHALLENGE_EXERCISE_ID = "jdc-challenge";
export const CATCH_40_EXERCISE_ID = "catch-40";
export const BOBS_27_EXERCISE_ID = "bobs-27";

export const trainingExercises: TrainingExercise[] = [
  {
    id: JDC_CHALLENGE_EXERCISE_ID,
    name: "JDC Challenge",
    type: "training-challenge",
    description: "Registrer samlet JDC Challenge-score og antal Shanghai.",
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
    ],
  },
  {
    id: CATCH_40_EXERCISE_ID,
    name: "Catch 40",
    type: "checkout-training",
    description: "Registrer checkout-targets fra 61 til 100 med hit/miss og antal forsøg.",
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
    description: "Registrer hits på doubles fra D1 til D20 med tre forsøg pr. double.",
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
];

export function getTrainingExercise(exerciseId: string) {
  return trainingExercises.find((exercise) => exercise.id === exerciseId) ?? null;
}
