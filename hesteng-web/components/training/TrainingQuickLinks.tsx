"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TrainingQuickLinks() {
  const pathname = usePathname();

  if (pathname !== "/traening") return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      <Link
        href="/traening/121"
        className="flex min-h-14 items-center gap-3 rounded-2xl border border-orange-400/30 bg-orange-500 px-5 py-3 font-black text-white shadow-2xl shadow-black/40 transition hover:bg-orange-400 active:scale-[0.98]"
      >
        <span className="text-xs uppercase tracking-[0.18em] text-orange-100">Ny træning</span>
        <span className="text-xl">121</span>
      </Link>
    </div>
  );
}
