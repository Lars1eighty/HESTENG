"use client";

import TrainingMatchScorer from "@/components/training/TrainingMatchScorer";

type Checkout170TrainingProps = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void;
};

export default function Checkout170Training({ onComplete }: Checkout170TrainingProps) {
  return (
    <TrainingMatchScorer
      title="170"
      startScore={170}
      mode="solo"
      attemptLabel="FORSØG 1 / 10"
      onComplete={onComplete}
    />
  );
}
