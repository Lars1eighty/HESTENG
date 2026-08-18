import type { TrainingExercise } from "@/lib/trainingTypes";

export const JDC_CHALLENGE_EXERCISE_ID = "jdc-challenge";
export const CATCH_40_EXERCISE_ID = "catch-40";

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
];

export function getTrainingExercise(exerciseId: string) {
  return trainingExercises.find((exercise) => exercise.id === exerciseId) ?? null;
}
