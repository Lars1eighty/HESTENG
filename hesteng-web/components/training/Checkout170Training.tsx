"use client";

import { useState } from "react";

import TrainingMatchScorer from "@/components/training/TrainingMatchScorer";

type Checkout170TrainingProps = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void;
};

export default function Checkout170Training({ onComplete }: Checkout170TrainingProps) {
  const [maxDarts, setMaxDarts] = useState<9 | 12 | 15>(9);

  return (
    <div className="space-y-3">
      <TrainingMatchScorer
        key={maxDarts}
        title="170"
        startScore={170}
        mode="solo"
        soloAttempts={10}
        maxDartsPerAttempt={maxDarts}
        onMaxDartsPerAttemptChange={setMaxDarts}
        trackEntryAndDoubles
        onComplete={onComplete}
      />
    </div>
  );
}
