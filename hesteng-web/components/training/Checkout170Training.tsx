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
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3">
        <span className="text-sm font-bold text-gray-300">Pile pr. forsøg</span>
        <div className="flex gap-2">
          {([9, 12, 15] as const).map((darts) => (
            <button
              key={darts}
              type="button"
              onClick={() => setMaxDarts(darts)}
              className={`rounded-xl px-4 py-2 text-sm font-black ${maxDarts === darts ? "bg-orange-500 text-black" : "bg-gray-800 text-gray-300"}`}
            >
              {darts}
            </button>
          ))}
        </div>
      </div>
      <TrainingMatchScorer
        key={maxDarts}
        title="170"
        startScore={170}
        mode="solo"
        soloAttempts={10}
        maxDartsPerAttempt={maxDarts}
        trackEntryAndDoubles
        onComplete={onComplete}
      />
    </div>
  );
}
