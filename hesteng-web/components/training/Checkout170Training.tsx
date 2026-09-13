"use client";

import { useMemo, useState } from "react";

const TOTAL_ATTEMPTS = 10;

type Checkout170Attempt = {
  closed: boolean;
  darts: number | null;
};

type Checkout170TrainingProps = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void;
};

export default function Checkout170Training({ onComplete }: Checkout170TrainingProps) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<Checkout170Attempt[]>([]);

  const successfulAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.closed && typeof attempt.darts === "number"),
    [attempts]
  );

  function registerAttempt(darts: number | null) {
    if (!started || finished || attempts.length >= TOTAL_ATTEMPTS) return;

    const nextAttempts = [
      ...attempts,
      {
        closed: darts !== null,
        darts,
      },
    ];

    setAttempts(nextAttempts);

    if (nextAttempts.length !== TOTAL_ATTEMPTS) return;

    const closed = nextAttempts.filter(
      (attempt): attempt is Checkout170Attempt & { darts: number } =>
        attempt.closed && typeof attempt.darts === "number"
    );
    const checkouts = closed.length;
    const checkoutPercent = (checkouts / TOTAL_ATTEMPTS) * 100;
    const bestDarts = closed.length ? Math.min(...closed.map((attempt) => attempt.darts)) : 0;
    const averageDarts = closed.length
      ? closed.reduce((sum, attempt) => sum + attempt.darts, 0) / closed.length
      : 0;

    setFinished(true);
    onComplete({
      metrics: {
        score: checkouts,
        checkouts,
        checkoutAttempts: TOTAL_ATTEMPTS,
        checkoutPercent,
        bestDarts,
        averageDarts,
      },
      details: {
        startTarget: 170,
        maxDartsPerAttempt: 9,
        attempts: nextAttempts,
      },
    });
  }

  if (!started) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">170</div>
          <h2 className="mt-2 text-3xl font-bold text-white">10 forsøg på 170</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
            Du starter på 170 hver gang og har højst 9 pile til at lukke. Efter hvert forsøg registrerer du,
            hvor mange pile du brugte, eller at den ikke blev lukket.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-bold text-white transition hover:bg-orange-400 sm:w-auto sm:min-w-56"
          >
            Start 170
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-7">
      <div className="mx-auto max-w-2xl">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Forsøg</div>
            <div className="mt-1 text-xl font-bold text-white">{Math.min(attempts.length + 1, TOTAL_ATTEMPTS)} / {TOTAL_ATTEMPTS}</div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Lukket</div>
            <div className="mt-1 text-xl font-bold text-white">{successfulAttempts.length}</div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Target</div>
            <div className="mt-1 text-xl font-bold text-white">170</div>
          </div>
        </div>

        <div className="py-8 text-center sm:py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Luk 170</div>
          <div className="mt-2 text-7xl font-black tabular-nums text-white sm:text-8xl">170</div>
          <div className="mt-3 text-sm text-gray-400">Højst 9 pile</div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[3, 4, 5, 6, 7, 8, 9].map((darts) => (
            <button
              key={darts}
              type="button"
              onClick={() => registerAttempt(darts)}
              className="min-h-14 rounded-2xl bg-emerald-500 px-4 py-3 text-base font-black text-white transition hover:bg-emerald-400"
            >
              Lukket på {darts}
            </button>
          ))}
          <button
            type="button"
            onClick={() => registerAttempt(null)}
            className="min-h-14 rounded-2xl bg-white/10 px-4 py-3 text-base font-black text-white transition hover:bg-white/15"
          >
            Ikke lukket
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          Efter 10 forsøg gemmer HESTENG automatisk resultatet.
        </p>
      </div>
    </section>
  );
}
