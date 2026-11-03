"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  canCheckout501,
  finished501Legs,
  record501Visit,
  remaining501,
  summarize501,
  type Solo501LegCount,
  type Solo501Visit,
} from "@/lib/solo501Engine";

type Props = {
  onComplete: (result: ReturnType<typeof summarize501>) => void | Promise<void>;
};

type PendingVisit = { kind: "checkout" | "bust" | "miss"; score: number };

const QUICK_SCORES = [26, 41, 45, 60, 81, 85, 100, 120, 140, 180];
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLR", "0", "✓"];

function numericButtonClass(active: boolean) {
  return active
    ? "rounded-lg border border-orange-400 bg-orange-500 px-3 py-2 font-black text-gray-950"
    : "rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-black text-gray-200";
}

export default function Practice501Training({ onComplete }: Props) {
  const [targetLegs, setTargetLegs] = useState<Solo501LegCount>(5);
  const [started, setStarted] = useState(false);
  const [visits, setVisits] = useState<Solo501Visit[]>([]);
  const [input, setInput] = useState("");
  const [missedDoubles, setMissedDoubles] = useState(0);
  const [pending, setPending] = useState<PendingVisit | null>(null);
  const [pendingDarts, setPendingDarts] = useState<1 | 2 | 3>(3);
  const [pendingDoubles, setPendingDoubles] = useState(1);
  const [error, setError] = useState("");
  const completionStarted = useRef(false);

  const completed = finished501Legs(visits);
  const remaining = remaining501(visits);
  const finished = completed === targetLegs;
  const lastVisit = visits.at(-1);
  const currentLeg = Math.min(completed + 1, targetLegs);
  const points = visits.reduce((sum, visit) => sum + visit.score, 0);
  const darts = visits.reduce((sum, visit) => sum + visit.darts, 0);
  const average = darts ? (points * 3 / darts).toFixed(1) : "0.0";
  const currentLegVisits = visits.filter((visit) => visit.leg === currentLeg);
  const recent = currentLegVisits.slice(-3).map((visit) => visit.bust ? "B" : String(visit.score)).join(" · ");

  function start() {
    setVisits([]);
    setInput("");
    setMissedDoubles(0);
    setPending(null);
    setError("");
    completionStarted.current = false;
    setStarted(true);
  }

  function exit() {
    if (visits.length && !finished && !window.confirm("Afslut 501? Det igangværende spil bliver ikke gemt.")) return;
    setStarted(false);
  }

  function beginPrompt(kind: PendingVisit["kind"], score = 0) {
    setPending({ kind, score });
    setPendingDarts(3);
    setPendingDoubles(kind === "checkout" ? 1 : Math.min(missedDoubles, 3));
    setError("");
  }

  function addVisit(score: number, usedDarts: 1 | 2 | 3 = 3, doubleAttempts = missedDoubles, bust = false) {
    if (finished || completionStarted.current) return;
    try {
      const next = record501Visit(visits, { score, darts: usedDarts, doubleAttempts, bust }, targetLegs);
      setVisits(next);
      setInput("");
      setMissedDoubles(0);
      setPending(null);
      setError("");
      if (finished501Legs(next) === targetLegs) {
        completionStarted.current = true;
        void onComplete(summarize501(next, targetLegs));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ugyldig indgang.");
    }
  }

  function submitScore(score: number) {
    if (finished || pending) return;
    if (!Number.isInteger(score) || score < 0 || score > 180) {
      setError("Indtast en score mellem 0 og 180.");
      return;
    }
    if (score > remaining || remaining - score === 1) {
      beginPrompt("bust", score);
      return;
    }
    if (score === remaining) {
      if (!canCheckout501(remaining)) {
        beginPrompt("bust", score);
      } else {
        beginPrompt("checkout", score);
      }
      return;
    }
    addVisit(score);
  }

  function keyPress(key: string) {
    if (key === "CLR") {
      setInput((value) => value.slice(0, -1));
      return;
    }
    if (key === "✓") {
      if (input !== "") submitScore(Number(input));
      return;
    }
    const next = input === "0" ? key : input + key;
    if (next.length <= 3 && Number(next) <= 180) {
      setInput(next);
      setError("");
    }
  }

  function confirmPending() {
    if (!pending) return;
    addVisit(
      pending.kind === "checkout" ? pending.score : 0,
      pendingDarts,
      pendingDoubles,
      pending.kind === "bust",
    );
  }

  function undo() {
    if (!visits.length || finished) return;
    setVisits((previous) => previous.slice(0, -1));
    setInput("");
    setMissedDoubles(0);
    setPending(null);
    setError("");
  }

  if (!started) {
    return (
      <section className="mx-auto max-w-xl rounded-3xl border border-gray-800 bg-gray-900 p-5 text-white shadow-xl sm:p-7">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-400">HESTENG Training</div>
        <h2 className="mt-2 text-4xl font-black">501 · Jagten på 55</h2>
        <p className="mt-3 text-sm text-gray-300">Spil sammenhængende legs, og få præcise tal på scoring, pile og lukninger.</p>
        <div className="mt-6 text-sm font-bold text-gray-300">Hvor mange legs vil du spille?</div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {([1, 3, 5, 10] as const).map((legs) => (
            <button
              key={legs}
              type="button"
              onClick={() => setTargetLegs(legs)}
              className={numericButtonClass(targetLegs === legs) + " min-h-14 text-xl"}
              aria-pressed={targetLegs === legs}
            >
              {legs}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">Et leg afsluttes på en double. Indgange tæller normalt 3 pile; ved lukning eller bust vælger du antal pile.</p>
        <button type="button" onClick={start} className="mt-6 w-full rounded-2xl bg-orange-500 py-4 text-lg font-black text-gray-950">
          Start {targetLegs} {targetLegs === 1 ? "leg" : "legs"}
        </button>
      </section>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#0b0e14] px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-[max(0.4rem,env(safe-area-inset-top))] text-white sm:mx-auto sm:max-w-xl">
      <header className="mb-1 flex h-9 shrink-0 items-center justify-between gap-2">
        <button type="button" onClick={exit} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-bold text-gray-300">
          ← Afslut
        </button>
        <span className="text-sm font-black tracking-wide text-orange-400">501 TRAINING</span>
        <span className="text-xs font-bold text-gray-400">LEG {currentLeg}/{targetLegs}</span>
      </header>

      <section className="mb-2 shrink-0 rounded-2xl border border-gray-700 bg-[#1b222d] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tilbage</p>
            <div className="text-[clamp(3.6rem,17vw,5.2rem)] font-black leading-none tabular-nums">{finished ? 0 : remaining}</div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-[10px] font-bold text-gray-400">SENESTE</p>
            <div className="truncate text-sm font-black text-white">{recent || "—"}</div>
            {lastVisit?.checkout && !finished ? <p className="mt-1 text-xs font-bold text-orange-300">Leg {completed} lukket!</p> : null}
          </div>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-2 border-t border-gray-700 pt-1.5 text-center">
          <div><div className="text-[10px] font-bold text-gray-400">3-PILS SNIT</div><div className="text-lg font-black tabular-nums">{average}</div></div>
          <div><div className="text-[10px] font-bold text-gray-400">PILE</div><div className="text-lg font-black tabular-nums">{darts}</div></div>
          <div><div className="text-[10px] font-bold text-gray-400">LUKKET</div><div className="text-lg font-black tabular-nums">{completed}/{targetLegs}</div></div>
        </div>
      </section>

      {pending ? (
        <section className="flex min-h-0 flex-1 flex-col justify-between gap-2 rounded-2xl border border-orange-500/60 bg-gray-900 p-3">
          <div className="text-center">
            <h3 className="text-xl font-black">{pending.kind === "checkout" ? "Lukket på double?" : pending.kind === "bust" ? "Bust" : "Missede doubler"}</h3>
            <p className="mt-1 text-xs text-gray-400">{pending.kind === "checkout" ? "Registrér pile og doubleforsøg i indgangen." : "Restscoren ændres ikke."}</p>
          </div>
          <div>
            <p className="mb-2 text-center text-xs font-bold uppercase text-gray-300">Pile brugt i indgangen</p>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((count) => (
                <button key={count} type="button" onClick={() => { setPendingDarts(count); setPendingDoubles((value) => Math.min(value, count)); }} className={numericButtonClass(pendingDarts === count) + " min-h-12 text-xl"}>{count}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-center text-xs font-bold uppercase text-gray-300">Doubleforsøg i indgangen</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((count) => (
                <button key={count} type="button" disabled={count > pendingDarts || (pending.kind === "checkout" && count === 0)} onClick={() => setPendingDoubles(count)} className={numericButtonClass(pendingDoubles === count) + " min-h-12 text-xl disabled:opacity-30"}>{count}</button>
              ))}
            </div>
          </div>
          {error ? <p role="alert" className="text-center text-xs text-red-300">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPending(null)} className="rounded-xl border border-gray-700 py-3 font-bold">Tilbage</button>
            <button type="button" onClick={confirmPending} className="rounded-xl bg-orange-500 py-3 font-black text-gray-950">Gem indgang</button>
          </div>
        </section>
      ) : finished ? (
        <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl bg-gray-900 p-4 text-center">
          <h3 className="text-3xl font-black text-emerald-400">Alle legs lukket</h3>
          <p className="mt-3 text-gray-300">Resultatet behandles. Du får statistik og gemmestatus på næste skærm.</p>
        </section>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="flex min-h-10 shrink-0 items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-900 px-3">
            <span className="text-xs font-bold text-gray-400">INDTAST SCORE</span>
            <span className="text-2xl font-black tabular-nums text-white">{input || "—"}</span>
            <button type="button" onClick={() => setInput("")} className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-black">RYD</button>
          </div>

          {remaining <= 170 ? (
            <div className="flex min-h-9 shrink-0 items-center justify-between gap-2 rounded-xl bg-gray-900 px-2">
              <span className="text-[11px] font-bold text-gray-300">Missede doubler i indgangen</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((count) => (
                  <button type="button" key={count} onClick={() => setMissedDoubles(count)} className={(missedDoubles === count ? "bg-orange-500 text-gray-950" : "bg-gray-800 text-white") + " h-8 min-w-8 rounded-md text-sm font-black"}>{count}</button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid shrink-0 grid-cols-5 gap-1">
            {QUICK_SCORES.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => submitScore(score)}
                className="min-h-9 touch-manipulation rounded-lg border border-emerald-700/60 bg-emerald-900/50 text-[clamp(0.9rem,4vw,1.2rem)] font-black text-emerald-200"
              >
                {score}
              </button>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-3 grid-rows-4 gap-1">
            {KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => keyPress(key)}
                className={(key === "✓" ? "bg-orange-500 text-gray-950" : "border border-gray-700 bg-[#252d39] text-white") + " min-h-0 touch-manipulation rounded-xl text-[clamp(1.25rem,5vw,1.9rem)] font-black active:scale-[0.98]"}
                aria-label={key === "✓" ? "Registrér score" : key === "CLR" ? "Slet sidste ciffer" : key}
              >
                {key === "CLR" ? "⌫" : key}
              </button>
            ))}
          </div>

          {error ? <p role="alert" className="shrink-0 text-center text-xs font-semibold text-red-300">{error}</p> : null}

          <div className="grid h-10 shrink-0 grid-cols-2 gap-2">
            <button type="button" onClick={undo} disabled={!visits.length} className="rounded-xl border border-gray-700 bg-gray-900 text-sm font-bold disabled:opacity-30">↶ Fortryd</button>
            <button type="button" onClick={() => beginPrompt("miss")} disabled={remaining > 170} className="rounded-xl border border-amber-700 bg-amber-900/30 text-sm font-bold text-amber-200 disabled:opacity-30">Bust / Miss</button>
          </div>
        </section>
      )}
    </div>
  );
}
