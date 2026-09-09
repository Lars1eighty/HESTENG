"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getGuestClubNight, type GuestClubNightSnapshot } from "@/lib/publicClubNightClient";

type GuestPool = {
  name?: unknown;
  players?: unknown;
};

type GuestMatch = {
  id?: unknown;
  pool?: unknown;
  round?: unknown;
  player1?: unknown;
  player2?: unknown;
  board?: unknown;
  status?: unknown;
};

type GuestClubNight = {
  name?: unknown;
  date?: unknown;
  pools?: unknown;
  matches?: unknown;
};

function asClubNight(value: unknown): GuestClubNight {
  return value !== null && typeof value === "object" ? (value as GuestClubNight) : {};
}

function getPools(clubNight: GuestClubNight): GuestPool[] {
  return Array.isArray(clubNight.pools)
    ? clubNight.pools.filter((pool): pool is GuestPool => pool !== null && typeof pool === "object")
    : [];
}

function getMatches(clubNight: GuestClubNight): GuestMatch[] {
  return Array.isArray(clubNight.matches)
    ? clubNight.matches.filter((match): match is GuestMatch => match !== null && typeof match === "object")
    : [];
}

function text(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export default function GuestClubNightPage() {
  const params = useParams<{ token: string }>();
  const publicToken = params?.token ?? "";
  const [snapshot, setSnapshot] = useState<GuestClubNightSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!publicToken) return;

    let cancelled = false;

    async function load() {
      try {
        const next = await getGuestClubNight(publicToken);
        if (!cancelled) {
          setSnapshot(next);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Klubaftenen kunne ikke hentes eller er afsluttet.");
      }
    }

    void load();
    const interval = window.setInterval(load, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [publicToken]);

  const clubNight = useMemo(() => asClubNight(snapshot?.clubNight), [snapshot]);
  const pools = useMemo(() => getPools(clubNight), [clubNight]);
  const matches = useMemo(() => getMatches(clubNight), [clubNight]);
  const completedIds = useMemo(
    () =>
      new Set(
        (snapshot?.completedMatches ?? [])
          .filter((match): match is { id?: unknown } => match !== null && typeof match === "object")
          .map((match) => match.id)
          .filter((id): id is string => typeof id === "string"),
      ),
    [snapshot],
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-8">
          <div className="text-3xl font-black text-orange-500">HESTENG</div>
          <div className="mt-1 text-sm font-semibold text-gray-400">Gæsteadgang · aktiv klubaften</div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-900 bg-red-950/40 p-6 text-red-200">{error}</div>
        ) : !snapshot ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-400">Henter klubaften...</div>
        ) : (
          <>
            <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <div className="text-sm font-bold uppercase tracking-wide text-orange-400">Aktiv</div>
              <h1 className="mt-2 text-3xl font-black">{text(clubNight.name, "Klubaften")}</h1>
              <p className="mt-2 text-gray-400">{text(clubNight.date)}</p>
            </div>

            <section className="mb-10">
              <h2 className="mb-4 text-2xl font-bold">Puljer</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pools.map((pool, index) => {
                  const players = Array.isArray(pool.players)
                    ? pool.players.filter((player): player is string => typeof player === "string")
                    : [];
                  return (
                    <div key={`${text(pool.name, "Pulje")}-${index}`} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
                      <h3 className="text-xl font-bold">{text(pool.name, `Pulje ${index + 1}`)}</h3>
                      <div className="mt-3 space-y-2">
                        {players.map((player) => (
                          <div key={player} className="rounded-lg bg-gray-950 px-3 py-2 font-semibold text-gray-200">
                            {player}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Kampe</h2>
                <span className="text-sm font-semibold text-gray-400">{completedIds.size} færdige</span>
              </div>
              <div className="space-y-3">
                {matches.map((match, index) => {
                  const id = text(match.id, `match-${index + 1}`);
                  const finished = completedIds.has(id) || match.status === "finished";
                  return (
                    <div key={id} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-500">
                            {text(match.pool, "Pulje")} · Runde {typeof match.round === "number" ? match.round : "-"} · Bane {typeof match.board === "number" ? match.board : "-"}
                          </div>
                          <div className="mt-1 text-lg font-bold">
                            {text(match.player1)} <span className="text-gray-600">vs</span> {text(match.player2)}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                            finished ? "bg-green-500/10 text-green-300" : "bg-orange-500/10 text-orange-300"
                          }`}
                        >
                          {finished ? "Færdig" : "Klar"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
