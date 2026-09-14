"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type TrainingGame = {
  id: string;
  name: string;
  description: string;
  metric: string;
  href?: string;
};

const games: TrainingGame[] = [
  { id: "jdc-challenge", name: "JDC Challenge", description: "Shanghai, doubler og automatisk score.", metric: "Score og træf %" },
  { id: "catch-40", name: "Catch 40", description: "Checkout-træning fra 61 til 100.", metric: "Checkout %" },
  { id: "checkout-121", name: "121", description: "20 minutter. Luk 121 på højst 9 pile og arbejd dig opad.", metric: "Højeste checkout", href: "/traening/121" },
  { id: "checkout-170", name: "170", description: "10 forsøg på 170 med højst 9 pile pr. forsøg.", metric: "Antal lukkede", href: "/traening/170" },
  { id: "checkout-170-vs-cpu", name: "170 vs CPU", description: "Først til 5 legs mod CPU fra 170.", metric: "Matchresultat", href: "/traening/170-vs-cpu" },
  { id: "bobs-27", name: "Bob's 27", description: "D1-D20 og Bull med 3 pile på hver double.", metric: "Score og træf %" },
  { id: "doubles-10", name: "Doubles 10", description: "10 tilfældige doubler med 3 pile på hver.", metric: "Doubler ramt", href: "/traening/doubles-10" },
  { id: "game-420", name: "Game 420", description: "D1-D20 og Bull med remaining fra 420.", metric: "Remaining" },
  { id: "scoring", name: "Scoring", description: "100 pile på valgt target med automatisk statistik.", metric: "Score og træf %" },
  { id: "scoring-targets", name: "Scoring Targets", description: "T20, T19 og Bull med 90 eller 100 pile.", metric: "Point og træf %", href: "/traening/scoring-targets" },
  { id: "priestleys-triples", name: "Priestley's Triples", description: "3 pile mod hver triple fra T10 til T20.", metric: "Triples ramt" },
  { id: "around-the-world", name: "Around the World", description: "Ram 1-20 og Bull i rækkefølge.", metric: "Pile brugt" },
  { id: "target-training", name: "Target Training", description: "Sammensæt 1-3 targets og træn præcision.", metric: "Træf %" },
  { id: "practice-501", name: "501 Practice", description: "Spil et 501-leg og gem dit snit og checkout.", metric: "3-pils snit", href: "/traening/501" },
  { id: "practice-501-vs-cpu", name: "501 vs CPU", description: "Spil 501 mod CPU 45, 55 eller 65.", metric: "Matchresultat", href: "/traening/501-vs-cpu" },
];

export default function TrainingQuickLinks() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/traening") return;

    // Hide only the old exercise-card grid. Keep the recommendation and
    // "Min træning" statistics above it visible.
    const legacyGrid = Array.from(document.querySelectorAll("main section")).find((section) => {
      const directExerciseCards = Array.from(section.children).filter(
        (child) => child instanceof HTMLElement && child.matches('article[role="button"]')
      );
      return directExerciseCards.length >= 8;
    }) as HTMLElement | undefined;

    if (!legacyGrid) return;
    const previousDisplay = legacyGrid.style.display;
    legacyGrid.style.display = "none";

    return () => {
      legacyGrid.style.display = previousDisplay;
    };
  }, [pathname]);

  if (pathname !== "/traening") return null;

  function startLegacyGame(exerciseId: string) {
    const hash = `#play=${encodeURIComponent(exerciseId)}`;
    window.history.pushState({ hestengTraining: true }, "", hash);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <section className="mx-auto -mt-1 max-w-6xl px-3 pb-8 sm:px-6 lg:px-8">
      <div className="mb-3 sm:mb-4">
        <h2 className="text-2xl font-black text-white">Alle træningsspil</h2>
        <p className="mt-1 text-sm font-semibold text-gray-500">Tryk på et spil for at åbne det.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        {games.map((game) => {
          const content = (
            <>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-orange-400">Træningsspil</div>
              <h3 className="mt-1 text-xl font-black leading-tight text-white sm:text-2xl">{game.name}</h3>
              <p className="mt-1 min-h-10 text-sm font-semibold text-gray-500">{game.description}</p>
              <div className="mt-4 border-t border-gray-800 pt-3">
                <span className="text-sm font-bold text-gray-400">{game.metric}</span>
              </div>
            </>
          );

          const className = "min-w-0 rounded-2xl border border-gray-800 bg-gray-900 p-4 text-left transition hover:border-orange-500/70 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:p-5";

          return game.href ? (
            <Link key={game.id} href={game.href} className={className}>
              {content}
            </Link>
          ) : (
            <button key={game.id} type="button" onClick={() => startLegacyGame(game.id)} className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
