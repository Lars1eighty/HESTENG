"use client";

import { useMemo, useState } from "react";

const TOTAL_TARGETS = 10;
const MAX_DARTS_PER_TARGET = 3;

type Attempt = {
  target: number;
  darts: number | null;
};

type Props = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void;
};

function createTargets() {
  const doubles = Array.from({ length: 20 }, (_, index) => index + 1);
  for (let index = doubles.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [doubles[index], doubles[swapIndex]] = [doubles[swapIndex], doubles[index]];
  }
  return doubles.slice(0, TOTAL_TARGETS);
}

export default function Doubles10Training({ onComplete }: Props) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [targets] = useState(createTargets);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const currentTarget = targets[Math.min(attempts.length, TOTAL_TARGETS - 1)];
  const hits = useMemo(() => attempts.filter((attempt) => attempt.darts !== null), [attempts]);

  function registerAttempt(darts: number | null) {
    if (!started || finished || attempts.length >= TOTAL_TARGETS) return;

    const nextAttempts = [
      ...attempts,
      {
        target: currentTarget,
        darts,
      },
    ];

    setAttempts(nextAttempts);

    if (nextAttempts.length !== TOTAL_TARGETS) return;

    const successful = nextAttempts.filter(
      (attempt): attempt is Attempt & { darts: number } => typeof attempt.darts === "number"
    );
    const successfulTargets = successful.length;
    const totalDartsThrown = nextAttempts.reduce(
      (sum, attempt) => sum + (attempt.darts ?? MAX_DARTS_PER_TARGET),
      0
    );
    const doublePercent = (successfulTargets / TOTAL_TARGETS) * 100;
    const averageDartsOnHit = successfulTargets
      ? successful.reduce((sum, attempt) => sum + attempt.darts, 0) / successfulTargets
      : 0;

    setFinished(true);
    onComplete({
      metrics: {
        score: successfulTargets,
        hits: successfulTargets,
        targets: TOTAL_TARGETS,
        doublePercent,
        totalDartsThrown,
        averageDartsOnHit,
      },
      details: {
        maxDartsPerTarget: MAX_DARTS_PER_TARGET,
        targets,
        attempts: nextAttempts,
      },
    });
  }

  if (!started) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">Doubles 10</div>
          <h2 className="mt-2 text-3xl font-bold text-white">10 tilfældige doubler</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
            Du får 10 forskellige doubler fra D1 til D20. Du har 3 pile på hver double og registrerer,
            om du rammer på første, anden eller tredje pil.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-bold text-white transition hover:bg-orange-400 sm:w-auto sm:min-w-56"
          >
            Start Doubles 10
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-7">
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <Stat label="Target" value={`${Math.min(attempts.length + 1, TOTAL_TARGETS)} / ${TOTAL_TARGETS}`} />
          <Stat label="Ramt" value={hits.length} />
          <Stat label="Double" value={`D${currentTarget}`} />
        </div>

        <div className="py-9 text-center sm:py-12">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Ram</div>
          <div className="mt-2 text-7xl font-black tabular-nums text-white sm:text-8xl">D{currentTarget}</div>
          <div className="mt-3 text-sm text-gray-400">3 pile</div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3].map((darts) => (
            <button
              key={darts}
              type="button"
              onClick={() => registerAttempt(darts)}
              className="min-h-16 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-black text-white transition hover:bg-emerald-400"
            >
              Ramt på {darts}
            </button>
          ))}
          <button
            type="button"
            onClick={() => registerAttempt(null)}
            className="min-h-16 rounded-2xl bg-white/10 px-4 py-3 text-base font-black text-white transition hover:bg-white/15"
          >
            Miss
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          Efter 10 doubler gemmer HESTENG automatisk resultatet.
        </p>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-black/20 p-3">
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 text-xl font-black text-white">{value}</div>
    </div>
  );
}
