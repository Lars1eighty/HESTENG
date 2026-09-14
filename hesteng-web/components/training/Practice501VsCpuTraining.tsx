"use client";

import { useState } from "react";
import TrainingMatchScorer from "@/components/training/TrainingMatchScorer";

type CpuLevel = 45 | 55 | 65;
type LegsToWin = 3 | 5 | 7 | 9;
type Props = { onComplete: (result: { metrics: Record<string, number>; details: Record<string, unknown> }) => void };

export default function Practice501VsCpuTraining({ onComplete }: Props) {
  const [started, setStarted] = useState(false);
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>(55);
  const [legsToWin, setLegsToWin] = useState<LegsToWin>(5);

  if (!started) {
    return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7"><div className="mx-auto max-w-xl text-center"><div className="text-sm font-semibold uppercase tracking-[.2em] text-orange-300">501 vs CPU</div><h2 className="mt-2 text-3xl font-bold text-white">Vælg kamp</h2><p className="mt-3 text-gray-300">Samme scorer som i HESTENG-kampe. CPU spiller automatisk efter din tur.</p><div className="mt-6 grid grid-cols-3 gap-2">{([45,55,65] as CpuLevel[]).map(level=><button key={level} onClick={()=>setCpuLevel(level)} className={`rounded-2xl p-3 font-black ${cpuLevel===level?"bg-orange-500":"bg-white/10"}`}>CPU {level}</button>)}</div><div className="mt-3 grid grid-cols-4 gap-2">{([3,5,7,9] as LegsToWin[]).map(legs=><button key={legs} onClick={()=>setLegsToWin(legs)} className={`rounded-2xl p-3 font-black ${legsToWin===legs?"bg-orange-500":"bg-white/10"}`}>FT{legs}</button>)}</div><button onClick={()=>setStarted(true)} className="mt-5 rounded-2xl bg-orange-500 px-8 py-4 text-lg font-bold">Start kamp</button></div></section>;
  }

  return <TrainingMatchScorer title="501 vs CPU" startScore={501} mode="cpu" cpuLevel={cpuLevel} legsToWin={legsToWin} onComplete={onComplete} />;
}
