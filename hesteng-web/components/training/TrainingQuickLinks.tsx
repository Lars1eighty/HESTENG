"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TrainingQuickLinks() {
  const pathname = usePathname();

  if (pathname !== "/traening") return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        <Link
          href="/traening/121"
          className="min-w-0 cursor-pointer rounded-2xl border border-gray-800 bg-gray-900 p-3 transition hover:border-orange-500/70 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:p-5"
        >
          <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Træningsspil</div>
          <h3 className="mt-1 text-2xl font-black leading-tight text-white">121</h3>
          <p className="mt-1 text-sm font-semibold text-gray-500">
            20 minutters checkout-træning. Luk 121 på højst 9 pile og arbejd dig opad.
          </p>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-800 pt-3">
            <span className="text-sm font-bold text-gray-400">Højeste checkout</span>
            <span className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-gray-950">
              Start træning
            </span>
          </div>
        </Link>
      </div>
    </section>
  );
}
