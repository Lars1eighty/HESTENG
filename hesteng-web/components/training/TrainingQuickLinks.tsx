"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routeExercises = [
  {
    href: "/traening/121",
    name: "121",
    description: "20 minutters checkout-træning. Luk 121 på højst 9 pile og arbejd dig opad.",
    metric: "Højeste checkout",
  },
  {
    href: "/traening/170",
    name: "170",
    description: "10 forsøg på 170. Du har højst 9 pile pr. forsøg og registrerer antal pile ved en lukning.",
    metric: "Antal lukkede",
  },
  {
    href: "/traening/170-vs-cpu",
    name: "170 vs CPU",
    description: "Spil først til 5 legs mod CPU fra 170. Vælg CPU-niveau og registrer din score efter hver visit.",
    metric: "Matchresultat",
  },
  {
    href: "/traening/doubles-10",
    name: "Doubles 10",
    description: "10 tilfældige doubler fra D1 til D20. Du har 3 pile på hver double.",
    metric: "Doubler ramt",
  },
  {
    href: "/traening/scoring-targets",
    name: "Scoring Targets",
    description: "Træn de vigtige scoring-targets T20, T19 og Bull med 10 runder på hver.",
    metric: "Point og træf %",
  },
];

export default function TrainingQuickLinks() {
  const pathname = usePathname();

  if (pathname !== "/traening") return null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
      <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
        {routeExercises.map((exercise) => (
          <Link
            key={exercise.href}
            href={exercise.href}
            className="min-w-0 cursor-pointer rounded-2xl border border-gray-800 bg-gray-900 p-3 transition hover:border-orange-500/70 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:p-5"
          >
            <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Træningsspil</div>
            <h3 className="mt-1 text-2xl font-black leading-tight text-white">{exercise.name}</h3>
            <p className="mt-1 text-sm font-semibold text-gray-500">{exercise.description}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-800 pt-3">
              <span className="text-sm font-bold text-gray-400">{exercise.metric}</span>
              <span className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-black uppercase tracking-wide text-gray-950">
                Start træning
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
