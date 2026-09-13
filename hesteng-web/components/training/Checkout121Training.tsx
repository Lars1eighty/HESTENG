"use client";

import { useEffect, useMemo, useState } from "react";

const SESSION_SECONDS = 20 * 60;

type Checkout121Attempt = {
  target: number;
  closed: boolean;
};

type Checkout121TrainingProps = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function Checkout121Training({
  onComplete,
  onDirtyChange,
}: Checkout121TrainingProps) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_SECONDS);
  const [currentTarget, setCurrentTarget] = useState(121);
  const [attempts, setAttempts] = useState<Checkout121Attempt[]>([]);
  const [finishAfterAttempt, setFinishAfterAttempt] = useState(false);

  const successfulAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.closed),
    [attempts]
  );

  useEffect(() => {
    onDirtyChange?.(started && !finished);
  }, [finished, onDirtyChange, started]);

  useEffect(() => {
    if (!started || finished || finishAfterAttempt) return;

    const intervalId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setFinishAfterAttempt(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [finishAfterAttempt, finished, started]);

  function completeSession(nextAttempts: Checkout121Attempt[]) {
    if (finished) return;

    const closed = nextAttempts.filter((attempt) => attempt.closed);
    const highestCheckout = closed.length
      ? Math.max(...closed.map((attempt) => attempt.target))
      : 0;
    const checkoutPercent = nextAttempts.length
      ? (closed.length / nextAttempts.length) * 100
      : 0;

    setFinished(true);
    onDirtyChange?.(false);
    onComplete({
      metrics: {
        score: highestCheckout,
        highestCheckout,
        checkouts: closed.length,
        checkoutAttempts: nextAttempts.length,
        checkoutPercent,
        durationSeconds: SESSION_SECONDS,
      },
      details: {
        startTarget: 121,
        finalTarget: currentTarget,
        durationSeconds: SESSION_SECONDS,
        attempts: nextAttempts,
      },
    });
  }

  function registerAttempt(closed: boolean) {
    if (!started || finished) return;

    const nextAttempts = [
      ...attempts,
      {
        target: currentTarget,
        closed,
      },
    ];

    setAttempts(nextAttempts);

    if (closed) {
      setCurrentTarget((target) => target + 1);
    }

    if (finishAfterAttempt) {
      completeSession(nextAttempts);
    }
  }

  if (!started) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="mx-auto max-w-xl text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
            121
          </div>
          <h2 className="mt-2 text-3xl font-bold text-white">20 minutters checkout-træning</h2>
          <p className="mt-3 text-sm leading-6 text-gray-300 sm:text-base">
            Du starter på 121 og har 9 pile pr. forsøg. Lukker du, går du ét tal op.
            Lukker du ikke, bliver du på samme tal og prøver igen.
          </p>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-bold text-white transition hover:bg-orange-400 sm:w-auto sm:min-w-56"
          >
            Start 20 minutter
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
            <div className="text-xs uppercase tracking-wide text-gray-400">Tid</div>
            <div className="mt-1 text-xl font-bold text-white">{formatTime(timeLeft)}</div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Lukket</div>
            <div className="mt-1 text-xl font-bold text-white">{successfulAttempts.length}</div>
          </div>
          <div className="rounded-2xl bg-black/20 p-3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Forsøg</div>
            <div className="mt-1 text-xl font-bold text-white">{attempts.length}</div>
          </div>
        </div>

        <div className="py-8 text-center sm:py-10">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
            Nuværende checkout
          </div>
          <div className="mt-2 text-7xl font-black tabular-nums text-white sm:text-8xl">
            {currentTarget}
          </div>
          <div className="mt-3 text-sm text-gray-400">9 pile til at lukke</div>
        </div>

        {finishAfterAttempt ? (
          <div className="mb-4 rounded-2xl border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-center text-sm font-medium text-orange-200">
            Tiden er gået. Afslut dette sidste 9-pilsforsøg.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => registerAttempt(true)}
            className="min-h-20 rounded-2xl bg-emerald-500 px-5 py-5 text-xl font-black text-white transition hover:bg-emerald-400"
          >
            Lukket
          </button>
          <button
            type="button"
            onClick={() => registerAttempt(false)}
            className="min-h-20 rounded-2xl bg-white/10 px-5 py-5 text-xl font-black text-white transition hover:bg-white/15"
          >
            Ikke lukket
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-5 text-gray-500">
          En lukning sender dig videre til næste tal. En miss betyder nyt forsøg på samme tal.
        </p>
      </div>
    </section>
  );
}
