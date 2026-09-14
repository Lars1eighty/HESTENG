"use client";

import TrainingMatchScorer from "@/components/training/TrainingMatchScorer";

type Props = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void | Promise<void>;
};

export default function Practice501Training({ onComplete }: Props) {
  return (
    <TrainingMatchScorer
      title="501 Practice"
      startScore={501}
      mode="solo"
      onComplete={onComplete}
    />
  );
}
