"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const DOUBLES = [20, 16, 10, 8, 4, 2, 1, 12, 18, 6] as const;
const DARTS_PER_DOUBLE = 6;
type Throw = boolean;

export default function DoubleChallengePage() {
  const [throws, setThrows] = useState<Throw[]>([]);
  const [started, setStarted] = useState(false);
  const total = DOUBLES.length * DARTS_PER_DOUBLE;
  const complete = throws.length === total;
  const hits = throws.filter(Boolean).length;
  const currentIndex = Math.min(Math.floor(throws.length / DARTS_PER_DOUBLE), DOUBLES.length - 1);
  const perDouble = useMemo(() => DOUBLES.map((double, index) => {
    const attempts = throws.slice(index * DARTS_PER_DOUBLE, (index + 1) * DARTS_PER_DOUBLE);
    return { double, attempts: attempts.length, hits: attempts.filter(Boolean).length };
  }), [throws]);

  function record(hit: boolean) {
    if (!started || complete) return;
    setThrows(previous => [...previous, hit]);
  }

  return (
    <main className="min-h-dvh bg-gray-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-lg space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← HESTENG</Link>
          <span className="text-sm font-bold text-orange-400">TRAINING</span>
        </div>
        <header>
          <h1 className="text-3xl font-black">Double Challenge</h1>
          <p className="mt-1 text-sm text-gray-400">10 doubler · 6 pile pr. double · 60 pile i alt</p>
        </header>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Point" value={`${hits}/60`} />
          <Stat label="Træfprocent" value={`${throws.length ? (100 * hits / throws.length).toFixed(1) : "0.0"}%`} />
          <Stat label="Pile kastet" value={`${throws.length}/60`} />
        </div>
        {!started ? (
          <button onClick={() => setStarted(true)} className="w-full rounded-xl bg-orange-500 p-5 text-xl font-black text-gray-950">Start spil</button>
        ) : complete ? (
          <section className="rounded-2xl border border-orange-500 bg-gray-900 p-6 text-center">
            <h2 className="text-2xl font-black">Spillet er afsluttet</h2>
            <p className="mt-2 text-4xl font-black text-orange-400">{hits} / 60</p>
            <p className="mt-2 text-sm text-gray-400">Resultatet gemmes endnu ikke på din profil.</p>
          </section>
        ) : (
          <section className="space-y-4 rounded-2xl border border-gray-700 bg-gray-900 p-5 text-center">
            <p className="text-sm font-semibold text-gray-400">Double {currentIndex + 1} af 10</p>
            <div className="text-7xl font-black text-orange-400">D{DOUBLES[currentIndex]}</div>
            <p className="text-lg">Pil {(throws.length % DARTS_PER_DOUBLE) + 1} af 6</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => record(false)} className="min-h-24 rounded-xl bg-gray-700 text-2xl font-black">MISS</button>
              <button onClick={() => record(true)} className="min-h-24 rounded-xl bg-green-600 text-2xl font-black">HIT</button>
            </div>
          </section>
        )}
        <div className="flex gap-2">
          <button disabled={!throws.length} onClick={() => setThrows(previous => previous.slice(0, -1))} className="flex-1 rounded-xl border border-gray-600 p-3 font-bold disabled:opacity-40">Fortryd sidste pil</button>
          <button onClick={() => { if (window.confirm("Start et nyt spil? Det nuværende resultat går tabt.")) { setThrows([]); setStarted(false); } }} className="rounded-xl border border-gray-600 p-3 font-bold">Nulstil</button>
        </div>
        <section className="space-y-2">
          <h2 className="font-bold">Resultat pr. double</h2>
          <div className="grid grid-cols-2 gap-2">
            {perDouble.map(item => (
              <div key={item.double} className="flex justify-between rounded-lg bg-gray-900 p-3 text-sm">
                <span className="font-bold">D{item.double}</span>
                <span>{item.hits}/{item.attempts} træffere</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-gray-900 p-3"><div className="text-xl font-black">{value}</div><div className="text-xs text-gray-400">{label}</div></div>;
}
