"use client";

import { useMemo, useState } from "react";

type Props = {
  onComplete: (result: {
    metrics: Record<string, number>;
    details: Record<string, unknown>;
  }) => void | Promise<void>;
};

export default function Practice501Training({ onComplete }: Props) {
  const [remaining, setRemaining] = useState(501);
  const [input, setInput] = useState("");
  const [visits, setVisits] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const totalScored = useMemo(() => visits.reduce((sum, score) => sum + score, 0), [visits]);
  const average = visits.length > 0 ? totalScored / visits.length : 0;

  function addScore() {
    if (finished) return;
    const score = Number(input);
    if (!Number.isInteger(score) || score < 0 || score > 180) {
      setMessage("Indtast en score fra 0 til 180.");
      return;
    }

    const nextRemaining = remaining - score;
    if (nextRemaining < 0 || nextRemaining === 1 || nextRemaining === 0) {
      setMessage(nextRemaining === 0 ? "Brug Lukket, når du checker ud." : "Bust – scoren tæller som 0.");
      setVisits((current) => [...current, 0]);
      setInput("");
      return;
    }

    setRemaining(nextRemaining);
    setVisits((current) => [...current, score]);
    setInput("");
    setMessage(null);
  }

  async function checkout() {
    if (finished || remaining < 2 || remaining > 170) {
      setMessage("Checkout kan kun registreres fra 2 til 170.");
      return;
    }

    const finalVisits = [...visits, remaining];
    const finalTotal = finalVisits.reduce((sum, score) => sum + score, 0);
    const threeDartAverage = finalVisits.length > 0 ? finalTotal / finalVisits.length : 0;
    setVisits(finalVisits);
    setRemaining(0);
    setFinished(true);
    setMessage(null);

    await onComplete({
      metrics: {
        score: threeDartAverage,
        threeDartAverage,
        visits: finalVisits.length,
        darts: finalVisits.length * 3,
        checkout: remaining,
        highestVisit: Math.max(...finalVisits),
      },
      details: {
        startScore: 501,
        visits: finalVisits,
        checkout: remaining,
      },
    });
  }

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-900 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">501 Practice</div>
          <h2 className="mt-2 text-5xl font-black text-white">{remaining}</h2>
          <p className="mt-2 text-sm font-semibold text-gray-400">Spil ét 501-leg og få dit 3-pils snit gemt automatisk.</p>
        </div>
        <div className="rounded-2xl bg-gray-950 px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-gray-500">3-pils snit</div>
          <div className="text-2xl font-black text-white">{average.toFixed(1)}</div>
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
          onKeyDown={(event) => { if (event.key === "Enter") addScore(); }}
          inputMode="numeric"
          placeholder="Score 0-180"
          className="min-w-0 rounded-2xl border border-gray-700 bg-gray-950 px-4 py-4 text-2xl font-black text-white outline-none focus:border-orange-400"
        />
        <button type="button" onClick={addScore} disabled={finished} className="rounded-2xl bg-orange-500 px-6 py-4 font-black uppercase tracking-wide text-gray-950 disabled:opacity-50">Score</button>
        <button type="button" onClick={() => void checkout()} disabled={finished} className="rounded-2xl border border-emerald-500/50 bg-emerald-500/10 px-6 py-4 font-black uppercase tracking-wide text-emerald-300 disabled:opacity-50">Lukket</button>
      </div>

      {message ? <p className="mt-3 text-sm font-semibold text-amber-300">{message}</p> : null}

      <div className="mt-7 grid grid-cols-3 gap-3 border-t border-gray-800 pt-5 text-center">
        <Stat label="Visits" value={visits.length} />
        <Stat label="Scoret" value={totalScored} />
        <Stat label="Bedste visit" value={visits.length ? Math.max(...visits) : 0} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><div className="text-xs uppercase tracking-wide text-gray-500">{label}</div><div className="mt-1 text-xl font-black text-white">{value}</div></div>;
}
