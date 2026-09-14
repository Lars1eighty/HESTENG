"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { trainingGameHelp, trainingRouteExerciseIds } from "@/data/trainingGameHelp";

function exerciseIdFromHash(hash: string) {
  const cleaned = hash.replace(/^#/, "");
  const [view, rawExerciseId] = cleaned.split("=");
  if (!rawExerciseId || !["details", "play", "result"].includes(view)) return null;

  const exerciseId = decodeURIComponent(rawExerciseId);
  return trainingGameHelp[exerciseId] ? exerciseId : null;
}

export default function TrainingGameHelp() {
  const pathname = usePathname();
  const [hashExerciseId, setHashExerciseId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function syncLocation() {
      setHashExerciseId(exerciseIdFromHash(window.location.hash));
      setOpen(false);
    }

    syncLocation();

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      window.dispatchEvent(new Event("hesteng-training-location-change"));
    };

    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event("hesteng-training-location-change"));
    };

    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);
    window.addEventListener("hesteng-training-location-change", syncLocation);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
      window.removeEventListener("hesteng-training-location-change", syncLocation);
    };
  }, [pathname]);

  const exerciseId = trainingRouteExerciseIds[pathname] ?? (pathname === "/traening" ? hashExerciseId : null);
  const help = exerciseId ? trainingGameHelp[exerciseId] : null;

  if (!help) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full border border-orange-400/40 bg-gray-900/95 px-4 py-3 text-sm font-black text-orange-300 shadow-2xl shadow-black/40 backdrop-blur transition hover:border-orange-400 hover:text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:bottom-6 sm:right-6"
      >
        Sådan spiller du
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="training-help-title"
          onClick={() => setOpen(false)}
        >
          <section
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-700 bg-gray-950 p-5 text-white shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-orange-400">Sådan spiller du</div>
                <h2 id="training-help-title" className="mt-1 text-3xl font-black">{help.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-gray-700 px-3 py-2 text-sm font-bold text-gray-300 transition hover:border-gray-500 hover:text-white"
                aria-label="Luk forklaring"
              >
                Luk
              </button>
            </div>

            <div className="mt-6 space-y-5 text-sm leading-6 text-gray-300 sm:text-base">
              <HelpBlock title="Formål">
                <p>{help.purpose}</p>
              </HelpBlock>

              <HelpBlock title="Regler">
                <ol className="space-y-2">
                  {help.rules.map((rule, index) => (
                    <li key={rule} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-black text-orange-300">
                        {index + 1}
                      </span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ol>
              </HelpBlock>

              <HelpBlock title="Hvornår slutter det?">
                <p>{help.finish}</p>
              </HelpBlock>

              <HelpBlock title="HESTENG måler">
                <p>{help.measures}</p>
              </HelpBlock>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function HelpBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
      <h3 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-orange-400">{title}</h3>
      {children}
    </div>
  );
}
