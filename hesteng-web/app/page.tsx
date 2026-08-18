"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const INTRO_SESSION_KEY = "hesteng.brandIntroSeen";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function PublicHomePage() {
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (window.sessionStorage.getItem(INTRO_SESSION_KEY)) return;

    window.sessionStorage.setItem(INTRO_SESSION_KEY, "true");
    const startTimer = window.setTimeout(() => setShowIntro(true), 0);
    const endTimer = window.setTimeout(() => setShowIntro(false), 2800);
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-gray-950 text-white">
      {showIntro && <BrandIntro onSkip={() => setShowIntro(false)} />}

      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link href="/">
            <div className="text-3xl font-black text-orange-500">HESTENG</div>
            <div className="text-sm font-semibold text-gray-400">Measure. Improve. Compete.</div>
          </Link>
          <Link href="/login" className="rounded-full border border-gray-700 px-4 py-2 text-sm font-bold text-gray-300 transition hover:border-orange-500 hover:text-orange-300">
            Log ind
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-400">Sports performance platform</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.98] sm:text-7xl lg:text-8xl">
              HESTENG
            </h1>
            <p className="mt-5 max-w-2xl text-xl font-semibold text-gray-300 sm:text-2xl">
              Measure. Improve. Compete.
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">
              Træning, konkurrencer, statistik og udvikling samlet ét sted.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-xl bg-orange-500 px-6 py-4 font-black text-gray-950 transition hover:bg-orange-400">
                Log ind
              </Link>
              <Link href="/opret-klub" className="rounded-xl border border-gray-700 px-6 py-4 font-bold text-gray-300 transition hover:border-orange-500 hover:text-orange-300">
                Opret klub
              </Link>
              <Link href="/dashboard" className="rounded-xl px-5 py-4 text-sm font-bold text-gray-500 transition hover:text-orange-300">
                Prøv demo
              </Link>
            </div>
          </div>

          <div className="relative min-h-[340px] rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-2xl shadow-black/30 sm:min-h-[460px]">
            <div className="absolute inset-x-8 top-10 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <div className="absolute bottom-10 left-8 top-10 w-px bg-gradient-to-b from-transparent via-orange-500/30 to-transparent" />
            <div className="absolute bottom-10 right-8 top-10 w-px bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
            <div className="absolute left-10 right-10 top-1/2 h-px bg-gray-700/80" />
            <div className="absolute bottom-14 left-12 right-12 flex items-end justify-between gap-3">
              {[42, 66, 54, 82, 72, 94].map((height, index) => (
                <div key={height} className="flex flex-1 flex-col items-center gap-3">
                  <div
                    className={`w-full rounded-t-xl ${index === 5 ? "bg-orange-500" : "bg-gray-700"}`}
                    style={{ height: `${height * 2}px` }}
                  />
                  <div className="h-2 w-2 rounded-full bg-orange-500/70" />
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-16 h-28 w-28 -translate-x-1/2 rounded-full border border-orange-500/30">
              <div className="absolute inset-5 rounded-full border border-gray-600" />
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow-[0_0_28px_rgba(249,115,22,0.5)]" />
            </div>
            <div className="absolute right-8 top-8 rounded-2xl border border-gray-800 bg-gray-950 px-5 py-4">
              <div className="text-xs font-black uppercase tracking-wide text-gray-500">Performance</div>
              <div className="mt-1 text-3xl font-black text-green-400">+18%</div>
            </div>
            <div className="absolute bottom-8 left-8 rounded-2xl border border-gray-800 bg-gray-950 px-5 py-4">
              <div className="text-xs font-black uppercase tracking-wide text-gray-500">Progress</div>
              <div className="mt-1 text-3xl font-black text-orange-400">87</div>
            </div>
            <div className="absolute left-8 top-8 rounded-2xl border border-gray-800 bg-gray-950 px-5 py-4">
              <div className="text-xs font-black uppercase tracking-wide text-gray-500">Compete</div>
              <div className="mt-1 text-3xl font-black text-white">12</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function BrandIntro({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="hesteng-intro fixed inset-0 z-50 flex items-center justify-center bg-gray-950 text-white">
      <div className="hesteng-intro-target" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="hesteng-intro-lines" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 px-6 text-center">
        <div className="hesteng-intro-wordmark text-6xl font-black tracking-normal text-orange-500 sm:text-8xl">
          HESTENG
        </div>
        <div className="hesteng-intro-slogan mt-4 text-lg font-semibold text-gray-300 sm:text-2xl">
          Measure. Improve. Compete.
        </div>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="absolute right-5 top-5 rounded-full border border-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-400 transition hover:border-orange-500 hover:text-orange-300"
      >
        Skip
      </button>
    </div>
  );
}
