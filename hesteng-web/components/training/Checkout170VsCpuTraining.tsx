"use client";

import { useState } from "react";
import TrainingMatchScorer from "@/components/training/TrainingMatchScorer";

type CpuLevel = 45 | 55 | 65;
type MatchResult = { metrics: Record<string, number>; details: Record<string, unknown> };
type Props = { onComplete: (result: MatchResult) => void };

export default function Checkout170VsCpuTraining({ onComplete }: Props) {
  const [started, setStarted] = useState(false);
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>(55);

  if (!started) {
    return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7"><div className="mx-auto max-w-xl text-center"><div className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">170 vs CPU</div><h2 className="mt-2 text-3xl font-bold text-white">Først til 5 legs</h2><p className="mt-3 text-gray-300">Begge starter på 170. Samme scorer og checkout-flow som i HESTENG-kampe.</p><div className="mt-6 grid grid-cols-3 gap-2">{([45,55,65] as CpuLevel[]).map(level=><button key={level} type="button" onClick={()=>setCpuLevel(level)} className={`rounded-2xl px-3 py-3 text-sm font-black ${cpuLevel===level?"bg-orange-500 text-white":"bg-white/10 text-gray-300"}`}>CPU {level}</button>)}</div><button type="button" onClick={()=>setStarted(true)} className="mt-5 rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold text-white">Start kamp</button></div></section>;
  }

  return <TrainingMatchScorer title="170 vs CPU" startScore={170} mode="cpu" cpuLevel={cpuLevel} legsToWin={5} onComplete={onComplete} />;
}
