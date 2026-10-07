"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  status?: string;
  option?: ReactNode;
  score: number;
  recent?: number[];
  average?: number;
  controls: ReactNode;
  action?: ReactNode;
};

export default function TrainingPlayBoard({ title, status, option, score, recent = [], average = 0, controls, action }: Props) {
  return (
    <div className="fixed inset-0 z-30 grid h-[100dvh] w-screen grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-1 overflow-hidden overscroll-none bg-gray-950 p-1 text-white">
      <header className="flex min-h-10 items-center justify-between gap-3 rounded-xl bg-gray-900 px-3 py-2">
        <div className="text-xl font-black">{title}</div>
<div />
      </header>

      <section className="flex min-h-0 items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-2">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-4 text-base font-black">
            {option ? <span className="text-gray-200">{option}</span> : null}
            {status ? <span className="text-orange-400">{status}</span> : null}
          </div>
          <div className="text-[clamp(4rem,22vw,7rem)] font-black leading-none tabular-nums">{score}</div>
          <div className="mt-2 text-xs font-bold text-gray-500">TILBAGE</div>
        </div>
        <div className="min-w-24 text-right text-xs text-gray-400">
          <div className="font-bold">SENESTE</div>
          <div className="mt-1 truncate text-sm font-black text-white">{recent.length ? recent.slice(-3).join(" · ") : "—"}</div>
          <div className="mt-2">SNIT <b className="text-white">{average.toFixed(1)}</b></div>
        </div>
      </section>

      <section className="min-h-0">{controls}</section>
      {action ? <section>{action}</section> : null}
    </div>
  );
}
